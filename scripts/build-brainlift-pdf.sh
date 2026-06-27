#!/usr/bin/env bash
#
# Regenerate BRAINLIFT.pdf from BRAINLIFT.md.
#
#   Markdown --(pandoc)--> styled standalone HTML --(headless Chrome)--> PDF
#
# Requirements: pandoc, and Google Chrome (or Chromium) installed.
# Usage:  npm run brainlift:pdf   (or:  bash scripts/build-brainlift-pdf.sh)
#
set -uo pipefail

# Always run from the repo root (this script lives in scripts/).
cd "$(dirname "$0")/.."

SRC="BRAINLIFT.md"
OUT="BRAINLIFT.pdf"
BUILD=".brainlift-build"
HTML="$BUILD/brainlift.html"
CSS="$BUILD/style.html"
PROFILE="$BUILD/chrome-profile"
LOG="$BUILD/chrome.log"

# Locate a Chrome/Chromium binary.
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
if [ ! -x "$CHROME" ]; then CHROME="/Applications/Chromium.app/Contents/MacOS/Chromium"; fi
if [ ! -x "$CHROME" ]; then CHROME="$(command -v google-chrome || command -v chromium || true)"; fi

command -v pandoc >/dev/null || { echo "error: pandoc not found"; exit 1; }
[ -n "$CHROME" ] && [ -x "$CHROME" ] || { echo "error: Chrome/Chromium not found (set \$CHROME)"; exit 1; }
[ -f "$SRC" ] || { echo "error: $SRC not found"; exit 1; }

mkdir -p "$BUILD"

# 1) Print stylesheet (injected into the HTML <head>).
cat > "$CSS" <<'CSS'
<style>
  @page { size: Letter; margin: 0.95in 0.9in; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: Georgia, "Iowan Old Style", "Times New Roman", serif; font-size: 10.8pt; line-height: 1.5; color: #1a1a1a; margin: 0; }
  h1,h2,h3,h4 { font-family: -apple-system, "Helvetica Neue", "Segoe UI", Arial, sans-serif; line-height: 1.18; color: #14223d; break-after: avoid; page-break-after: avoid; }
  h1 { font-size: 25pt; margin: 0 0 2pt; letter-spacing: -0.015em; }
  h2 { font-size: 16pt; margin: 24pt 0 9pt; padding-bottom: 4pt; border-bottom: 2px solid #d8dee9; color: #1f3a93; }
  h3 { font-size: 12.5pt; margin: 15pt 0 4pt; color: #14223d; }
  h4 { font-size: 10.8pt; margin: 11pt 0 3pt; color: #243b53; }
  p { margin: 0 0 7pt; }
  a { color: #1f3a93; text-decoration: none; word-break: break-word; }
  strong { color: #0d1b33; }
  ul,ol { margin: 0 0 7pt; padding-left: 1.25em; }
  li { margin: 0 0 3pt; }
  code { font-family: "SF Mono", Menlo, Consolas, "Liberation Mono", monospace; font-size: 9pt; background: #f2f4f8; padding: 1px 4px; border-radius: 3px; color: #243b53; }
  blockquote { margin: 0 0 10pt; padding: 7pt 14pt; border-left: 3px solid #1f3a93; background: #f6f8fc; color: #36506b; font-style: italic; break-inside: avoid; }
  blockquote p { margin: 0 0 4pt; } blockquote p:last-child { margin: 0; }
  hr { border: none; border-top: 1px solid #d8dee9; margin: 16pt 0; }
  h3 + p, h3 + ul, h4 + p, h4 + ul { break-before: avoid; }
</style>
CSS

# 2) Markdown -> standalone, styled HTML.
pandoc "$SRC" -f gfm -t html5 -s -H "$CSS" -o "$HTML"

# 3) HTML -> PDF. Chrome's headless print sometimes doesn't exit on its own, so we
#    run it in the background and stop it once the PDF has been written (watchdog).
rm -f "$OUT"; rm -rf "$PROFILE"
"$CHROME" --headless --disable-gpu --no-sandbox --no-pdf-header-footer \
  --virtual-time-budget=15000 --run-all-compositor-stages-before-draw \
  --user-data-dir="$PROFILE" --print-to-pdf="$OUT" \
  "file://$PWD/$HTML" >"$LOG" 2>&1 &
CHROME_PID=$!
disown "$CHROME_PID" 2>/dev/null || true   # keep bash from printing "Killed: 9"
for _ in $(seq 1 30); do
  if [ -f "$OUT" ] && [ "$(stat -f%z "$OUT" 2>/dev/null || echo 0)" -gt 10000 ]; then sleep 1; break; fi
  sleep 1
done
pkill -9 -f "$PROFILE" 2>/dev/null || true
kill -9 "$CHROME_PID" 2>/dev/null || true

# 4) Tidy up intermediates (leave only the PDF).
rm -rf "$PROFILE" "$HTML" "$CSS" "$LOG"

if [ -f "$OUT" ]; then echo "Wrote $OUT"; file "$OUT"; else echo "error: failed to produce $OUT"; exit 1; fi
