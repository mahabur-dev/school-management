#!/bin/sh
set -eu

echo "Applying pending database migrations..."
./node_modules/.bin/prisma migrate deploy

echo "Starting SchoolSaaS API on port ${PORT:-5000}..."
exec node dist/main.js
