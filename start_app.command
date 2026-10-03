#!/usr/bin/env bash
# ==============================================================================
# SkillGap AI — Single Click App Launcher
# Double-click this file in macOS Finder to build & launch the app automatically!
# ==============================================================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "========================================================================"
echo "🚀 SkillGap AI Platform — 1-Click Launching Docker App..."
echo "========================================================================"

# Function to check if Docker daemon is running
is_docker_running() {
    docker info >/dev/null 2>&1
    return $?
}

# Check if docker binary exists
if command -v docker >/dev/null 2>&1; then
    if ! is_docker_running; then
        echo "⚠️  Docker daemon is not running. Attempting to start Docker Desktop..."
        open -a Docker >/dev/null 2>&1 || true
        
        echo "⏳ Waiting for Docker to start (up to 20s)..."
        counter=0
        while ! is_docker_running && [ $counter -lt 20 ]; do
            sleep 1
            counter=$((counter+1))
            echo -n "."
        done
        echo ""
    fi

    if is_docker_running; then
        echo "✅ Docker is running! Building and starting containers with docker compose..."
        docker compose up --build -d

        echo "⏳ Waiting for frontend to start at http://localhost:3000..."
        for i in {1..15}; do
            if curl -s http://localhost:3000 >/dev/null 2>&1 || curl -s http://localhost:8000 >/dev/null 2>&1; then
                break
            fi
            sleep 1
        done

        echo "========================================================================"
        echo "🎉 App is ready! Opening http://localhost:3000 in your browser..."
        echo "========================================================================"
        open http://localhost:3000 || open http://localhost:8000 || true
        exit 0
    else
        echo "⚠️  Docker Desktop did not start in time. Falling back to native local launcher..."
    fi
else
    echo "⚠️  Docker is not installed. Falling back to native local launcher..."
fi

# Fallback: Native dev launch
echo "⚡ Launching SkillGap AI natively..."
if command -v open >/dev/null 2>&1; then
    (sleep 3 && open http://localhost:3000) &
fi

npm start
