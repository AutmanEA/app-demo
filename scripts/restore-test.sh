#!/usr/bin/env bash
# Usage : ./scripts/restore-test.sh [fichier.dump]   (par défaut : le plus récent)
set -euo pipefail

cd /opt/app
FILE="${1:-$(ls -t /var/backups/app/db_*.dump | head -n 1)}"
NAME="restore-test-$$"

echo "🔁 Test de restauration de $FILE"

# Quoi qu'il arrive, même en cas d'erreur, le conteneur jetable est supprimé
cleanup() { docker rm -f "$NAME" > /dev/null 2>&1 || true; }
trap cleanup EXIT

# Lance une commande Postgres dans le conteneur jetable
pg() { docker exec -i -e PGPASSWORD=test "$NAME" "$@"; }

# 1. Un Postgres neuf, vide, sans port publié, sur aucun réseau de l'appli
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test postgres:18-alpine > /dev/null

# 2. Attendre qu'il soit prêt. On teste en TCP (-h 127.0.0.1) : pendant son
#    initialisation, Postgres démarre un serveur temporaire qui n'écoute pas en TCP.
until pg pg_isready -h 127.0.0.1 -U postgres > /dev/null 2>&1; do sleep 1; done

# 3. Restaurer la sauvegarde dans une base neuve
pg createdb -h 127.0.0.1 -U postgres restored
pg pg_restore -h 127.0.0.1 -U postgres -d restored --no-owner < "$FILE"

# 4. Vérifier que les données sont là
restored=$(pg psql -h 127.0.0.1 -U postgres -d restored -tAc 'SELECT count(*) FROM message')
current=$(docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT count(*) FROM message"')

echo "  Messages dans la sauvegarde : $restored"
echo "  Messages en prod maintenant : $current"
echo "✅ La sauvegarde est restaurable"
