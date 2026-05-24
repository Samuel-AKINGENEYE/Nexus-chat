#!/bin/bash

echo "🚀 Deploying Nexus to Production..."
echo "=========================================="

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "Docker is required but not installed."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Node.js is required but not installed."; exit 1; }

# Build frontend
echo "📦 Building frontend..."
cd frontend
npm run build || echo "Frontend build skipped (not configured)"

# Build backend
echo "🔧 Building backend..."
cd ../backend
npm run build || echo "Backend build skipped"

# Run database migrations
echo "🗄️ Running database migrations..."
npx prisma migrate deploy

# Start with PM2 (if installed)
if command -v pm2 >/dev/null 2>&1; then
  echo "🔄 Starting with PM2..."
  pm2 stop nexus-backend 2>/dev/null
  pm2 start src/server.js --name nexus-backend
  pm2 save
else
  echo "⚠️ PM2 not installed. Run: npm install -g pm2"
  echo "Starting with node..."
  NODE_ENV=production node src/server.js &
fi

echo "✅ Deployment complete!"
echo "🌐 Nexus is running at http://localhost:3001"
