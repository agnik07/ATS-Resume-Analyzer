#!/usr/bin/env bash
# Script to launch the unified SkillGap AI Frontend Application
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR/frontend"

echo "=========================================================="
echo "⚡ Starting SkillGap AI Frontend on http://localhost:3000"
echo "=========================================================="

npm run dev
