#!/usr/bin/env bash
set -euo pipefail

umask 077

APP_DIR=/opt/app
BACKUP_DIR=/var/backups/app
RETENTION_DAYS=7

cd "$APP_DIR"
mkdir -p "$BACKUP_DIR"

STAMP=$(date +%Y-%m-%d_%H%M%S)
FILE="$BACKUP_DIR/db_$STAMP.dump"

echo "Sauvegarde de la base -> $FILE"

docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$FILE.tmp"
mv "$FILE.tmp" "$FILE"
docker compose exec -T db pg_restore --list < "$FILE" > /dev/null

echo "Fichier valide ($(du -h "$FILE" | cut -f1))"

find "$BACKUP_DIR" -name 'db_*.dump' -mtime +"$RETENTION_DAYS" -delete

echo "Sauvegardes conservées : $(ls "$BACKUP_DIR"/db_*.dump | wc -l)"
