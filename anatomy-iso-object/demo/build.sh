#!/usr/bin/env bash
# Builds the dial-indicator demo (from wheresryan22/anatomy, MIT, (c) 2026 Ryan) into standalone HTML.
set -e
cd "$(dirname "$0")"
node examples/dial-indicator/build.mjs
node examples/dial-indicator/build.mjs --light
ls -la examples/dial-indicator/*.html
