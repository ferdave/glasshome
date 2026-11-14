#!/usr/bin/env bash
# Builds the static web demo into demo/dist: the app's own pages (app/src/main/assets/web)
# plus demo-bridge.js, which fakes the Android bridge with made-up smart-home data.
#   bash demo/build.sh
# Cloudflare Pages: build command "bash demo/build.sh", build output directory "demo/dist".
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
src="$here/../app/src/main/assets/web"
out="$here/dist"

rm -rf "$out"
mkdir -p "$out"
cp -R "$src"/. "$out"/
cp "$here/demo-bridge.js" "$here/dock-hints.js" "$here/_headers" "$out"/
cp -R "$here/demo-cams" "$out"/

# Load the fake cameras + fake bridge before anything else on every page
for f in "$out"/*.html; do
  sed -i 's#<script src="config.default.js"></script>#<script src="demo-cams/cam.js"></script>\n<script src="demo-bridge.js"></script>\n<script src="dock-hints.js"></script>\n<script src="config.default.js"></script>#' "$f"
  grep -q 'demo-bridge.js' "$f" || { echo "demo-bridge.js not injected into $f" >&2; exit 1; }
done
echo "Demo built in $out"
