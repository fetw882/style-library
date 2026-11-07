#!/bin/bash
# After a style change stays quiet for 30s, run publish.sh.
# publish.sh does not push unless PUBLISH_PUSH=1, and it does not force-push.
cd "$(dirname "$0")"
sig() {
  find . -mindepth 1 -maxdepth 3 \
    -not -path './_shots*' \
    -not -path './external*' \
    -not -path './.github*' \
    -not -name '*.log' -not -name 'library.json' -not -name 'index.html' \
    -printf '%p %s %T@\n' 2>/dev/null | sort | md5sum
}
last=$(sig)
pend=0
while true; do
  sleep 5
  cur=$(sig)
  if [ "$cur" != "$last" ]; then last="$cur"; pend=$(date +%s); fi
  if [ "$pend" -gt 0 ] && [ $(( $(date +%s) - pend )) -ge 30 ]; then
    echo "[$(date '+%F %T')] publish"
    ./publish.sh || echo "publish failed"
    pend=0
    last=$(sig)
  fi
done
