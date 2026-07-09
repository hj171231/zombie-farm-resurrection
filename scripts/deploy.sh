#!/bin/bash
# Publish Zombie Farm Resurrection to GitHub Pages — with a seatbelt.
#
#   scripts/deploy.sh "commit message"
#
# Refuses to publish unless all tests pass. Stamps the build id into
# index.html (shown in the ? Help menu) and bumps the service-worker
# cache version, then commits, pushes, and waits until the live site
# matches the local file byte-for-byte.
set -euo pipefail
cd "$(dirname "$0")/.."

MSG="${1:-}"
if [ -z "$MSG" ]; then echo "usage: scripts/deploy.sh \"commit message\""; exit 1; fi

echo "==> running tests (deploy refuses to ship a red suite)"
npm test

N=$(( $(git rev-list --count HEAD) + 1 ))
STAMP="build $N · $(date +%Y-%m-%d)"
echo "==> stamping: $STAMP"
sed -i '' "s/^const BUILD = \"[^\"]*\";/const BUILD = \"$STAMP\";/" index.html
grep -q "const BUILD = \"$STAMP\";" index.html || { echo "BUILD stamp failed"; exit 1; }
sed -i '' "s/^const VERSION = 'zfr-v[^']*';/const VERSION = 'zfr-v$N';/" sw.js
grep -q "const VERSION = 'zfr-v$N';" sw.js || { echo "SW version bump failed"; exit 1; }

echo "==> re-running logic tests against the stamped file"
node tests/logic.test.js >/dev/null || { echo "stamped file failed tests"; exit 1; }

git add -A
git -c user.name='Zombie Farm' -c user.email='hj171231@gmail.com' commit -m "$MSG

[$STAMP]"
git push origin main

echo "==> waiting for GitHub Pages to serve the new build..."
LOCAL=$(shasum -a 256 index.html | cut -d' ' -f1)
for i in $(seq 1 30); do
  LIVE=$(curl -s https://hj171231.github.io/zombie-farm-resurrection/index.html | shasum -a 256 | cut -d' ' -f1)
  if [ "$LIVE" = "$LOCAL" ]; then
    echo "==> LIVE ✓  $STAMP  https://hj171231.github.io/zombie-farm-resurrection/"
    exit 0
  fi
  sleep 10
done
echo "==> pushed, but live site hasn't updated yet — check again in a minute."
exit 1
