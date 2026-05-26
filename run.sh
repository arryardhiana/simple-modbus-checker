#!/usr/bin/env bash
# One-shot launcher: creates venv if missing, installs deps if requirements
# changed, then starts the app. Safe to re-run any time.

set -e
cd "$(dirname "$0")"

VENV=".venv"
STAMP="$VENV/.deps-stamp"

if ! command -v python3 >/dev/null 2>&1; then
  echo "Error: python3 not found. Install Python 3 first." >&2
  exit 1
fi

if [ ! -d "$VENV" ]; then
  echo "[setup] Creating virtual environment (.venv)..."
  python3 -m venv "$VENV"
fi

# shellcheck source=/dev/null
source "$VENV/bin/activate"

if [ ! -f "$STAMP" ] || [ requirements.txt -nt "$STAMP" ]; then
  echo "[setup] Installing dependencies..."
  pip install --quiet --upgrade pip
  pip install --quiet -r requirements.txt
  touch "$STAMP"
fi

echo "[run] Starting Modbus Reader at http://127.0.0.1:8000"
exec python main.py
