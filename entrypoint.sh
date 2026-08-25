#!/bin/sh
# Entrypoint: asegura la base de prospectos y lanza el comando.
set -e
mkdir -p /app/data /app/output

if [ ! -f /app/data/prospectos.json ]; then
  echo "[entrypoint] Base vacía → inicializando con los 8 seeds..."
  bun run seed
fi

exec "$@"
