#!/usr/bin/env bash
# Usage : deploy.sh <sha-du-commit>
set -euo pipefail

APP_DIR=/opt/app
HISTORY_FILE="$APP_DIR/.deploy-history"
SMOKE_URL="${SMOKE_URL:-https://demo.test}"

log() { echo "[$(date '+%H:%M:%S')] $*"; }
die() { log "❌ $*"; exit 1; }

# La version courante, lue dans .env ("latest" = inconnue)
current_version() { grep -E '^APP_VERSION=' .env | cut -d= -f2; }

# Écrit la version dans .env : Compose l'utilisera, même lancé à la main plus tard
set_version() { sed -i "s/^APP_VERSION=.*/APP_VERSION=$1/" .env; }

# Remet le code et la config de l'ancienne version (sans toucher aux conteneurs)
restore_files() {
  if [ -n "$OLD" ]; then
    git reset --quiet --hard "$OLD";
    if [ -x scripts/decrypt-secrets.sh ]; then ./scripts/decrypt-secrets.sh; fi
  fi
}

# Retour arrière complet : fichiers, version, conteneurs
rollback() {
  set +e
  log "↩️  Échec : retour arrière vers ${OLD:-?}"
  if [ -z "$OLD" ]; then
    log "🚨 Aucune version précédente connue : intervention manuelle nécessaire"
    exit 1
  fi
  restore_files
  set_version "$OLD"
  docker compose up -d --no-build --wait --wait-timeout 120
  docker compose exec -T proxy nginx -s reload
  if ./scripts/smoke-test.sh "$SMOKE_URL" "$OLD"; then
    log "✅ Ancienne version rétablie"
  else
    log "🚨 L'ancienne version échoue AUSSI aux smoke tests : intervention manuelle nécessaire"
  fi
  echo "$(date -Iseconds) ROLLBACK $NEW -> $OLD" >> "$HISTORY_FILE"
  exit 1
}

main() {
  NEW="${1:-}"

  [[ "$NEW" =~ ^[0-9a-f]{40}$ ]] || die "Version invalide : « $NEW » (sha de commit complet attendu)"
  cd "$APP_DIR"

  exec 9> /tmp/app-deploy.lock
  flock -n 9 || die "Un déploiement est déjà en cours"

  OLD="$(current_version)"
  [ "$OLD" = "latest" ] && OLD=""
  if [ "$NEW" = "$OLD" ]; then log "Version déjà en production, rien à faire"; exit 0; fi
  log "🚀 Déploiement de ${NEW:0:7} (actuelle : ${OLD:0:7}${OLD:-inconnue})"

  # ─────
  log "1/7 Code et configuration"
  git fetch --quiet origin
  git reset --quiet --hard "$NEW"
  ./scripts/decrypt-secrets.sh || { restore_files; die "Déchiffrement des secrets impossible"; }

  log "2/7 Téléchargement des images"
  APP_VERSION="$NEW" docker compose pull --quiet back front \
    || { restore_files; die "Images de ${NEW:0:7} introuvables : la CI les a-t-elle publiées ?"; }

  log "3/7 Vérification de la config Nginx"
  docker compose run --rm --no-deps -T proxy nginx -t \
    || { restore_files; die "Config Nginx invalide"; }

  log "4/7 Sauvegarde de la base"
  ./scripts/backup.sh || { restore_files; die "Sauvegarde impossible : déploiement annulé"; }

  log "5/7 Migrations de la base"
  APP_VERSION="$NEW" docker compose run --rm migrate \
    || { restore_files; die "Migration échouée : la prod tourne toujours sur l'ancienne version"; }

  # ─────
  log "6/7 Démarrage de la nouvelle version"
  set_version "$NEW"
  docker compose up -d --no-build --wait --wait-timeout 120 || rollback
  docker compose exec -T proxy nginx -s reload || rollback

  log "7/7 Smoke tests"
  ./scripts/smoke-test.sh "$SMOKE_URL" "$NEW" || rollback

  echo "$(date -Iseconds) OK $NEW" >> "$HISTORY_FILE"
  docker image prune -f > /dev/null
  log "✅ ${NEW:0:7} est en production"
}

main "$@"
exit
