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

exec "$@"
