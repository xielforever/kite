#!/bin/sh
set -eu

ENV_FILE="${KITE_ENV_FILE:-/app/config/kite.env}"
ENV_DIR="$(dirname "$ENV_FILE")"

mkdir -p "$ENV_DIR"
touch "$ENV_FILE"

if [ -s "$ENV_FILE" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      "" | \#*) continue ;;
      *=*) ;;
      *) continue ;;
    esac

    key="${line%%=*}"
    value="${line#*=}"

    case "$key" in
      "" | [0-9]* | *[!A-Za-z0-9_]*) continue ;;
    esac

    case "$value" in
      \"*) value="${value#\"}"; value="${value%\"}" ;;
    esac

    export "$key=$value"
  done < "$ENV_FILE"
fi

export AUTH_TRUST_HOST="${AUTH_TRUST_HOST:-true}"

# Docker deployments are commonly accessed through a public domain, reverse proxy,
# or a different port mapping than the address used during setup. A fixed AUTH_URL
# makes Auth.js canonicalize redirects to that old address. By default, trust the
# request Host instead; set KITE_DYNAMIC_AUTH_URL=false to opt back into AUTH_URL.
case "${KITE_DYNAMIC_AUTH_URL:-true}" in
  false | FALSE | 0 | no | NO)
    ;;
  *)
    unset AUTH_URL
    unset NEXTAUTH_URL
    ;;
esac

exec "$@"
