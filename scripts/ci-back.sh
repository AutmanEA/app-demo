#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../back"   # fonctionne quel que soit le dossier d'où on lance le script

npm ci
npm run build
npm test
DB_NAME=app_test npm run migrate
npm run test:e2e
