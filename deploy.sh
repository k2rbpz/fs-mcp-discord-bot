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
  --env-file "${ENV_FILE_PATH}" \
  "${IMAGE_URL}"

echo "--- Deployment to GCE complete."
