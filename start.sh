#!/usr/bin/env bash
set -e

echo "======================================================="
echo "   RAILSYNC: AI-Assisted Railway Possession Planning   "
echo "   Network Operations Center (NOC) Production Starter  "
echo "======================================================="

# Verify Node & Python
command -v node >/dev/null 2>&1 || { echo "Node.js is required but not installed."; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "Python 3 is required but not installed."; exit 1; }

export PYTHONPATH="$(pwd)"
export PORT="${PORT:-3000}"

# Run backend test suite if requested
if [ "$1" = "--test" ]; then
  echo "[1/3] Running full test suite (pytest)..."
  python3 -m pytest tests/ -v
fi

# Check if production build needed
if [ ! -d "dist" ]; then
  echo "[1/2] Building frontend production bundle..."
  npm run build
fi

echo "[2/2] Starting RailSync unified server on port $PORT..."
node dist/server.cjs || npm run dev
