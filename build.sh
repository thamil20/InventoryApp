#!/usr/bin/env bash
# Render build script for backend

set -o errexit

cd backend

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Create necessary directories
mkdir -p logs

echo "Build completed successfully!"
