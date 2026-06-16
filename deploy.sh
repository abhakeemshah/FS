#!/bin/bash

# FS-Communication Deployment Script for Hostinger
# This script automates deployment from GitHub to your Hostinger server

set -e

echo "🚀 Starting FS-Communication deployment..."

# 1. Clone or update repository
if [ -d "FS-Communication" ]; then
  echo "📁 Updating existing repository..."
  cd FS-Communication
  git fetch origin
  git pull origin main
else
  echo "📁 Cloning repository..."
  git clone https://github.com/abhakeemshah/FS.git FS-Communication
  cd FS-Communication
fi

# 2. Install dependencies
echo "📦 Installing dependencies..."
npm ci

# 3. Set up environment — load live Turso credentials
if [ -f ".env" ]; then
  echo "⚙️  Loading environment from .env..."
  set -a; source .env; set +a
elif [ -f ".env.local" ]; then
  echo "⚙️  Loading environment from .env.local..."
  set -a; source .env.local; set +a
else
  echo "⚠️  WARNING: No .env or .env.local file found!"
  echo "⚠️  The Turso DATABASE_URL credentials are not loaded."
  echo "⚠️  The next command will fail against the wrong database."
  exit 1
fi

# 4. Sync database schema (push to Turso cloud so columns match the Prisma schema)
echo "🗄️  Syncing database schema..."
npx prisma db push

# 5. Build application
echo "🔨 Building application..."
npm run build

# 6. Start with PM2 (if available)
if command -v pm2 &> /dev/null; then
  echo "▶️  Starting with PM2..."
  pm2 reload ecosystem.config.js --name "fs-communication" || \
    pm2 start ecosystem.config.js --name "fs-communication"
  pm2 save
  pm2 startup
else
  echo "⚠️  PM2 not found. Starting with npm..."
  npm run start &
fi

echo "✅ Deployment completed!"
echo "🌐 Your app should be running at: https://admin.fs-communication.com"
