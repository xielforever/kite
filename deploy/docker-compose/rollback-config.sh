#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
BACKUP="${1:-}"

if [ -z "$BACKUP" ]; then
  echo "Usage: ./rollback-config.sh data/backups/kite.env.<timestamp>.bak" >&2
  exit 1
fi

case "$BACKUP" in
  /*) BACKUP_PATH="$BACKUP" ;;
  *) BACKUP_PATH="$SCRIPT_DIR/$BACKUP" ;;
esac

if [ ! -f "$BACKUP_PATH" ]; then
  echo "Backup not found: $BACKUP_PATH" >&2
  exit 1
fi

cp "$BACKUP_PATH" "$SCRIPT_DIR/data/kite.env"
docker compose restart app
docker compose ps
echo "Config restored from $BACKUP_PATH."
