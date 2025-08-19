#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "==> Installing server deps"
cd server
npm install --silent
if [ ! -f .env ]; then
  cp .env.example .env
fi
cd ..

echo "==> Installing client deps"
cd client
npm install --silent
cd ..

echo "==> Starting server (http://localhost:4000)"
cd server
nohup npm run dev > ../server.log 2>&1 &
SERVER_PID=$!
cd ..

echo "==> Starting client (Vite)"
cd client
npm run dev

trap "kill $SERVER_PID" EXIT
