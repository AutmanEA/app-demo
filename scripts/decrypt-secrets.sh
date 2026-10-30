#!/usr/bin/env bash
set -euo pipefail
umask 077

cd /opt/app
mkdir -p secrets

for key in db_admin_password db_app_password; do
  sops decrypt --extract "[\"$key\"]" secrets.prod.enc.yaml > "secrets/$key.tmp"
  mv "secrets/$key.tmp" "secrets/$key"
done

echo "🔓 Secrets déchiffrés"
