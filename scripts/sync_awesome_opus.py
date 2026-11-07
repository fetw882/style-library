#!/usr/bin/env python3
"""Incrementally sync Awesome Opus 5.5 metadata into the style library.

This is the writer for the public site's external-reference catalog.
It never edits personal styles, official styles, library.json, or official.json.

The site shell lives in index.html. publisher/build.py rewrites only the
<script id="snapshot"> block and refuses a shell that lacks the external tab.
publisher/publish.sh keeps external/, .github/, scripts/, and publisher/.
The unmanaged copy on the publish machine still deletes those paths until it
is replaced from publisher/migration-bundle.tgz.

Schedule: once a day around 09:00 Asia/Shanghai, including weekends.
If upstream main HEAD is unchanged, this script writes nothing.

No repository secret is required. GitHub Actions may pass its built-in token
only to raise the public API rate limit.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import sys
import tempfile
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

SOURCE_REPO = "yihui-dev/awesome-opus5-5-videos"
SOURCE_ID = "awesome-opus5-5"
SOURCE_LABEL = "外部参考 · Awesome Opus 5.5"
SOURCE_HTML = "https://github.com/yihui-dev/awesome-opus5-5-videos"
SHANGHAI = ZoneInfo("Asia/Shanghai")
SCHEDULE = "daily 09:00 Asia/Shanghai including weekends"
MAX_BYTES = 20_000_000
SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,80}$")
TOKEN_RE = re.compile(r"^[a-z0-9-]{1,32}$")
SHA_RE = re.compile(r"^[0-9a-f]{40}$")
LOCKED = {"approved", "draft"}
HOST_MAP = {
    "twitter.com": "x.com",
    "mobile.twitter.com": "x.com",
    "mobile.x.com": "x.com",
    "vxtwitter.com": "x.com",
    "fxtwitter.com": "x.com",
}

NOTICE = """NOTICE

The MIT license in the sibling LICENSE file applies to the listing repository
awesome-opus5-5-videos by yihui-dev (Copyright (c) 2026 yihui-dev):
https://github.com/yihui-dev/awesome-opus5-5-videos

That MIT license does not grant rights in third-party videos, previews, or
prompt text. Those stay with their creators. This directory stores metadata
and https links only. It does not copy videos or prompt bodies, and it does
not imply a commercial license.

Upstream credits (README #credits): every video and prompt belongs to its
creator, linked from each entry.
"""


class SyncError(Exception):
    """Upstream or validation failed. Callers must keep the last good files."""


def repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def ext_dir(root: Path) -> Path:
    return root / "external" / "awesome-opus5-5-videos"


def now_shanghai(clock=None) -> datetime:
    current = clock() if clock else datetime.now(SHANGHAI)
    if current.tzinfo is None:
        current = current.replace(tzinfo=SHANGHAI)
    return current.astimezone(SHANGHAI)


def iso_shanghai(moment: datetime) -> str:
    return moment.astimezone(SHANGHAI).isoformat(timespec="seconds")


def schedule_delay_seconds(moment: datetime) -> int:
    local = moment.astimezone(SHANGHAI)
    slot = local.replace(hour=9, minute=0, second=0, microsecond=0)
    if local < slot:
        slot -= timedelta(days=1)
    return max(0, int((local - slot).total_seconds()))


def dumps(obj) -> str:
    return json.dumps(obj, ensure_ascii=False, indent=2) + "\n"


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def atomic_write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(prefix=path.name + ".", dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(text)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(name, path)
    except Exception:
        try:
            os.unlink(name)
        except OSError:
            pass
        raise


def safe_https(url) -> str | None:
    if not isinstance(url, str):
        return None
    raw = url.strip()
    if not raw or len(raw) > 500 or any(ord(ch) < 32 for ch in raw):
        return None
    from urllib.parse import urlsplit
    try:
        parts = urlsplit(raw)
    except ValueError:
        return None
    if parts.scheme.lower() != "https" or parts.username or parts.password:
        return None
    if not parts.hostname:
        return None
    return raw


def normalize_post_url(url) -> str:
    """Canonical https URL for dedupe. Empty string means unusable."""
    if not isinstance(url, str):
        return ""
    raw = url.strip()
    if not raw or len(raw) > 500 or any(ord(ch) < 32 for ch in raw):
        return ""
    from urllib.parse import urlsplit
    try:
        parts = urlsplit(raw)
    except ValueError:
        return ""
    scheme = parts.scheme.lower()
    if scheme not in {"http", "https"} or parts.username or parts.password:
        return ""
    host = (parts.hostname or "").lower()
    if host.startswith("www."):
        host = host[4:]
    host = HOST_MAP.get(host, host)
    if not host or "." not in host:
        return ""
    path = re.sub(r"/+", "/", parts.path or "").rstrip("/")
    if not path:
        return ""
    return f"https://{host}{path}"


def one_line(value, limit: int) -> str:
    if not isinstance(value, str):
        return ""
    text = "".join(ch for ch in value if ch == "\t" or ord(ch) >= 32)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:limit]


def locked(item: dict) -> bool:
    for key in ("review_state", "status"):
        if str(item.get(key) or "").strip().lower() in LOCKED:
            return True
    return False


def prompt_digest(prompt) -> str:
    if not isinstance(prompt, str):
        prompt = ""
    return sha256_text(prompt.strip())


def build_item(raw: dict, commit: str) -> dict:
    slug = raw.get("slug")
    if not isinstance(slug, str) or not SLUG_RE.fullmatch(slug):
        raise ValueError("bad slug")
    post_key = normalize_post_url(raw.get("post_url"))
    if not post_key:
        raise ValueError("bad post_url")
    author = one_line(raw.get("author"), 80)
    if not author:
        raise ValueError("bad author")
    category = raw.get("category")
    if not isinstance(category, str) or not TOKEN_RE.fullmatch(category):
        raise ValueError("bad category")
    tags = []
    incoming = raw.get("tech_tags") or []
    if not isinstance(incoming, list):
        raise ValueError("bad tech_tags")
    for tag in incoming:
        if isinstance(tag, str) and TOKEN_RE.fullmatch(tag) and tag not in tags:
            tags.append(tag)
        if len(tags) >= 12:
            break
    title = one_line(raw.get("title"), 120)
    added = raw.get("added") if isinstance(raw.get("added"), str) else ""
    if added and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", added):
        added = ""
    has_remake = bool(raw.get("has_remake")) and bool(safe_https(raw.get("skillry_url")))
    item = {
        "slug": slug,
        "author": author,
        "author_url": safe_https(raw.get("author_url")),
        "post_url": post_key,
        "post_url_key": post_key,
        "category": category,
        "tech_tags": tags,
        "prompt_partial": bool(raw.get("prompt_partial")),
        "skillry_url": safe_https(raw.get("skillry_url")) if has_remake else None,
        "added": added,
        "has_remake": has_remake,
        "id": f"{SOURCE_ID}:{slug}",
        "source_id": SOURCE_ID,
        "source_label": SOURCE_LABEL,
        "source_repository": SOURCE_HTML,
        "source_commit": commit,
        "source_entry_url": f"{SOURCE_HTML}/blob/{commit}/prompts/{slug}.md",
        "preview_external_url": safe_https(raw.get("poster_url")),
        "media_policy": "link-only",
        "rights": "Creator-owned; redistribution permission not established",
        "review_state": "unreviewed",
        "prompt_sha256": prompt_digest(raw.get("prompt")),
    }
    if title:
        item["title"] = title
    stack, techniques, unknown = classify_tags(tags)
    item["tech_stack"] = stack
    item["tech_stack_status"] = "verified" if stack else "unknown"
    item["visual_techniques"] = techniques
    item["unclassified_tags"] = unknown
    item["format_label"] = "网页动画" if stack else ("公开视频" if has_remake else "格式未单独标明")
    item["summary_status"] = "missing"
    item["summary_missing"] = "上游 videos.json 没有 title，也没有 description 字段" if not title else "上游有 title，还没有对应的中文短译"
    blob = json.dumps(item, ensure_ascii=False).lower()
    if "javascript:" in blob or "<script" in blob:
        raise ValueError("unsafe item")
    return item


STACK_TAGS = {
    "canvas": "Canvas",
    "svg": "SVG",
    "threejs": "Three.js",
    "gsap": "GSAP",
    "css": "CSS",
    "webgl": "WebGL",
}
TECHNIQUE_TAGS = {
    "shader": "着色器",
    "particles": "粒子",
    "pixel": "像素",
    "physics": "物理",
    "ai-image": "AI 图像",
    "audio": "音频",
    "playable": "可交互",
}


def classify_tags(tags: list) -> tuple[list, list, list]:
    stack, techniques, unknown = [], [], []
    for tag in tags or []:
        if tag in STACK_TAGS and STACK_TAGS[tag] not in stack:
            stack.append(STACK_TAGS[tag])
        elif tag in TECHNIQUE_TAGS and TECHNIQUE_TAGS[tag] not in techniques:
            techniques.append(TECHNIQUE_TAGS[tag])
        elif tag not in unknown:
            unknown.append(tag)
    return stack, techniques, unknown


def title_mentions_renderer(title: str) -> bool:
    return bool(re.search(r"webgl|three\.js|gsap|canvas|remotion|blender|manim|webgpu|\bsvg\b|\bhtml\b", title or "", re.I))


def load_title_briefs(directory: Path) -> dict:
    path = directory / "title-briefs.json"
    if not path.exists():
        return {}
    data = read_json(path)
    items = data.get("items") if isinstance(data, dict) else None
    return items if isinstance(items, dict) else {}


def apply_author_brief(item: dict, briefs: dict) -> None:
    """Translate an upstream title when the wording still matches. Never lock it as a human note."""
    title = item.get("title") or ""
    brief = briefs.get(item.get("slug")) if isinstance(briefs, dict) else None
    summary = ""
    if isinstance(brief, dict) and brief.get("title") == title:
        summary = one_line(brief.get("summary_cn"), 180)
    if item.get("summary_checked_at"):
        pass
    elif title and summary:
        item["summary_cn"] = summary
        item["summary_status"] = "author"
        item["summary_evidence"] = "据原作者描述：上游 videos.json title"
        item.pop("summary_missing", None)
        item.pop("summary_checked_at", None)
    elif title:
        item.pop("summary_cn", None)
        item["summary_status"] = "missing"
        item["summary_missing"] = "上游有 title，还没有对应的中文短译"
    else:
        item.pop("summary_cn", None)
        item["summary_status"] = "missing"
        item["summary_missing"] = "上游 videos.json 没有 title，也没有 description 字段"
    if item.get("tech_stack_checked_at"):
        return
    stack = item.get("tech_stack") or []
    tags = item.get("tech_tags") or []
    if stack:
        item["tech_stack_status"] = "verified"
        item["tech_stack_evidence"] = "上游 videos.json tech_tags"
    elif tags:
        item["tech_stack_status"] = "unknown"
        item["tech_stack_evidence"] = "上游 tech_tags 没有可映射的渲染框架"
    else:
        item["tech_stack_status"] = "unknown"
        note = "上游 videos.json 没有 tech_tags"
        if title_mentions_renderer(title):
            note += "。标题里的技术名称不当作渲染器证据"
        item["tech_stack_evidence"] = note


def keep_verified(item: dict, previous: dict | None) -> None:
    """Daily sync may refresh upstream tags, but not a human-checked summary or stack."""
    if not previous:
        return
    if previous.get("summary_checked_at"):
        for key in ("summary_cn", "summary_evidence", "summary_checked_at", "summary_status"):
            if previous.get(key) not in (None, ""):
                item[key] = previous[key]
    if previous.get("tech_stack_checked_at"):
        for key in (
            "tech_stack",
            "tech_stack_status",
            "tech_stack_evidence",
            "tech_stack_checked_at",
            "visual_techniques",
            "format_label",
        ):
            if key in previous:
                item[key] = previous[key]


def comparable(item: dict) -> tuple:
    return (
        item.get("title") or "",
        item.get("author"),
        item.get("author_url"),
        item.get("post_url_key") or item.get("post_url"),
        item.get("category"),
        tuple(item.get("tech_tags") or []),
        bool(item.get("prompt_partial")),
        item.get("skillry_url"),
        item.get("added") or "",
        bool(item.get("has_remake")),
        item.get("source_entry_url"),
        item.get("preview_external_url"),
        item.get("prompt_sha256"),
        bool(item.get("tombstone")),
    )


def strip_preview(item: dict) -> dict:
    copied = dict(item)
    copied["preview_external_url"] = None
    copied["media_policy"] = "link-only"
    return copied


def validate_catalog(catalog: dict) -> None:
    if catalog.get("schema_version") != 1 or catalog.get("source_id") != SOURCE_ID:
        raise SyncError("catalog header rejected")
    items = catalog.get("items")
    if not isinstance(items, list) or not items:
        raise SyncError("catalog has no items")
    for item in items:
        if not isinstance(item, dict):
            raise SyncError("catalog item is not an object")
        if "prompt" in item:
            raise SyncError("catalog would store a prompt body")
        for key, value in item.items():
            if isinstance(value, str) and len(value) > 500:
                raise SyncError(f"catalog field too long: {key}")
        blob = json.dumps(item, ensure_ascii=False)
        if "<script" in blob.lower() or "javascript:" in blob.lower():
            raise SyncError("catalog contains an unsafe url or script")


def manifest(items: list[dict]) -> str:
    body = [
        {
            "slug": item.get("slug"),
            "post_url_key": item.get("post_url_key") or item.get("post_url"),
            "prompt_sha256": item.get("prompt_sha256"),
            "tombstone": bool(item.get("tombstone")),
            "review_state": item.get("review_state"),
        }
        for item in items
    ]
    return sha256_text(dumps(body))


def same_prompt_groups(items: list[dict]) -> list[dict]:
    order: dict[str, list[str]] = {}
    for item in items:
        if item.get("tombstone"):
            continue
        digest = item.get("prompt_sha256")
        if not digest:
            continue
        order.setdefault(digest, []).append(item["slug"])
    groups = [
        {"prompt_sha256": digest, "slugs": slugs}
        for digest, slugs in order.items()
        if len(slugs) > 1
    ]
    groups.sort(key=lambda group: group["prompt_sha256"])
    return groups


def load_previous(directory: Path) -> tuple[dict | None, dict | None]:
    catalog_path = directory / "catalog.json"
    state_path = directory / "sync-state.json"
    catalog = state = None
    if catalog_path.exists():
        catalog = read_json(catalog_path)
    if state_path.exists():
        state = read_json(state_path)
    return catalog, state


def merge(previous_items: list[dict], built: list[dict], duplicates: list[dict], failed: int, moment: datetime) -> tuple[list[dict], dict]:
    old_by = {}
    for item in previous_items:
        if isinstance(item, dict) and item.get("source_id") == SOURCE_ID and item.get("slug"):
            old_by[item["slug"]] = item
    seen_keys = {}
    seen_slugs = set()
    active = []
    added = changed = preserved = 0
    for item in built:
        slug = item["slug"]
        key = item["post_url_key"]
        if slug in seen_slugs or key in seen_keys:
            duplicates.append({"slug": slug, "post_url_key": key, "kept_slug": seen_keys.get(key) or slug})
            continue
        previous = old_by.get(slug)
        if previous and locked(previous):
            kept = dict(previous)
            active.append(kept)
            seen_slugs.add(slug)
            kept_key = kept.get("post_url_key") or normalize_post_url(kept.get("post_url"))
            if kept_key:
                seen_keys[kept_key] = slug
            preserved += 1
            continue
        seen_keys[key] = slug
        seen_slugs.add(slug)
        if previous is None or previous.get("tombstone"):
            added += 1
        elif comparable(previous) != comparable(item):
            changed += 1
        if previous and previous.get("review_state") not in (None, "", "unreviewed"):
            item["review_state"] = previous["review_state"]
        keep_verified(item, previous)
        active.append(item)
    incoming_slugs = {item["slug"] for item in active}
    removed = 0
    tombstones = []
    for slug, previous in old_by.items():
        if slug in incoming_slugs:
            continue
        if locked(previous):
            kept = dict(previous)
            active.append(kept)
            preserved += 1
            continue
        marker = dict(previous)
        if not marker.get("tombstone"):
            removed += 1
        marker["tombstone"] = True
        marker["removed_upstream"] = True
        marker["removed_at"] = marker.get("removed_at") or iso_shanghai(moment)
        marker["has_remake"] = False
        marker["skillry_url"] = None
        marker["preview_external_url"] = None
        tombstones.append(marker)
    tombstones.sort(key=lambda item: item.get("slug") or "")
    items = active + tombstones
    counts = {
        "added": added,
        "changed": changed,
        "removed": removed,
        "duplicates": len(duplicates),
        "failed": failed,
        "preserved_locked": preserved,
        "tombstones": len(tombstones),
        "active": len(active),
        "remakes": sum(1 for item in active if item.get("has_remake")),
        "media_copied": 0,
        "media_link_only": len(active),
    }
    return items, counts


def catalog_ok(catalog: dict, commit: str) -> bool:
    try:
        validate_catalog(catalog)
    except SyncError:
        return False
    return catalog.get("source_commit") == commit


class GitHubClient:
    def __init__(self, token: str | None = None):
        self.token = token or os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN") or ""

    def _read(self, url: str, accept: str) -> bytes:
        request = urllib.request.Request(url, headers={"User-Agent": "style-library-sync", "Accept": accept})
        if self.token:
            request.add_header("Authorization", f"Bearer {self.token}")
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                data = response.read(MAX_BYTES + 1)
        except urllib.error.URLError as exc:
            raise SyncError(f"upstream fetch failed: {exc.reason if hasattr(exc, 'reason') else exc}") from exc
        if len(data) > MAX_BYTES:
            raise SyncError("upstream file is larger than the sync cap")
        return data

    def get_commit(self) -> dict:
        data = self._read(
            f"https://api.github.com/repos/{SOURCE_REPO}/commits/main",
            "application/vnd.github+json",
        )
        try:
            payload = json.loads(data.decode("utf-8"))
        except (UnicodeError, json.JSONDecodeError) as exc:
            raise SyncError("upstream commit response is not json") from exc
        sha = payload.get("sha") or ""
        if not SHA_RE.fullmatch(sha):
            raise SyncError("upstream commit sha is not a git sha")
        committed = (((payload.get("commit") or {}).get("committer") or {}).get("date")) or ""
        return {"sha": sha, "committed_at": committed}

    def get_file(self, sha: str, path: str) -> bytes:
        if not SHA_RE.fullmatch(sha) or not re.fullmatch(r"[A-Za-z0-9_./-]{1,200}", path):
            raise SyncError("refusing to fetch an unexpected upstream path")
        return self._read(f"https://raw.githubusercontent.com/{SOURCE_REPO}/{sha}/{path}", "application/octet-stream")


def parse_videos(data: bytes) -> list:
    try:
        payload = json.loads(data.decode("utf-8"))
    except (UnicodeError, json.JSONDecodeError) as exc:
        raise SyncError("videos.json is not valid json") from exc
    if not isinstance(payload, list) or not payload:
        raise SyncError("videos.json is empty or not a list")
    return payload


def license_pauses_media(license_text: str, readme: str) -> bool:
    paused = "MIT License" not in license_text or "Copyright (c) 2026 yihui-dev" not in license_text
    credits_at = readme.find("\n## Credits\n")
    credits = readme[credits_at:credits_at + 800] if credits_at >= 0 else ""
    if "belongs to its creator" not in credits:
        paused = True
    return paused


def sync(root: Path, client, check_only: bool = False, clock=None) -> dict:
    directory = ext_dir(root)
    moment = now_shanghai(clock)
    delay = schedule_delay_seconds(moment)
    previous_catalog, previous_state = (None, None)
    if directory.exists():
        try:
            previous_catalog, previous_state = load_previous(directory)
        except (OSError, json.JSONDecodeError) as exc:
            raise SyncError(f"local catalog is unreadable: {exc}") from exc
    head = client.get_commit()
    previous_sha = (previous_state or {}).get("source_commit")
    unchanged = (
        previous_sha == head["sha"]
        and previous_catalog is not None
        and catalog_ok(previous_catalog, head["sha"])
    )
    age = None
    if head.get("committed_at"):
        try:
            committed = datetime.fromisoformat(head["committed_at"].replace("Z", "+00:00"))
            age = int((moment - committed).total_seconds())
        except ValueError:
            age = None
    result = {
        "wrote": False,
        "unchanged": unchanged,
        "drift": not unchanged,
        "source_commit": head["sha"],
        "checked_at": iso_shanghai(moment),
        "schedule": SCHEDULE,
        "schedule_delay_seconds": delay,
        "upstream_age_seconds": age,
    }
    if unchanged or check_only:
        return result
    videos = parse_videos(client.get_file(head["sha"], "data/videos.json"))
    briefs = load_title_briefs(directory)
    license_bytes = client.get_file(head["sha"], "LICENSE")
    readme_bytes = client.get_file(head["sha"], "README.md")
    try:
        license_text = license_bytes.decode("utf-8")
        readme = readme_bytes.decode("utf-8")
    except UnicodeError as exc:
        raise SyncError("upstream license or readme is not utf-8") from exc
    pause_media = license_pauses_media(license_text, readme)
    built = []
    failed = 0
    for raw in videos:
        if not isinstance(raw, dict):
            failed += 1
            continue
        try:
            item = build_item(raw, head["sha"])
            apply_author_brief(item, briefs)
        except ValueError:
            failed += 1
            continue
        if pause_media:
            item = strip_preview(item)
        built.append(item)
    if not built:
        raise SyncError("every upstream entry failed validation; keeping the last catalog")
    duplicates: list[dict] = []
    items, counts = merge(
        (previous_catalog or {}).get("items") or [],
        built,
        duplicates,
        failed,
        moment,
    )
    counts["source_entries"] = len(videos)
    if counts["active"] <= 0:
        raise SyncError("merge produced no active entries; keeping the last catalog")
    groups = same_prompt_groups(items)
    categories: dict[str, int] = {}
    for item in items:
        if item.get("tombstone"):
            continue
        categories[item.get("category") or "other"] = categories.get(item.get("category") or "other", 0) + 1
    catalog = {
        "schema_version": 1,
        "source_id": SOURCE_ID,
        "source_label": SOURCE_LABEL,
        "source_repository": SOURCE_HTML,
        "source_commit": head["sha"],
        "checked_at": iso_shanghai(moment),
        "timezone": "Asia/Shanghai",
        "schedule": SCHEDULE,
        "schedule_delay_seconds": delay,
        "upstream_commit_at": head.get("committed_at"),
        "upstream_age_seconds": age,
        "counts": counts,
        "duplicate_slugs": duplicates,
        "categories": categories,
        "same_prompt_groups": groups,
        "license": {
            "repository": "MIT © 2026 yihui-dev" if not pause_media else "upstream license text changed; media links paused",
            "license_url": f"{SOURCE_HTML}/blob/{head['sha']}/LICENSE",
            "creator_rights_notice": f"{SOURCE_HTML}/blob/{head['sha']}/README.md#credits",
            "media_and_prompts": "Creator-owned, not presumed covered by repository MIT; linked only",
            "media_processing": "paused" if pause_media else "link-only",
        },
        "items": items,
    }
    validate_catalog(catalog)
    state = {
        "source_id": SOURCE_ID,
        "source_repository": SOURCE_HTML,
        "source_commit": head["sha"],
        "source_commit_at": head.get("committed_at"),
        "checked_at": iso_shanghai(moment),
        "timezone": "Asia/Shanghai",
        "schedule": SCHEDULE,
        "schedule_delay_seconds": delay,
        "upstream_age_seconds": age,
        "counts": counts,
        "keys": sorted({item.get("post_url_key") for item in items if not item.get("tombstone") and item.get("post_url_key")}),
        "manifest_sha256": manifest(items),
        "license_sha256": sha256_bytes(license_bytes),
        "media_processing": "paused" if pause_media else "link-only",
    }
    # Replace catalog first, then state and license. A crash before state
    # only causes the next run to rewrite the same catalog.
    atomic_write(directory / "catalog.json", dumps(catalog))
    atomic_write(directory / "sync-state.json", dumps(state))
    atomic_write(directory / "LICENSE", license_text if license_text.endswith("\n") else license_text + "\n")
    atomic_write(directory / "NOTICE", NOTICE if NOTICE.endswith("\n") else NOTICE + "\n")
    result["wrote"] = True
    result["drift"] = False
    result["counts"] = counts
    return result


def emit(result: dict) -> None:
    line = (
        "SYNC "
        f"wrote={int(bool(result.get('wrote')))} "
        f"unchanged={int(bool(result.get('unchanged')))} "
        f"drift={int(bool(result.get('drift')))} "
        f"source_commit={result.get('source_commit','')} "
        f"checked_at={result.get('checked_at','')} "
        f"schedule_delay_seconds={result.get('schedule_delay_seconds','')} "
        f"upstream_age_seconds={result.get('upstream_age_seconds','')}"
    )
    print(line)
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as handle:
            handle.write(line + "\n")
            handle.write(f"Schedule: {SCHEDULE}. No hourly run.\n")
            if result.get("unchanged"):
                handle.write("Upstream main HEAD is unchanged. No commit.\n")


def main(argv: list[str]) -> int:
    check_only = "--check" in argv
    try:
        result = sync(repo_root(), GitHubClient(), check_only=check_only)
    except SyncError as exc:
        print(f"SYNC error=1 kept_previous=1 detail={exc}", file=sys.stderr)
        return 2
    emit(result)
    if check_only and result.get("drift"):
        return 4
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
