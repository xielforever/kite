#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
REPO_ROOT="$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$SCRIPT_DIR/data/kite.env"
BACKUP_DIR="$SCRIPT_DIR/data/backups"
HEALTH_URL="${KITE_HEALTH_URL:-http://127.0.0.1:${KITE_PORT:-3000}/login}"
SKIP_GIT_PULL="${KITE_SKIP_GIT_PULL:-false}"
SKIP_MIGRATE="${KITE_SKIP_MIGRATE:-false}"

cd "$SCRIPT_DIR"

mkdir -p data "$BACKUP_DIR"
if [ -f "$ENV_FILE" ]; then
  cp "$ENV_FILE" "$BACKUP_DIR/kite.env.$(date +%Y%m%d%H%M%S).bak"
else
  touch "$ENV_FILE"
fi

if [ "$SKIP_GIT_PULL" != "true" ]; then
  cd "$REPO_ROOT"
  git pull --ff-only
  cd "$SCRIPT_DIR"
fi

docker compose build app

if [ "$SKIP_MIGRATE" != "true" ]; then
  docker compose run --rm --no-deps app npm run prisma:deploy
fi

docker compose up -d app

attempt=1
while [ "$attempt" -le 30 ]; do
  if command -v curl >/dev/null 2>&1; then
    if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
      docker compose ps
      echo "Kite update complete."
      exit 0
    fi
  else
    if docker compose exec -T app node -e "fetch('http://127.0.0.1:3000/login').then(r=>process.exit(r.status < 500 ? 0 : 1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
      docker compose ps
      echo "Kite update complete."
      exit 0
    fi
  fi
  attempt=$((attempt + 1))
  sleep 2
done

echo "Kite did not pass health check. Inspect logs with: docker compose logs -f app" >&2
docker compose ps >&2
exit 1
