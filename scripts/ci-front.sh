#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../front"

npm ci
npm run build
npm test -- --watch=false
