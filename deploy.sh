#!/bin/bash
set -e

echo "==> Building frontend..."
docker compose -f docker-compose.prod.yml --profile build run --rm frontend_build

echo "==> Building backend image..."
docker compose -f docker-compose.prod.yml build backend celery_worker

echo "==> Starting all services..."
docker compose -f docker-compose.prod.yml up -d

echo "==> Restarting nginx to refresh upstream DNS..."
docker compose -f docker-compose.prod.yml restart nginx

echo "==> Done! LensLog is up."
