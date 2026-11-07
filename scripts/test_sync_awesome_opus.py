#!/usr/bin/env python3
"""Rules for the Awesome Opus external catalog. No network."""
from __future__ import annotations

import hashlib
import json
import re
import sys
import tempfile
import unittest
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from sync_awesome_opus import (
    SHANGHAI,
    SOURCE_ID,
    SyncError,
    normalize_post_url,
    sync,
)

ROOT = Path(__file__).resolve().parents[1]
COMMIT = "92aee2f586ac0715cb3cbcb6384834f98a33383d"
MIT = "MIT License\n\nCopyright (c) 2026 yihui-dev\nPermission is hereby granted.\n"
README = "# Awesome\n\n## Credits\n\nEvery video and prompt belongs to its creator, linked from each entry.\n"
LIBRARY_SHA = "d9cb6ee2e6b546b81903204fe0c62694168aef0fda2a8f52eeec2e6f5b2c09c0"
OFFICIAL_SHA = "50ee34f6e3c3805e15edf6c64024205397deed1400cf390f66335607181eab47"


def clock():
    return datetime(2026, 11, 8, 9, 5, tzinfo=SHANGHAI)


def video(slug, url, **kw):
    item = {
        "slug": slug,
        "author": kw.get("author", "Ada"),
        "author_url": "https://x.com/Ada",
        "post_url": url,
        "category": kw.get("category", "motion"),
        "tech_tags": kw.get("tags", ["canvas"]),
        "prompt": kw.get("prompt", "draw a circle, do not store this sentence"),
        "prompt_partial": False,
        "poster_url": "https://media.skillry.dev/poster.webp",
        "skillry_url": kw.get("skillry", "https://skillry.dev/ai-videos/opus-5-5/" + slug),
        "added": "2026-09-26",
        "has_remake": kw.get("remake", True),
    }
    if "title" in kw:
        item["title"] = kw["title"]
    return item


class FakeClient:
    def __init__(self, videos, sha=COMMIT, fail=None, license_text=MIT, readme=README):
        self.videos = videos
        self.sha = sha
        self.fail = fail
        self.license_text = license_text
        self.readme = readme
        self.file_reads = 0

    def get_commit(self):
        if self.fail == "commit":
            raise SyncError("commit unreachable")
        return {"sha": self.sha, "committed_at": "2026-10-13T14:46:40Z"}

    def get_file(self, sha, path):
        self.file_reads += 1
        if self.fail == "file":
            raise SyncError("file unreachable")
        if path == "data/videos.json":
            return json.dumps(self.videos).encode()
        if path == "LICENSE":
            return self.license_text.encode()
        if path == "README.md":
            return self.readme.encode()
        raise SyncError("unexpected path")


class SyncTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.library = self.root / "library.json"
        self.official = self.root / "official.json"
        self.style = self.root / "film-direct-engrave" / "style.json"
        self.library.write_text('{"count":5,"styles":[{"slug":"film-direct-engrave","status":"approved"}]}', encoding="utf-8")
        self.official.write_text('[{"slug":"crayon-book","num":"01"}]', encoding="utf-8")
        self.style.parent.mkdir()
        self.style.write_text('{"status":"approved","slug":"film-direct-engrave"}', encoding="utf-8")
        self.before = {
            path: path.read_bytes()
            for path in (self.library, self.official, self.style)
        }

    def tearDown(self):
        for path, data in self.before.items():
            self.assertEqual(path.read_bytes(), data)
        self.tmp.cleanup()

    def catalog(self):
        return json.loads((self.root / "external" / "awesome-opus5-5-videos" / "catalog.json").read_text(encoding="utf-8"))

    def test_normalize_and_dedupe(self):
        self.assertEqual(
            normalize_post_url("http://twitter.com/Ror_Fly/status/99/?s=1"),
            "https://x.com/Ror_Fly/status/99",
        )
        self.assertEqual(normalize_post_url("javascript:alert(1)"), "")
        client = FakeClient([
            video("aaa-1", "https://x.com/Ada/status/1", prompt="same words"),
            video("bbb-2", "https://twitter.com/Ada/status/1/", prompt="same words"),
            {"slug": "", "post_url": "https://x.com/a/status/2", "prompt": "nope"},
            {"slug": "bad-<script>", "post_url": "javascript:alert(1)", "prompt": "hidden body"},
            video("ccc-3", "https://x.com/Ada/status/3", remake=False, skillry=None, title="Kept Title"),
        ])
        result = sync(self.root, client, clock=clock)
        self.assertTrue(result["wrote"])
        catalog = self.catalog()
        slugs = [item["slug"] for item in catalog["items"] if not item.get("tombstone")]
        self.assertEqual(slugs, ["aaa-1", "ccc-3"])
        self.assertEqual(catalog["counts"]["duplicates"], 1)
        self.assertEqual(catalog["counts"]["failed"], 2)
        self.assertEqual(catalog["counts"]["active"], 2)
        self.assertFalse(catalog["items"][1]["has_remake"])
        raw = json.dumps(catalog, ensure_ascii=False)
        self.assertNotIn("hidden body", raw)
        self.assertNotIn("nope", raw)
        self.assertNotIn("draw a circle", raw)
        for item in catalog["items"]:
            self.assertNotIn("prompt", item)
            self.assertEqual(item["source_id"], SOURCE_ID)
        self.assertEqual(len(catalog["same_prompt_groups"]), 0)
        self.assertTrue((self.root / "external" / "awesome-opus5-5-videos" / "LICENSE").read_text(encoding="utf-8").startswith("MIT License"))
        notice = (self.root / "external" / "awesome-opus5-5-videos" / "NOTICE").read_text(encoding="utf-8")
        self.assertIn("does not grant rights", notice)

    def test_unchanged_head_does_not_write(self):
        client = FakeClient([video("aaa-1", "https://x.com/Ada/status/1")])
        first = sync(self.root, client, clock=clock)
        self.assertTrue(first["wrote"])
        paths = list((self.root / "external" / "awesome-opus5-5-videos").iterdir())
        before = {path.name: path.read_bytes() for path in paths}
        reads = client.file_reads
        second = sync(self.root, client, clock=clock)
        self.assertFalse(second["wrote"])
        self.assertTrue(second["unchanged"])
        self.assertEqual(client.file_reads, reads)
        after = {path.name: path.read_bytes() for path in paths}
        self.assertEqual(before, after)
        third = sync(self.root, client, check_only=True, clock=clock)
        self.assertFalse(third["wrote"])
        self.assertFalse(third["drift"])

    def test_check_mode_never_writes_on_drift(self):
        client = FakeClient([video("aaa-1", "https://x.com/Ada/status/1")])
        sync(self.root, client, clock=clock)
        before = (self.root / "external" / "awesome-opus5-5-videos" / "catalog.json").read_bytes()
        client.sha = "b" * 40
        client.videos = [video("aaa-1", "https://x.com/Ada/status/1", title="Changed")]
        result = sync(self.root, client, check_only=True, clock=clock)
        self.assertTrue(result["drift"])
        self.assertFalse(result["wrote"])
        self.assertEqual((self.root / "external" / "awesome-opus5-5-videos" / "catalog.json").read_bytes(), before)

    def test_tombstone_and_locked_records(self):
        client = FakeClient([
            video("keep-1", "https://x.com/Ada/status/1", title="Old", prompt="alpha"),
            video("draft-2", "https://x.com/Ada/status/2", title="Draft", prompt="beta"),
            video("gone-3", "https://x.com/Ada/status/3", title="Gone", prompt="gamma"),
        ])
        sync(self.root, client, clock=clock)
        catalog = self.catalog()
        by = {item["slug"]: item for item in catalog["items"]}
        by["keep-1"]["review_state"] = "approved"
        by["draft-2"]["status"] = "draft"
        path = self.root / "external" / "awesome-opus5-5-videos" / "catalog.json"
        path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        client.sha = "c" * 40
        client.videos = [
            video("keep-1", "https://x.com/Ada/status/1", title="New title", prompt="alpha"),
            video("fresh-4", "https://x.com/Ada/status/4", title="Fresh", prompt="delta"),
        ]
        result = sync(self.root, client, clock=clock)
        self.assertTrue(result["wrote"])
        again = {item["slug"]: item for item in self.catalog()["items"]}
        self.assertEqual(again["keep-1"]["title"], "Old")
        self.assertEqual(again["keep-1"]["review_state"], "approved")
        self.assertNotIn("tombstone", again["keep-1"])
        self.assertEqual(again["draft-2"]["status"], "draft")
        self.assertNotIn("tombstone", again["draft-2"])
        self.assertTrue(again["gone-3"]["tombstone"])
        self.assertEqual(again["fresh-4"]["title"], "Fresh")
        self.assertNotIn("prompt", again["fresh-4"])
        self.assertEqual(self.catalog()["counts"]["removed"], 1)
        self.assertGreaterEqual(self.catalog()["counts"]["preserved_locked"], 2)

    def test_failure_keeps_last_good_catalog(self):
        client = FakeClient([video("aaa-1", "https://x.com/Ada/status/1", prompt="keep me out")])
        sync(self.root, client, clock=clock)
        before = (self.root / "external" / "awesome-opus5-5-videos" / "catalog.json").read_bytes()
        client.fail = "file"
        client.sha = "d" * 40
        with self.assertRaises(SyncError):
            sync(self.root, client, clock=clock)
        self.assertEqual((self.root / "external" / "awesome-opus5-5-videos" / "catalog.json").read_bytes(), before)
        client.fail = "commit"
        with self.assertRaises(SyncError):
            sync(self.root, client, clock=clock)
        self.assertEqual((self.root / "external" / "awesome-opus5-5-videos" / "catalog.json").read_bytes(), before)

    def test_bad_upstream_and_license_pause(self):
        client = FakeClient([video("aaa-1", "https://x.com/Ada/status/1")])
        sync(self.root, client, clock=clock)
        before = (self.root / "external" / "awesome-opus5-5-videos" / "catalog.json").read_bytes()
        client.sha = "e" * 40
        client.videos = []
        with self.assertRaises(SyncError):
            sync(self.root, client, clock=clock)
        self.assertEqual((self.root / "external" / "awesome-opus5-5-videos" / "catalog.json").read_bytes(), before)
        client.videos = [video("aaa-1", "https://x.com/Ada/status/1")]
        client.license_text = "All rights reserved, no MIT.\n"
        client.sha = "f" * 40
        sync(self.root, client, clock=clock)
        item = self.catalog()["items"][0]
        self.assertIsNone(item["preview_external_url"])
        self.assertEqual(self.catalog()["license"]["media_processing"], "paused")
        self.assertTrue(item["post_url"].startswith("https://"))

    def test_same_prompt_group_is_identity_only(self):
        client = FakeClient([
            video("aaa-1", "https://x.com/Ada/status/1", prompt="shared prompt text"),
            video("bbb-2", "https://x.com/Ada/status/2", prompt="shared prompt text"),
            video("ccc-3", "https://x.com/Ada/status/3", prompt="different"),
        ])
        sync(self.root, client, clock=clock)
        groups = self.catalog()["same_prompt_groups"]
        self.assertEqual(len(groups), 1)
        self.assertEqual(groups[0]["slugs"], ["aaa-1", "bbb-2"])
        self.assertNotIn("shared prompt text", json.dumps(self.catalog()))


class RepoTests(unittest.TestCase):
    def test_personal_and_official_files_untouched(self):
        self.assertEqual(hashlib.sha256((ROOT / "library.json").read_bytes()).hexdigest(), LIBRARY_SHA)
        self.assertEqual(hashlib.sha256((ROOT / "official.json").read_bytes()).hexdigest(), OFFICIAL_SHA)

    def test_schedule_is_daily_shanghai_morning(self):
        text = (ROOT / ".github" / "workflows" / "sync-awesome-opus.yml").read_text(encoding="utf-8")
        crons = re.findall(r'cron:\s*"([^"]+)"', text)
        self.assertEqual(crons, ["0 1 * * *"])
        self.assertNotIn("secrets.", text)
        self.assertIn("external/awesome-opus5-5-videos", text)

    def test_page_shell_and_snapshot(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn("外部参考 · Awesome Opus 5.5", html)
        self.assertIn('data-t="ext"', html)
        self.assertIn("publicClip", html)
        self.assertIn("打开原站观看", html)
        static = html.split("<script>")[0]
        self.assertNotIn("media.skillry", static)
        self.assertNotIn("<iframe", static.lower())
        self.assertNotIn("<video", static.lower())
        self.assertNotIn("fetch('/external", html)
        self.assertNotIn('fetch("/external', html)
        match = re.search(r'<script id="snapshot" type="application/json">(.*?)</script>', html)
        self.assertIsNotNone(match)
        snapshot = json.loads(match.group(1).replace("<\\/", "</"))
        styles = snapshot["library"]["styles"]
        self.assertEqual(len(styles), 5)
        self.assertEqual(
            {item["slug"]: item["status"] for item in styles},
            {
                "anatomy-iso-object": "draft",
                "cartoon-facts": "draft",
                "film-direct-engrave": "approved",
                "light-dot-particles": "draft",
                "paper-checklist-explainer": "approved",
            },
        )
        official = snapshot["official"]
        on_disk = json.loads((ROOT / "official.json").read_text(encoding="utf-8"))
        self.assertEqual(len(official), 66)
        self.assertEqual([item["num"] for item in official], [item["num"] for item in on_disk])

    def test_seeded_catalog_when_present(self):
        path = ROOT / "external" / "awesome-opus5-5-videos" / "catalog.json"
        if not path.exists():
            self.skipTest("catalog is created by the sync script")
        catalog = json.loads(path.read_text(encoding="utf-8"))
        active = [item for item in catalog["items"] if not item.get("tombstone")]
        self.assertEqual(len(active), 703)
        self.assertEqual(sum(1 for item in active if item.get("has_remake")), 418)
        keys = [item["post_url_key"] for item in active]
        self.assertEqual(len(keys), len(set(keys)))
        self.assertEqual(catalog["source_commit"], COMMIT)
        self.assertEqual(len(catalog["same_prompt_groups"]), 11)
        self.assertEqual(catalog["counts"]["failed"], 0)
        self.assertEqual(catalog["counts"]["duplicates"], 0)
        raw = path.read_text(encoding="utf-8")
        self.assertNotIn('"prompt":', raw)
        for item in active:
            self.assertNotIn("prompt", item)
            self.assertTrue(item["post_url"].startswith("https://"))
            self.assertEqual(item["review_state"], "unreviewed")
            self.assertEqual(item["media_policy"], "link-only")


if __name__ == "__main__":
    unittest.main()
