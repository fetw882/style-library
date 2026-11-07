#!/usr/bin/env python3
"""The publisher must keep external data and personal status in either order."""
from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from sync_awesome_opus import SHANGHAI, sync  # noqa: E402

PUBLISH = ROOT / "publisher" / "publish.sh"
BUILD = ROOT / "publisher" / "build.py"
GOOD_SHELL = """<!doctype html><html><body>
<button class="tab" data-t="ext">外部参考 · Awesome Opus 5.5</button>
<script id="snapshot" type="application/json">{"library":{"hash":"old","styles":[]},"official":[]}</script>
<script>fetch('external/awesome-opus5-5-videos/catalog.json')</script>
</body></html>
"""
BAD_SHELL = """<!doctype html><html><body>
<button class="tab" data-t="off">官方风格</button>
<script id="snapshot" type="application/json">{"library":{"styles":[]},"official":[]}</script>
<script>fetch('library.json')</script>
</body></html>
"""


def clock():
    return datetime(2026, 11, 8, 9, 2, tzinfo=SHANGHAI)


class FakeUpstream:
    def __init__(self, videos, sha):
        self.videos = videos
        self.sha = sha

    def get_commit(self):
        return {"sha": self.sha, "committed_at": "2026-10-13T14:46:40Z"}

    def get_file(self, sha, path):
        if path == "data/videos.json":
            return json.dumps(self.videos).encode()
        if path == "LICENSE":
            return b"MIT License\n\nCopyright (c) 2026 yihui-dev\n"
        if path == "README.md":
            return b"# List\n\n## Credits\n\nEvery video and prompt belongs to its creator, linked from each entry.\n"
        raise RuntimeError(path)


def video(slug, url):
    return {
        "slug": slug,
        "author": "Ada",
        "author_url": "https://x.com/Ada",
        "post_url": url,
        "category": "motion",
        "tech_tags": ["canvas"],
        "prompt": "do not store this prompt body",
        "prompt_partial": False,
        "poster_url": "https://media.skillry.dev/opus-5-5/" + slug + "/poster.webp",
        "skillry_url": "https://skillry.dev/ai-videos/opus-5-5/" + slug,
        "added": "2026-09-26",
        "has_remake": True,
        "title": slug,
    }


class PublishSafeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.source = self.root / "my-styles"
        self.pages = self.root / "my-styles-pages"
        self.source.mkdir()
        self.pages.mkdir()
        shutil.copy(BUILD, self.source / "build.py")
        shutil.copy(PUBLISH, self.source / "publish.sh")
        os.chmod(self.source / "publish.sh", 0o755)
        self.write_style("kept-approved", "approved", "保持认可")
        (self.source / "kept-approved" / "demo").mkdir()
        (self.source / "kept-approved" / "demo" / "notes.md").write_text("demo note\n", encoding="utf-8")
        (self.source / "kept-approved" / "demo" / "noise.wav").write_bytes(b"not audio")
        self.write_style("fresh-draft", "draft", "新草稿")
        (self.source / "official.json").write_text(
            json.dumps([{"slug": "crayon-book", "num": "01"}, {"slug": "desktop-flythrough", "num": "77"}], ensure_ascii=False),
            encoding="utf-8",
        )
        (self.source / "index.html").write_text(GOOD_SHELL, encoding="utf-8")
        self.pages_external = self.pages / "external" / "awesome-opus5-5-videos"
        self.pages_external.mkdir(parents=True)
        (self.pages_external / "catalog.json").write_text('{"items":[{"slug":"seed"}]}\n', encoding="utf-8")
        (self.pages_external / "LICENSE").write_text("MIT License\n", encoding="utf-8")
        workflow = self.pages / ".github" / "workflows"
        workflow.mkdir(parents=True)
        (workflow / "sync-awesome-opus.yml").write_text('on:\n  schedule:\n    - cron: "0 1 * * *"\n', encoding="utf-8")
        (self.pages / "publisher" / "marker.txt").parent.mkdir()
        (self.pages / "publisher" / "marker.txt").write_text("keep\n", encoding="utf-8")
        (self.pages / "scripts").mkdir()
        (self.pages / "scripts" / "sync_awesome_opus.py").write_text("# sync\n", encoding="utf-8")
        retired = self.pages / "retired-style"
        retired.mkdir()
        (retired / "style.json").write_text('{"slug":"retired-style","status":"draft"}\n', encoding="utf-8")
        (self.pages / "index.html").write_text(GOOD_SHELL, encoding="utf-8")
        (self.pages / "library.json").write_text("{}\n", encoding="utf-8")
        (self.pages / "official.json").write_text("[]\n", encoding="utf-8")
        (self.pages / ".nojekyll").write_text("", encoding="utf-8")
        self.git(self.pages, "init", "-b", "main")
        self.git(self.pages, "add", "-A")
        self.git(self.pages, "-c", "user.name=tester", "-c", "user.email=tester@example.com", "commit", "-qm", "base")
        self.base = self.git(self.pages, "rev-parse", "HEAD").strip()
        self.style_bytes = (self.source / "kept-approved" / "style.json").read_bytes()

    def tearDown(self):
        self.tmp.cleanup()

    def git(self, repo, *args):
        return subprocess.check_output(["git", "-C", str(repo), *args], text=True)

    def write_style(self, slug, status, line):
        folder = self.source / slug
        folder.mkdir(exist_ok=True)
        (folder / "style.json").write_text(json.dumps({
            "slug": slug,
            "en": slug,
            "cn": slug,
            "status": status,
            "line": line,
            "line_cn": line,
        }, ensure_ascii=False), encoding="utf-8")

    def run_publish(self, push="0", apply="1"):
        env = os.environ.copy()
        env.update({
            "STYLE_SRC": str(self.source),
            "PAGES": str(self.pages),
            "PUBLISH_PUSH": push,
            "PUBLISH_APPLY": apply,
            "LEMO_LIB": str(self.root / "missing-lemo"),
        })
        return subprocess.run(
            ["bash", str(self.source / "publish.sh")],
            env=env,
            text=True,
            capture_output=True,
        )

    def catalog_slugs(self):
        data = json.loads((self.pages_external / "catalog.json").read_text(encoding="utf-8"))
        return [item["slug"] for item in data["items"] if not item.get("tombstone")]

    def page_statuses(self):
        library = json.loads((self.pages / "library.json").read_text(encoding="utf-8"))
        return {item["slug"]: item["status"] for item in library["styles"]}

    def official_nums(self):
        return [item["num"] for item in json.loads((self.pages / "official.json").read_text(encoding="utf-8"))]

    def assert_protected_site(self):
        self.assertEqual(self.official_nums(), ["01", "77"])
        self.assertEqual(self.page_statuses()["kept-approved"], "approved")
        self.assertIn('data-t="ext"', (self.pages / "index.html").read_text(encoding="utf-8"))
        self.assertIn("外部参考 · Awesome Opus 5.5", (self.pages / "index.html").read_text(encoding="utf-8"))
        self.assertTrue((self.pages / ".github" / "workflows" / "sync-awesome-opus.yml").exists())
        self.assertIn('cron: "0 1 * * *"', (self.pages / ".github" / "workflows" / "sync-awesome-opus.yml").read_text(encoding="utf-8"))
        self.assertEqual((self.pages / "publisher" / "marker.txt").read_text(encoding="utf-8"), "keep\n")
        self.assertFalse((self.pages / "retired-style").exists())
        self.assertTrue((self.pages / "kept-approved" / "demo" / "notes.md").exists())
        self.assertFalse((self.pages / "kept-approved" / "demo" / "noise.wav").exists())
        self.assertEqual((self.source / "kept-approved" / "style.json").read_bytes(), self.style_bytes)

    def test_old_shell_refuses_before_any_pages_write(self):
        (self.source / "index.html").write_text(BAD_SHELL, encoding="utf-8")
        external = (self.pages_external / "catalog.json").read_bytes()
        index = (self.pages / "index.html").read_bytes()
        result = self.run_publish()
        self.assertNotEqual(result.returncode, 0, result.stderr)
        self.assertIn("external-reference shell", result.stderr)
        self.assertEqual((self.pages_external / "catalog.json").read_bytes(), external)
        self.assertEqual((self.pages / "index.html").read_bytes(), index)
        self.assertEqual(self.git(self.pages, "rev-parse", "HEAD").strip(), self.base)
        self.assertEqual((self.source / "kept-approved" / "style.json").read_bytes(), self.style_bytes)

    def test_dry_run_writes_nothing_on_pages(self):
        result = self.run_publish(apply="0")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("dry-run", result.stdout)
        self.assertEqual(self.git(self.pages, "status", "--porcelain"), "")
        self.assertEqual(self.git(self.pages, "rev-parse", "HEAD").strip(), self.base)

    def test_publish_then_external_sync_then_publish(self):
        first = self.run_publish()
        self.assertEqual(first.returncode, 0, first.stderr + first.stdout)
        self.assertIn("push skipped", first.stdout)
        self.assert_protected_site()
        self.assertEqual(self.page_statuses()["fresh-draft"], "draft")
        self.assertEqual(self.catalog_slugs(), ["seed"])
        sync(self.pages, FakeUpstream([video("aaa-1", "https://x.com/Ada/status/1")], "a" * 40), clock=clock)
        self.assertEqual(self.catalog_slugs(), ["aaa-1"])
        self.assertNotIn("do not store this prompt body", (self.pages_external / "catalog.json").read_text(encoding="utf-8"))
        self.write_style("kept-approved", "approved", "保持认可，改一行")
        self.style_bytes = (self.source / "kept-approved" / "style.json").read_bytes()
        second = self.run_publish()
        self.assertEqual(second.returncode, 0, second.stderr + second.stdout)
        self.assert_protected_site()
        self.assertEqual(self.catalog_slugs(), ["aaa-1"])
        self.assertEqual(self.page_statuses()["fresh-draft"], "draft")
        pushed = self.git(self.pages, "log", "--format=%s")
        self.assertNotIn("force", pushed)

    def test_external_sync_then_publish_keeps_catalog(self):
        sync(self.pages, FakeUpstream([
            video("aaa-1", "https://x.com/Ada/status/1"),
            video("bbb-2", "https://x.com/Ada/status/2"),
        ], "b" * 40), clock=clock)
        before = (self.pages_external / "catalog.json").read_bytes()
        overlay = self.pages / "official-overlays.json"
        personal = self.pages / "library-overlays.json"
        overlay.write_text('{"items":{"caption-news":{"tech_stack_status":"unknown"}}}\n', encoding="utf-8")
        personal.write_text('{"items":{"paper-checklist-explainer":{"tech_stack_status":"unknown"}}}\n', encoding="utf-8")
        self.git(self.pages, "add", "official-overlays.json", "library-overlays.json")
        self.git(self.pages, "commit", "-qm", "card overlays")
        result = self.run_publish()
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertEqual((self.pages_external / "catalog.json").read_bytes(), before)
        self.assertEqual(overlay.read_text(encoding="utf-8"), '{"items":{"caption-news":{"tech_stack_status":"unknown"}}}\n')
        self.assertEqual(personal.read_text(encoding="utf-8"), '{"items":{"paper-checklist-explainer":{"tech_stack_status":"unknown"}}}\n')
        self.assert_protected_site()
        self.assertEqual(self.catalog_slugs(), ["aaa-1", "bbb-2"])
        sync(self.pages, FakeUpstream([
            video("aaa-1", "https://x.com/Ada/status/1"),
            video("ccc-3", "https://x.com/Ada/status/3"),
        ], "c" * 40), clock=clock)
        self.assertIn("ccc-3", self.catalog_slugs())
        self.assertTrue((self.pages / "kept-approved" / "style.json").exists())
        self.assertEqual(self.page_statuses()["kept-approved"], "approved")

    def test_url_password_property_is_not_a_secret(self):
        page = (self.source / "index.html").read_text(encoding="utf-8")
        page = page.replace("</body>", "<script>if(x.password)return</script></body>")
        (self.source / "index.html").write_text(page, encoding="utf-8")
        result = self.run_publish()
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertIn('data-t="ext"', (self.pages / "index.html").read_text(encoding="utf-8"))
        self.assertEqual((self.pages_external / "catalog.json").read_text(encoding="utf-8"), '{"items":[{"slug":"seed"}]}\n')

    def test_assigned_secret_in_publishable_file_stops_before_pages_change(self):
        assignment = "password" + "=" + "example-not-a-credential"
        (self.source / "kept-approved" / "STYLE.md").write_text(assignment + "\n", encoding="utf-8")
        external = (self.pages_external / "catalog.json").read_bytes()
        head = self.git(self.pages, "rev-parse", "HEAD").strip()
        result = self.run_publish()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("SECRET/LEAK CHECK FAILED", result.stderr)
        self.assertIn("STYLE.md", result.stderr)
        self.assertNotIn(assignment, result.stderr)
        self.assertEqual((self.pages_external / "catalog.json").read_bytes(), external)
        self.assertEqual(self.git(self.pages, "rev-parse", "HEAD").strip(), head)
        self.assertEqual(self.git(self.pages, "status", "--porcelain"), "")

    def test_backup_script_and_test_placeholder_are_not_published(self):
        shutil.copy(self.source / "publish.sh", self.source / "publish.sh.bak")
        (self.source / "kept-approved" / "note.txt").write_text("password" + "=" + "example-not-a-credential\n", encoding="utf-8")
        placeholder = "password" + "=" + "nope"
        (self.pages / "publisher" / "test_publish_safe.py").write_text(
            "def sample():\n    return " + repr(placeholder) + "\n",
            encoding="utf-8",
        )
        self.git(self.pages, "add", "-A")
        self.git(self.pages, "-c", "user.name=tester", "-c", "user.email=tester@example.com", "commit", "-qm", "test placeholder")
        self.base = self.git(self.pages, "rev-parse", "HEAD").strip()
        result = self.run_publish()
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assert_protected_site()
        listed = self.git(self.pages, "ls-tree", "-r", "HEAD", "--name-only")
        self.assertNotIn("publish.sh.bak", listed)
        self.assertNotIn("note.txt", listed)
        self.assertFalse((self.pages / "publish.sh.bak").exists())
        self.assertFalse((self.pages / "kept-approved" / "note.txt").exists())

    def test_anonymize_only_payload_with_backup_and_publisher_rule(self):
        shutil.copy(PUBLISH, self.source / "publish.sh.bak")
        (self.source / "kept-approved" / "STYLE.md").write_text("credit rui lee\n", encoding="utf-8")
        (self.source / "kept-approved" / "demo" / "compare-notes.md").write_text("drop me\n", encoding="utf-8")
        publisher_script = self.pages / "publisher" / "publish.sh"
        publisher_script.write_text(PUBLISH.read_text(encoding="utf-8"), encoding="utf-8")
        (self.pages / "publisher" / "test_publish_safe.py").write_text(
            'value = "password" + "=" + "nope"\n',
            encoding="utf-8",
        )
        (self.pages / "publisher" / "keep.wav").write_bytes(b"keep-audio")
        (self.pages / "external" / "notes-compare.txt").write_text("keep compare name\n", encoding="utf-8")
        self.git(self.pages, "add", "-A")
        self.git(self.pages, "-c", "user.name=tester", "-c", "user.email=tester@example.com", "commit", "-qm", "publisher rule and decoys")
        self.base = self.git(self.pages, "rev-parse", "HEAD").strip()
        protected_before = {
            path: path.read_bytes()
            for path in (
                publisher_script,
                self.pages / "publisher" / "keep.wav",
                self.pages / "external" / "notes-compare.txt",
                self.pages / "external" / "awesome-opus5-5-videos" / "catalog.json",
                self.pages / ".github" / "workflows" / "sync-awesome-opus.yml",
                self.pages / "scripts" / "sync_awesome_opus.py",
            )
        }
        bare = self.root / "bare.git"
        subprocess.check_call(["git", "init", "--bare", "-b", "main", str(bare)])
        self.git(self.pages, "remote", "add", "origin", str(bare))
        self.git(self.pages, "push", "-q", "origin", "HEAD:main")
        remote_before = subprocess.check_output(["git", "--git-dir", str(bare), "rev-parse", "main"], text=True).strip()
        dry = self.run_publish(apply="0")
        self.assertEqual(dry.returncode, 0, dry.stderr + dry.stdout)
        self.assertIn("dry-run", dry.stdout)
        self.assertEqual(self.git(self.pages, "rev-parse", "HEAD").strip(), self.base)
        for path, data in protected_before.items():
            self.assertEqual(path.read_bytes(), data)
        applied = self.run_publish()
        self.assertEqual(applied.returncode, 0, applied.stderr + applied.stdout)
        self.assertIn("push skipped", applied.stdout)
        self.assertNotIn("git push", applied.stdout)
        self.assert_protected_site()
        for path, data in protected_before.items():
            self.assertEqual(path.read_bytes(), data, path)
        published = (self.pages / "kept-approved" / "STYLE.md").read_text(encoding="utf-8")
        self.assertNotIn("rui lee", published)
        self.assertIn("owner", published)
        self.assertFalse((self.pages / "kept-approved" / "demo" / "compare-notes.md").exists())
        self.assertFalse((self.pages / "publish.sh.bak").exists())
        self.assertEqual(self.git(self.pages, "status", "--porcelain"), "")
        remote_after = subprocess.check_output(["git", "--git-dir", str(bare), "rev-parse", "main"], text=True).strip()
        self.assertEqual(remote_after, remote_before)
        self.assertEqual(self.page_statuses()["kept-approved"], "approved")
        self.assertEqual(self.official_nums(), ["01", "77"])

    def test_card_info_updates_tracked_overlays_and_second_apply_is_clean(self):
        info = self.source / "card-info"
        info.mkdir()
        official = (ROOT / "official-overlays.json").read_bytes()
        personal = (ROOT / "library-overlays.json").read_bytes()
        briefs = (ROOT / "external" / "awesome-opus5-5-videos" / "title-briefs.json").read_bytes()
        (info / "official-overlays.json").write_bytes(official)
        (info / "library-overlays.json").write_bytes(personal)
        (info / "title-briefs.json").write_bytes(briefs)
        before = (self.pages_external / "catalog.json").read_bytes()
        first = self.run_publish()
        self.assertEqual(first.returncode, 0, first.stderr + first.stdout)
        self.assertNotIn("no change", first.stdout)
        self.assertEqual((self.pages / "official-overlays.json").read_bytes(), official)
        self.assertEqual((self.pages / "library-overlays.json").read_bytes(), personal)
        self.assertFalse((self.pages / "card-info").exists())
        self.assertEqual((self.pages_external / "catalog.json").read_bytes(), before)
        self.assertFalse((self.pages_external / "title-briefs.json").exists())
        self.assert_protected_site()
        head = self.git(self.pages, "rev-parse", "HEAD").strip()
        second = self.run_publish()
        self.assertEqual(second.returncode, 0, second.stderr + second.stdout)
        self.assertIn("no change", second.stdout)
        self.assertNotIn("committed", second.stdout)
        self.assertEqual(self.git(self.pages, "rev-parse", "HEAD").strip(), head)
        self.assertEqual(self.git(self.pages, "status", "--porcelain"), "")
        self.assertEqual(self.git(self.pages, "diff"), "")
        self.assertFalse((self.pages / "card-info").exists())
        self.assertEqual((self.pages / "official-overlays.json").read_bytes(), official)
        self.assertEqual((self.pages / "library-overlays.json").read_bytes(), personal)
        self.assertEqual((self.pages_external / "catalog.json").read_bytes(), before)
        self.assertEqual(self.page_statuses()["kept-approved"], "approved")
        self.assertEqual(self.page_statuses()["fresh-draft"], "draft")
        self.assertEqual(self.official_nums(), ["01", "77"])

    def test_opt_in_push_is_not_force(self):
        script = PUBLISH.read_text(encoding="utf-8")
        self.assertNotIn("git push --force", script)
        self.assertNotIn("git push -f", script)
        self.assertIn("git push origin HEAD:main", script)
        self.assertIn('"${1:-}" = "--force"', script)
        bare = self.root / "bare.git"
        subprocess.check_call(["git", "init", "--bare", "-b", "main", str(bare)])
        self.git(self.pages, "remote", "add", "origin", str(bare))
        result = self.run_publish(push="1")
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertIn("pushed", result.stdout)
        shown = subprocess.check_output(["git", "--git-dir", str(bare), "ls-tree", "-r", "main", "--name-only"], text=True)
        self.assertIn("external/awesome-opus5-5-videos/catalog.json", shown)
        self.assertIn(".github/workflows/sync-awesome-opus.yml", shown)
        self.assertIn("kept-approved/style.json", shown)
        self.assertNotIn("noise.wav", shown)


class BundleTests(unittest.TestCase):
    def test_migration_bundle_matches_publisher_sources(self):
        subprocess.check_call(["bash", str(ROOT / "publisher" / "pack_migration.sh")], cwd=ROOT)
        import tarfile
        bundle = ROOT / "publisher" / "migration-bundle.tgz"
        with tarfile.open(bundle) as archive:
            names = set(archive.getnames())
            self.assertIn("my-styles-publisher/build.py", names)
            self.assertIn("my-styles-publisher/publish.sh", names)
            self.assertIn("my-styles-publisher/index.html", names)
            self.assertIn("my-styles-publisher/card-info/official-overlays.json", names)
            self.assertIn("my-styles-publisher/card-info/library-overlays.json", names)
            self.assertIn("my-styles-publisher/card-info/title-briefs.json", names)
            briefs = json.loads(archive.extractfile("my-styles-publisher/card-info/title-briefs.json").read().decode("utf-8"))
            official = json.loads(archive.extractfile("my-styles-publisher/card-info/official-overlays.json").read().decode("utf-8"))
            personal = json.loads(archive.extractfile("my-styles-publisher/card-info/library-overlays.json").read().decode("utf-8"))
            self.assertEqual(len(briefs["items"]), 285)
            self.assertEqual(len(official["items"]), 66)
            self.assertEqual(len(personal["items"]), 5)
            self.assertEqual(
                archive.extractfile("my-styles-publisher/card-info/official-overlays.json").read(),
                (ROOT / "official-overlays.json").read_bytes(),
            )
            self.assertEqual(
                archive.extractfile("my-styles-publisher/card-info/library-overlays.json").read(),
                (ROOT / "library-overlays.json").read_bytes(),
            )
            self.assertEqual(
                archive.extractfile("my-styles-publisher/card-info/title-briefs.json").read(),
                (ROOT / "external" / "awesome-opus5-5-videos" / "title-briefs.json").read_bytes(),
            )
            self.assertEqual(
                archive.extractfile("my-styles-publisher/build.py").read(),
                (ROOT / "publisher" / "build.py").read_bytes(),
            )
            page = archive.extractfile("my-styles-publisher/index.html").read().decode("utf-8")
            script = archive.extractfile("my-styles-publisher/publish.sh").read().decode("utf-8")
        self.assertIn('data-t="ext"', page)
        self.assertIn("播放预览", page)
        self.assertIn("打开原站观看", page)
        self.assertIn('loading="lazy"', page)
        self.assertIn("payload_files", script)
        self.assertNotIn("git add -A -- card-info", script)
        self.assertNotIn("mkdir -p card-info", script)
        self.assertNotIn('grep -rIl --exclude-dir=.git "rui lee" .', script)
        self.assertIn('cron: "0 1 * * *"', (ROOT / ".github" / "workflows" / "sync-awesome-opus.yml").read_text(encoding="utf-8"))

    def test_apply_on_matching_main_files_does_not_commit(self):
        tmp = Path(tempfile.mkdtemp())
        self.addCleanup(lambda: shutil.rmtree(tmp, ignore_errors=True))
        source = tmp / "my-styles"
        pages = tmp / "pages"
        source.mkdir()
        pages.mkdir()
        shutil.copy(ROOT / "publisher" / "build.py", source / "build.py")
        shutil.copy(ROOT / "publisher" / "publish.sh", source / "publish.sh")
        os.chmod(source / "publish.sh", 0o755)
        for name in ("index.html", "library.json", "official.json"):
            shutil.copy(ROOT / name, source / name)
        info = source / "card-info"
        info.mkdir()
        for src, dest in (
            (ROOT / "official-overlays.json", info / "official-overlays.json"),
            (ROOT / "library-overlays.json", info / "library-overlays.json"),
            (ROOT / "external" / "awesome-opus5-5-videos" / "title-briefs.json", info / "title-briefs.json"),
        ):
            shutil.copy(src, dest)
        for slug in (
            "anatomy-iso-object",
            "cartoon-facts",
            "film-direct-engrave",
            "light-dot-particles",
            "paper-checklist-explainer",
        ):
            shutil.copytree(ROOT / slug, source / slug)
        shutil.copytree(ROOT / "external", pages / "external")
        workflow = pages / ".github" / "workflows"
        workflow.mkdir(parents=True)
        shutil.copy(ROOT / ".github" / "workflows" / "sync-awesome-opus.yml", workflow / "sync-awesome-opus.yml")
        (pages / "publisher").mkdir()
        (pages / "publisher" / "marker.txt").write_text("keep\n", encoding="utf-8")
        (pages / "scripts").mkdir()
        (pages / "scripts" / "sync_awesome_opus.py").write_text("# sync\n", encoding="utf-8")
        (pages / ".nojekyll").write_text("", encoding="utf-8")
        (pages / "index.html").write_text((ROOT / "index.html").read_text(encoding="utf-8"), encoding="utf-8")
        (pages / "library.json").write_text("{}\n", encoding="utf-8")
        (pages / "official.json").write_text("[]\n", encoding="utf-8")
        subprocess.check_call(["git", "-C", str(pages), "init", "-b", "main"], stdout=subprocess.DEVNULL)
        subprocess.check_call(["git", "-C", str(pages), "add", "-A"])
        subprocess.check_call(["git", "-C", str(pages), "-c", "user.name=tester", "-c", "user.email=tester@example.com", "commit", "-qm", "base"])
        env = os.environ.copy()
        env.update({
            "STYLE_SRC": str(source),
            "PAGES": str(pages),
            "PUBLISH_PUSH": "0",
            "PUBLISH_APPLY": "1",
            "LEMO_LIB": str(tmp / "missing-lemo"),
        })
        first = subprocess.run(["bash", str(source / "publish.sh")], env=env, text=True, capture_output=True)
        self.assertEqual(first.returncode, 0, first.stderr + first.stdout)
        self.assertFalse((pages / "card-info").exists())
        head = subprocess.check_output(["git", "-C", str(pages), "rev-parse", "HEAD"], text=True).strip()
        second = subprocess.run(["bash", str(source / "publish.sh")], env=env, text=True, capture_output=True)
        self.assertEqual(second.returncode, 0, second.stderr + second.stdout)
        self.assertIn("no change", second.stdout)
        self.assertNotIn("committed", second.stdout)
        self.assertEqual(subprocess.check_output(["git", "-C", str(pages), "rev-parse", "HEAD"], text=True).strip(), head)
        self.assertEqual(subprocess.check_output(["git", "-C", str(pages), "status", "--porcelain"], text=True), "")
        self.assertEqual(subprocess.check_output(["git", "-C", str(pages), "diff", "HEAD"], text=True), "")
        self.assertFalse((pages / "card-info").exists())
        catalog = json.loads((pages / "external" / "awesome-opus5-5-videos" / "catalog.json").read_text(encoding="utf-8"))
        author = sum(1 for item in catalog["items"] if item.get("summary_status") == "author")
        missing = sum(1 for item in catalog["items"] if item.get("summary_status") == "missing")
        self.assertEqual((author, missing), (285, 418))
        self.assertEqual((pages / "official-overlays.json").read_bytes(), (ROOT / "official-overlays.json").read_bytes())
        self.assertEqual((pages / "library-overlays.json").read_bytes(), (ROOT / "library-overlays.json").read_bytes())
        statuses = {
            item["slug"]: item["status"]
            for item in json.loads((pages / "library.json").read_text(encoding="utf-8"))["styles"]
        }
        self.assertEqual(statuses["film-direct-engrave"], "approved")
        self.assertEqual(statuses["paper-checklist-explainer"], "approved")
        self.assertEqual(statuses["anatomy-iso-object"], "draft")
        self.assertEqual(statuses["cartoon-facts"], "draft")
        self.assertEqual(statuses["light-dot-particles"], "draft")
        nums = [item["num"] for item in json.loads((pages / "official.json").read_text(encoding="utf-8"))]
        self.assertEqual((len(nums), nums[0], nums[-1]), (66, "63", "77"))


if __name__ == "__main__":
    unittest.main()
