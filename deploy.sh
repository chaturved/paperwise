#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"

PARAMETER_PATH="${PARAMETER_PATH:-/paperwise/prod/}"
REGION="${AWS_REGION:-us-east-1}"
ENV_FILE=backend/.env

git pull

# Rebuild backend/.env from Parameter Store. The old file is kept if the fetch fails or looks wrong.
umask 077
aws ssm get-parameters-by-path --path "$PARAMETER_PATH" --with-decryption --region "$REGION" \
  --query 'Parameters[].[Name,Value]' --output text |
  while IFS=$'\t' read -r name value; do echo "${name##*/}=${value}"; done > "$ENV_FILE.new"

for required in DATABASE_URL JWT_SECRET_KEY SESSION_SECRET_KEY; do
  if ! grep -q "^${required}=" "$ENV_FILE.new"; then
    rm -f "$ENV_FILE.new"
    echo "Parameter $PARAMETER_PATH$required is missing, keeping the current $ENV_FILE" >&2
    exit 1
  fi
done
mv "$ENV_FILE.new" "$ENV_FILE"

docker compose up -d --build
docker compose ps
