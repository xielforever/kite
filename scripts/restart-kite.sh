#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-kite}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Please run as root: sudo SERVICE_NAME=${SERVICE_NAME} bash scripts/restart-kite.sh"
  exit 1
fi

systemctl daemon-reload
systemctl restart "${SERVICE_NAME}"
systemctl --no-pager --full status "${SERVICE_NAME}"
