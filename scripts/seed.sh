#!/bin/bash
set -e

echo "Seeding ShopFast Database..."
cd backend
npm run seed
echo "Seeding completed successfully!"
