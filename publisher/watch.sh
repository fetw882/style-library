#!/bin/bash
# Rebuild library.json when a style folder changes. External catalog, publisher
# scripts, and the sync workflow are not style sources.
cd "$(dirname "$0")"
last=""
while true; do
  cur=$(find . -mindepth 1 -maxdepth 2 \
    -not -path './_*' \
    -not -path './external*' \
    -not -path './publisher*' \
    -not -path './scripts*' \
    -not -path './.github*' \
    -not -name 'library.json' -not -name 'official.json' -not -name 'index.html' -not -name '*.log' \
    -printf '%p %T@\n' 2>/dev/null | sort | md5sum)
  [ "$cur" != "$last" ] && { python3 build.py; last="$cur"; }
  sleep 2
done
