#!/bin/bash
set -euo pipefail

echo "===================================================="
echo " Starting ShopFast Zero-Downtime Deployment"
echo " Target SHA: ${IMAGE_TAG:-latest}"
echo "===================================================="

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Ensure previous image tag is tracked for rollback
CURRENT_TAG=$(docker inspect --format='{{.Config.Image}}' shopfast-backend 2>/dev/null || echo "")
echo "Current Backend Image: $CURRENT_TAG"
echo "$CURRENT_TAG" > .last_stable_image

NEW_TAG="${IMAGE_TAG:-latest}"
export BACKEND_IMAGE="shopfast-backend:${NEW_TAG}"

echo "Step 1: Pulling or Building new backend image..."
docker compose build backend

echo "Step 2: Starting dependencies..."
docker compose up -d postgres redis

echo "Step 3: Waiting for DB and Redis to be healthy..."
timeout 60 bash -c 'until docker compose exec postgres pg_isready -U ${DB_USER:-shopfast} -d ${DB_NAME:-shopfast_db}; do sleep 2; done'
timeout 60 bash -c 'until docker compose exec redis redis-cli -a ${REDIS_PASSWORD:-redis_secret} ping | grep PONG; do sleep 2; done'

echo "Step 4: Starting new backend container..."
docker compose up -d --no-deps backend

echo "Step 5: Verifying application health check..."
MAX_ATTEMPTS=15
HEALTH_URL="http://localhost:3000/health"

for i in $(seq 1 $MAX_ATTEMPTS); do
  echo "Health check attempt $i of $MAX_ATTEMPTS..."
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || true)
  if [ "$HTTP_STATUS" -eq 200 ]; then
    echo " Healthcheck passed! Backend is responding with HTTP 200."
    break
  fi
  if [ "$i" -eq "$MAX_ATTEMPTS" ]; then
    echo " Healthcheck failed after $MAX_ATTEMPTS attempts. Triggering automatic rollback!"
    bash scripts/rollback.sh
    exit 1
  fi
  sleep 4
done

echo "Step 6: Updating Nginx & Frontend..."
docker compose up -d frontend nginx

echo "===================================================="
echo " ShopFast Deployment Succeeded Successfully!"
echo "===================================================="
