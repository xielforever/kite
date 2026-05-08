#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/kite}"
ENV_DIR="${ENV_DIR:-/etc/kite}"
SERVICE_NAME="${SERVICE_NAME:-kite}"
RUN_USER="${RUN_USER:-kite}"
RUN_GROUP="${RUN_GROUP:-kite}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Please run as root: sudo bash scripts/install-systemd.sh"
  exit 1
fi

if ! id "${RUN_USER}" >/dev/null 2>&1; then
  useradd --system --create-home --shell /usr/sbin/nologin "${RUN_USER}"
fi

mkdir -p "${APP_DIR}" "${ENV_DIR}"
rsync -a --delete \
  --exclude ".git" \
  --exclude ".next" \
  --exclude "node_modules" \
  --exclude ".env" \
  "${REPO_DIR}/" "${APP_DIR}/"

chown -R "${RUN_USER}:${RUN_GROUP}" "${APP_DIR}" "${ENV_DIR}"

install -m 0644 "${REPO_DIR}/deploy/systemd/kite.service" "/etc/systemd/system/${SERVICE_NAME}.service"
sed -i \
  -e "s#WorkingDirectory=/opt/kite#WorkingDirectory=${APP_DIR}#g" \
  -e "s#User=kite#User=${RUN_USER}#g" \
  -e "s#Group=kite#Group=${RUN_GROUP}#g" \
  -e "s#KITE_ENV_FILE=/etc/kite/kite.env#KITE_ENV_FILE=${ENV_DIR}/kite.env#g" \
  -e "s#EnvironmentFile=-/etc/kite/kite.env#EnvironmentFile=-${ENV_DIR}/kite.env#g" \
  -e "s#KITE_SYSTEMD_SERVICE=kite#KITE_SYSTEMD_SERVICE=${SERVICE_NAME}#g" \
  -e "s#ReadWritePaths=/opt/kite /etc/kite#ReadWritePaths=${APP_DIR} ${ENV_DIR}#g" \
  "/etc/systemd/system/${SERVICE_NAME}.service"

cd "${APP_DIR}"
sudo -u "${RUN_USER}" npm ci
sudo -u "${RUN_USER}" npm run build

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"
systemctl restart "${SERVICE_NAME}"

echo "Kite is installed."
echo "Open http://<server>:3000/setup to configure the database and initial admin."
echo "Environment file: ${ENV_DIR}/kite.env"
