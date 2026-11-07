#!/usr/bin/env python3
"""Rebuild library.json and the index.html snapshot from style folders.

The page shell is not regenerated here. index.html must already contain the
external-reference tab; this script only replaces <script id="snapshot">.
It does not write external/, .github/, scripts/, or publisher/, and it does
not change a style's approved/draft status.
"""
import hashlib
import json
import os
import re
import subprocess
import sys

M = os.environ.get("STYLE_SRC") or os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get("LEMO_LIB", "/workspace/lemo-opuscar-latest")
SKIP = {"external", "publisher", "scripts", ".github", "node_modules"}
SHELL_MARKERS = (
    'data-t="ext"',
    "external/awesome-opus5-5-videos/catalog.json",
    "外部参考 · Awesome Opus 5.5",
)


def rd(path):
    try:
        with open(path, encoding="utf-8") as handle:
            return handle.read()
    except OSError:
        return ""


def require_shell(html):
    missing = [marker for marker in SHELL_MARKERS if marker not in html]
    if missing:
        sys.stderr.write(
            "refusing to build: index.html is missing the external-reference shell: "
            + ", ".join(missing)
            + "\n"
        )
        sys.exit(2)


def styles():
    out = []
    for name in sorted(os.listdir(M)):
        if name in SKIP or name.startswith("_") or name.startswith("."):
            continue
        directory = os.path.join(M, name)
        path = os.path.join(directory, "style.json")
        if not os.path.isfile(path):
            continue
        try:
            meta = json.load(open(path, encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            meta = {"slug": name, "en": name, "cn": name, "line_cn": f"style.json 解析失败: {exc}"}
        def rel(filename, folder=directory, slug=name):
            return slug + "/" + filename if os.path.exists(os.path.join(folder, filename)) else None
        poster = rel("test.jpg") or rel("styleframe.jpg")
        md = {filename: rd(os.path.join(directory, filename)) for filename in ("STYLE.md", "CHANGES.md", "DEMO.md")}
        demo_dir = os.path.join(directory, "demo")
        demo = sorted(os.listdir(demo_dir)) if os.path.isdir(demo_dir) else []
        out.append(dict(
            meta,
            slug=meta.get("slug", name),
            dir=name,
            poster=poster,
            video=rel("test.mp4"),
            styleframe=rel("styleframe.jpg"),
            md=md,
            demo_files=demo,
        ))
    return out


def official():
    catalog = os.path.join(LIB, "styleboard", "catalog.json")
    if not os.path.exists(catalog):
        return []
    image_dir = os.path.join(M, "_official")
    os.makedirs(image_dir, exist_ok=True)
    rows = []
    for entry in json.load(open(catalog, encoding="utf-8")):
        slug = entry["slug"]
        destination = os.path.join(image_dir, slug + ".jpg")
        if not os.path.exists(destination):
            for source in (
                os.path.join(LIB, "styleboard", "img", slug + "_0.jpg"),
                os.path.join(LIB, "styles", slug, "poster.jpg"),
            ):
                if os.path.exists(source):
                    subprocess.run(
                        ["ffmpeg", "-v", "error", "-y", "-i", source, "-vf", "scale=480:-2", "-q:v", "5", destination]
                    )
                    break
        rows.append(
            {key: entry.get(key) for key in ("slug", "num", "en", "cn", "cat", "cat_en", "film", "line", "line_cn", "uses", "dur")}
            | {"poster": ("_official/" + slug + ".jpg") if os.path.exists(destination) else None}
        )
    return rows


def main():
    page = os.path.join(M, "index.html")
    html = rd(page)
    require_shell(html)
    lib = styles()
    digest = hashlib.sha1(json.dumps(lib, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:12]
    data = {"hash": digest, "count": len(lib), "styles": lib}
    library_path = os.path.join(M, "library.json")
    official_path = os.path.join(M, "official.json")
    old = json.loads(rd(library_path) or "{}")
    if old.get("hash") == digest and os.path.exists(official_path):
        print("unchanged", digest, len(lib), "styles")
        return
    import time
    data["built"] = time.strftime("%Y-%m-%d %H:%M:%S")
    with open(library_path, "w", encoding="utf-8") as handle:
        json.dump(data, handle, ensure_ascii=False, indent=1)
        handle.write("\n")
    if (not os.path.exists(official_path)) or os.environ.get("REBUILD_OFFICIAL"):
        off = official()
    else:
        off = json.load(open(official_path, encoding="utf-8"))
    with open(official_path, "w", encoding="utf-8") as handle:
        json.dump(off, handle, ensure_ascii=False, indent=1)
        handle.write("\n")
    snapshot = json.dumps({"library": data, "official": off}, ensure_ascii=False).replace("</", "<\\/")
    updated = re.sub(
        r'(<script id="snapshot" type="application/json">).*?(</script>)',
        lambda match: match.group(1) + snapshot + match.group(2),
        html,
        count=1,
        flags=re.S,
    )
    require_shell(updated)
    if updated == html and old.get("hash") == digest:
        print("unchanged", digest, len(lib), "styles")
        return
    with open(page, "w", encoding="utf-8") as handle:
        handle.write(updated)
    print("built", digest, len(lib), "styles,", len(off), "official")


if __name__ == "__main__":
    main()
