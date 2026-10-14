#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo 'Node.js 22 이상을 설치한 뒤 다시 실행해주세요.'
  exit 1
fi
if [ ! -d node_modules ]; then npm ci; fi
printf '%s\n' '브라우저에서 http://localhost:3000 을 열어주세요.'
npm run dev
