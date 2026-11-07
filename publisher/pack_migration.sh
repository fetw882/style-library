#!/bin/bash
# Build the tarball a publish machine can unpack over /workspace/my-styles.
set -euo pipefail
root=$(cd "$(dirname "$0")/.." && pwd)
stage=$(mktemp -d)
dest="$stage/my-styles-publisher"
mkdir -p "$dest"
cp "$root/publisher/build.py" "$root/publisher/publish.sh" \
  "$root/publisher/publish-watch.sh" "$root/publisher/watch.sh" \
  "$root/publisher/start.sh" "$root/publisher/MIGRATION.md" "$dest/"
cp "$root/index.html" "$dest/index.html"
mkdir -p "$dest/card-info"
cp "$root/official-overlays.json" "$root/library-overlays.json" "$dest/card-info/"
cp "$root/external/awesome-opus5-5-videos/title-briefs.json" "$dest/card-info/title-briefs.json"
(
  cd "$dest"
  sha256sum build.py publish.sh publish-watch.sh watch.sh start.sh index.html MIGRATION.md \
    card-info/official-overlays.json card-info/library-overlays.json card-info/title-briefs.json > SHA256SUMS
)
tar -C "$stage" -czf "$root/publisher/migration-bundle.tgz" my-styles-publisher
rm -rf "$stage"
echo "wrote $root/publisher/migration-bundle.tgz"
