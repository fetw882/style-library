#!/bin/bash
# Publish style folders into the pages checkout without deleting the external
# catalog, the sync workflow, or the external-reference page shell.
# Pushing is off unless PUBLISH_PUSH=1. This script never force-pushes.
set -euo pipefail
if [ "${1:-}" = "--force" ] || [ "${PUBLISH_PUSH_FLAGS:-}" != "" ]; then
  echo "force push is not allowed" >&2
  exit 1
fi
M=${STYLE_SRC:-/workspace/my-styles}
D=${PAGES:-/workspace/my-styles-pages}
APPLY=${PUBLISH_APPLY:-1}
PUSH=${PUBLISH_PUSH:-0}

protected() {
  case "$1" in
    .git|.nojekyll|external|.github|scripts|publisher) return 0 ;;
    *) return 1 ;;
  esac
}

cd "$M"
python3 "$M/build.py"
python3 - "$M/index.html" << 'PY'
import sys
html = open(sys.argv[1], encoding="utf-8").read()
need = ('data-t="ext"', "external/awesome-opus5-5-videos/catalog.json", "外部参考 · Awesome Opus 5.5")
missing = [item for item in need if item not in html]
if missing:
    sys.stderr.write("refusing to publish an index.html without the external-reference shell\n")
    sys.exit(2)
PY

if [ "$APPLY" != "1" ]; then
  echo "dry-run: external .github scripts publisher would be kept; no pages write; no push"
  exit 0
fi

[ -d "$D/.git" ] || { echo "pages checkout missing: $D" >&2; exit 1; }
cd "$D"
branch=$(git rev-parse --abbrev-ref HEAD)
[ "$branch" = "main" ] || { echo "pages checkout is '$branch', expected main" >&2; exit 1; }
before=$(git rev-parse HEAD)

# Only files this run will copy are the publish payload. Backups such as
# publish.sh.bak and the publisher's own test sources are not in that set.
# Token prefixes must be followed by a token body so the pattern text in this
# script is not itself a hit. Password assignments still are.
SECRET_RE='x-dl|1729249130|睿新品质|ghp_[A-Za-z0-9]{16,}|gho_[A-Za-z0-9]{16,}|github_pat_[A-Za-z0-9_]{16,}|password[[:space:]]*=[[:space:]]*[^[:space:]]|BEGIN [A-Z ]*PRIVATE KEY'
payload_files() {
  local root="$1" sj d s f
  [ -f "$root/index.html" ] && printf '%s\n' "$root/index.html"
  [ -f "$root/library.json" ] && printf '%s\n' "$root/library.json"
  [ -f "$root/official.json" ] && printf '%s\n' "$root/official.json"
  if [ -d "$root/_official" ]; then
    find "$root/_official" -type f \( -name '*.jpg' -o -name '*.png' \) -print
  fi
  for sj in "$root"/*/style.json; do
    [ -f "$sj" ] || continue
    d=$(dirname "$sj")
    s=$(basename "$d")
    case "$s" in _*|.*) continue ;; esac
    protected "$s" && continue
    for f in style.json STYLE.md CHANGES.md DEMO.md test.jpg styleframe.jpg test.mp4; do
      [ -f "$d/$f" ] && printf '%s\n' "$d/$f"
    done
    if [ -d "$d/demo" ]; then
      find "$d/demo" -maxdepth 1 -type f \( -name '*.mjs' -o -name '*.js' -o -name '*.html' -o -name '*.sh' -o -name '*.srt' -o -name '*.json' -o -name '*.md' \) -size -20M -print
    fi
  done
}
if payload_files "$M" | while IFS= read -r file; do
  [ -n "$file" ] || continue
  grep -IlE "$SECRET_RE" "$file" || true
done | grep -q . ; then
  echo "SECRET/LEAK CHECK FAILED before publish" >&2
  payload_files "$M" | while IFS= read -r file; do
    [ -n "$file" ] || continue
    grep -IlE "$SECRET_RE" "$file" || true
  done >&2
  exit 1
fi

python3 - "$D" << 'PY'
import hashlib, os, sys
root = sys.argv[1]
keep = ("external", ".github", "scripts", "publisher")
for name in keep:
    path = os.path.join(root, name)
    if not os.path.exists(path):
        continue
    digest = hashlib.sha256()
    for dirpath, dirnames, filenames in os.walk(path):
        dirnames[:] = sorted(d for d in dirnames if d != ".git")
        for filename in sorted(filenames):
            full = os.path.join(dirpath, filename)
            rel = os.path.relpath(full, root)
            digest.update(rel.encode())
            with open(full, "rb") as handle:
                digest.update(handle.read())
    open(os.path.join(root, ".publish-keep-" + name.lstrip(".")), "w", encoding="utf-8").write(digest.hexdigest())
PY

rm -f index.html library.json official.json
rm -rf _official
for dir in */; do
  name=${dir%/}
  protected "$name" && continue
  [ -f "$name/style.json" ] && rm -rf "$name"
done

cp "$M/index.html" "$M/library.json" "$M/official.json" .
mkdir -p _official
if compgen -G "$M/_official/*.jpg" >/dev/null || compgen -G "$M/_official/*.png" >/dev/null; then
  cp "$M"/_official/*.jpg "$M"/_official/*.png _official/ 2>/dev/null || true
fi
for sj in "$M"/*/style.json; do
  [ -f "$sj" ] || continue
  d=$(dirname "$sj")
  s=$(basename "$d")
  protected "$s" && continue
  case "$s" in _*) continue ;; esac
  mkdir -p "$s"
  for f in style.json STYLE.md CHANGES.md DEMO.md test.jpg styleframe.jpg; do
    [ -f "$d/$f" ] && cp "$d/$f" "$s/"
  done
  if [ -f "$d/test.mp4" ]; then
    ffmpeg -nostdin -loglevel error -y -i "$d/test.mp4" -an -c:v copy -map_metadata -1 -movflags +faststart "$s/test.mp4"
  fi
  if [ -d "$d/demo" ]; then
    mkdir -p "$s/demo"
    find "$d/demo" -maxdepth 1 -type f \( -name '*.mjs' -o -name '*.js' -o -name '*.html' -o -name '*.sh' -o -name '*.srt' -o -name '*.json' -o -name '*.md' \) -size -20M -exec cp {} "$s/demo/" \;
  fi
done
# Rewrites stay on the copied payload. Protected trees are not edited to satisfy the check.
while IFS= read -r file; do
  [ -n "$file" ] && [ -f "$file" ] || continue
  base=$(basename "$file")
  size=$(stat -c%s "$file")
  if [ "$size" -gt 20971520 ]; then rm -f "$file"; continue; fi
  if printf '%s' "$base" | grep -qi 'compare'; then rm -f "$file"; continue; fi
  case "$base" in
    *.wav|*.mp3|*.aac|*.m4a|*.flac|*.ogg|*.WAV|*.MP3|*.AAC|*.M4A|*.FLAC|*.OGG) rm -f "$file" ;;
  esac
done < <(payload_files "$D")
while IFS= read -r file; do
  [ -n "$file" ] && [ -f "$file" ] || continue
  case "$file" in
    *.jpg|*.png|*.mp4) continue ;;
  esac
  if grep -q "rui lee" "$file"; then
    sed -i "s/rui lee/owner/g" "$file"
  fi
done < <(payload_files "$D")
if payload_files "$D" | while IFS= read -r file; do
  [ -n "$file" ] || continue
  grep -IlE "$SECRET_RE|rui lee" "$file" || true
done | grep -q . ; then
  echo "SECRET/LEAK CHECK FAILED" >&2
  payload_files "$D" | while IFS= read -r file; do
    [ -n "$file" ] || continue
    grep -IlE "$SECRET_RE|rui lee" "$file" || true
  done >&2
  exit 1
fi
for kept in external scripts .github; do
  [ -d "$kept" ] || continue
  if grep -rIlE "$SECRET_RE|rui lee" --exclude-dir=.git "$kept" ; then
    echo "SECRET/LEAK CHECK FAILED" >&2
    exit 1
  fi
done
if [ -d publisher ]; then
  if grep -rIlE 'ghp_[A-Za-z0-9]{16,}|gho_[A-Za-z0-9]{16,}|github_pat_[A-Za-z0-9_]{16,}|BEGIN [A-Z ]*PRIVATE KEY' --exclude-dir=.git publisher ; then
    echo "SECRET/LEAK CHECK FAILED" >&2
    exit 1
  fi
fi
while IFS= read -r file; do
  [ -n "$file" ] && [ -f "$file" ] || continue
  case "$file" in
    *.mp4)
      if ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$file" | grep -q .; then
        echo "AUDIO LEFT IN $file" >&2
        exit 1
      fi
      ;;
  esac
done < <(payload_files "$D")

python3 - "$D" << 'PY'
import hashlib, os, sys
root = sys.argv[1]
keep = ("external", ".github", "scripts", "publisher")
for name in keep:
    stamp = os.path.join(root, ".publish-keep-" + name.lstrip("."))
    path = os.path.join(root, name)
    if not os.path.exists(stamp):
        continue
    expected = open(stamp, encoding="utf-8").read().strip()
    os.remove(stamp)
    digest = hashlib.sha256()
    for dirpath, dirnames, filenames in os.walk(path):
        dirnames[:] = sorted(d for d in dirnames if d != ".git")
        for filename in sorted(filenames):
            full = os.path.join(dirpath, filename)
            rel = os.path.relpath(full, root)
            digest.update(rel.encode())
            with open(full, "rb") as handle:
                digest.update(handle.read())
    if digest.hexdigest() != expected:
        sys.stderr.write("protected path changed during publish: %s\n" % name)
        sys.exit(1)
print("protected paths unchanged")
PY
rm -f .publish-keep-*

if ! grep -q 'data-t="ext"' index.html || ! grep -q 'external/awesome-opus5-5-videos/catalog.json' index.html; then
  echo "published index.html lost the external-reference shell" >&2
  exit 1
fi

git add -A -- index.html library.json official.json _official
for sj in "$M"/*/style.json; do
  [ -f "$sj" ] || continue
  s=$(basename "$(dirname "$sj")")
  protected "$s" && continue
  case "$s" in _*|.*) continue ;; esac
  git add -A -- "$s"
done
git ls-files -d | awk -F/ '{print $1}' | sort -u | while IFS= read -r top; do
  [ -n "$top" ] || continue
  protected "$top" && continue
  case "$top" in
    index.html|library.json|official.json|_official|.*) continue ;;
  esac
  git add -A -- "$top"
done
if git diff --cached --quiet; then
  echo "no change"
  exit 0
fi
git -c user.name=style-bot -c user.email=style-bot@users.noreply.github.com commit -qm "sync $(date '+%F %T')"
echo "committed $(git rev-parse --short HEAD) previous $before"
if [ "$PUSH" = "1" ]; then
  git push origin HEAD:main
  echo "pushed $(date '+%F %T')"
else
  echo "push skipped (set PUBLISH_PUSH=1 to push origin main; force push is not available)"
fi
