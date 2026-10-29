#!/usr/bin/env bash
# Usage: ./scripts/smoke-test.sh <url>
set -euo pipefail

BASE_URL="${1:-http://localhost}"
EXPECTED_VERSION="${2:-}"
echo "🔍 Smoke tests sur $BASE_URL"

fail() { echo "failure: $1"; exit 1; }
success() { echo "success: $1"; }

health=$(curl -fsS --max-time 5 "$BASE_URL/health") || fail "/health ne répond pas"
if [ -n "$EXPECTED_VERSION" ]; then
  echo "$health" | grep -q "\"version\":\"$EXPECTED_VERSION\"" \
    || fail "Version attendue : $EXPECTED_VERSION — reçue : $health"
  success "Version déployée : ${EXPECTED_VERSION:0:7}"
else
  success "/health"
fi

curl -fsS --max-time 5 "$BASE_URL/" | grep -q '<app-root' || fail "La page d'acceuil ne sert pas l'appli Angular"
success "Page d'acceuil"

curl -fsS --max-time 5 "$BASE_URL/some/random/page" | grep -q '<app-root' || fail "Les routes Angular renvoient une erreur"
success "Routes Angular"

curl -fsS --max-time 5 -X POST "$BASE_URL/graphql" -H 'Content-Type: application/json' -d '{"query":"{messages { id } }"}' | grep -q '"messages"' || fail "L'API GraphQL ne répond pas"
success "API GraphQL"

if curl -fsS --max-time 5 -X POST "$BASE_URL/graphql" -H 'Content-Type: application/json' -d '{"query":"{ __schema { types { name } } }"}' | grep -q '"__schema"'; then fail "L'introspection GraphQL est activée"
fi
success "Introspection désactivée"

if [[ "$BASE_URL" == https://* ]]; then
  HTTP_URL="${BASE_URL/https:/http:}"
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$HTTP_URL/")
  [ "$code" = "301" ] || fail "HTTP ne redirige pas vers HTTPS (code $code)"
  success "Redirection HTTP → HTTPS"

  headers=$(curl -fsSI --max-time 5 "$BASE_URL/")
  for h in strict-transport-security x-content-type-options x-frame-options; do
    echo "$headers" | grep -qi "^$h:" || fail "En-tête de sécurité manquant : $h"
  done
  success "En-têtes de sécurité"
fi

echo "Tous les tests sont OK"
