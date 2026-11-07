#!/bin/bash
# Local preview plus the debounced publisher. Nothing is pushed until
# PUBLISH_PUSH=1. Do not start this on a machine still running the old
# publish.sh; that older script deletes external/ and pushes main.
cd "$(dirname "$0")"
P=${PORT:-8765}
pgrep -f "my-styles/watch.sh" >/dev/null || nohup bash "$PWD/watch.sh" > watch.log 2>&1 &
pgrep -f "http.server $P" >/dev/null || nohup python3 -m http.server "$P" --bind 127.0.0.1 --directory "$PWD" > http.log 2>&1 &
pgrep -f "my-styles/publish-watch.sh" >/dev/null || nohup bash "$PWD/publish-watch.sh" > publish.log 2>&1 &
sleep 1
echo "page: http://127.0.0.1:$P/   push: off unless PUBLISH_PUSH=1"
