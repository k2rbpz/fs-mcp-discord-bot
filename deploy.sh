#!/bin/bash
# Exit immediately if a command exits with a non-zero status.
set -e

# These will be passed as arguments from the cloudbuild.yaml step
IMAGE_URL=$1
ENV_FILE_PATH=$2

echo "--- Pulling new image: ${IMAGE_URL}"
docker pull "${IMAGE_URL}"

echo "--- Stopping and removing old container..."
docker stop discord-bot || true
docker rm discord-bot || true

echo "--- Starting new container using environment file at ${ENV_FILE_PATH}..."
docker run -d --restart=always --name discord-bot \
  --log-driver="json-file" \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  -p 4000:4000 \
  --env-file "${ENV_FILE_PATH}" \
  "${IMAGE_URL}"

echo "--- Cleaning up old Docker images..."
docker image prune -af

echo "--- Deployment to GCE complete."
