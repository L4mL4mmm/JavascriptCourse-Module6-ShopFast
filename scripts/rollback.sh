#!/bin/bash
set -euo pipefail

echo "===================================================="
echo " Initiating Emergency Rollback for ShopFast"
echo "===================================================="

if [ -f .last_stable_image ]; then
  LAST_IMAGE=$(cat .last_stable_image)
else
  LAST_IMAGE=""
fi

if [ -z "$LAST_IMAGE" ]; then
  echo " No previous image recorded in .last_stable_image. Falling back to 'shopfast-backend:latest'..."
  LAST_IMAGE="shopfast-backend:latest"
fi

echo "Rolling back backend to previous stable image: $LAST_IMAGE"

# Stop failing backend
docker compose stop backend || true

# Revert image
docker tag "$LAST_IMAGE" shopfast-backend:active || true
docker compose up -d --no-deps backend

echo "Verifying rolled-back backend health..."
sleep 5
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health || true)

if [ "$HTTP_STATUS" -eq 200 ]; then
  echo " Rollback completed successfully! Stable version is restored."
  exit 0
else
  echo " CRITICAL: Rolled-back version also failing healthcheck! Check container logs:"
  docker compose logs --tail=50 backend
  exit 2
fi
