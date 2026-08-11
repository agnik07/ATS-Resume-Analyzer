#!/usr/bin/env bash
# Script to launch the unified SkillGap AI FastAPI Backend Server
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=========================================================="
echo "🚀 Starting SkillGap AI Unified Backend on http://localhost:8000"
echo "=========================================================="

if [ -d "$DIR/.venv" ]; then
    source "$DIR/.venv/bin/activate"
    PYTHON_EXEC="$DIR/.venv/bin/python"
else
    PYTHON_EXEC="python3"
fi

export PYTHONPATH="$DIR/backend"
"$PYTHON_EXEC" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir "$DIR/backend/app"
