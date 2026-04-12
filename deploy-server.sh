#!/bin/bash

# Server deployment script for emilydensmore.com
# Run this script on your production server

set -e  # Exit on any error

echo "=========================================="
echo "Deploying to emilydensmore.com"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "backend" ] || [ ! -d "web-frontend" ]; then
    echo "Error: Please run this script from the project root directory"
    exit 1
fi

# Step 1: Pull latest changes
echo "Step 1: Pulling latest changes from git..."
git pull origin main || git pull origin master
echo "✓ Code updated"
echo ""

# Step 2: Install dependencies
echo "Step 2: Installing dependencies..."
cd web-frontend
npm install
cd ../backend
npm install
cd ..
echo "✓ Dependencies installed"
echo ""

# Step 3: Build Frontend
echo "Step 3: Building frontend for production..."
cd web-frontend
npm run build
cd ..
echo "✓ Frontend built successfully"
echo ""

# Step 4: Check for .env file
echo "Step 4: Checking environment configuration..."
if [ ! -f "backend/.env" ]; then
    echo "⚠ ERROR: backend/.env not found!"
    echo "Please create backend/.env with:"
    echo "  MONGODB_URI=your_mongodb_uri"
    echo "  PORT=5000"
    echo "  MAILJET_API_KEY=your_key"
    echo "  MAILJET_SECRET_KEY=your_secret"
    echo "  MAILJET_SENDER_EMAIL=your_email"
    exit 1
else
    echo "✓ Environment file found"
fi
echo ""

# Step 5: Restart the service
echo "Step 5: Restarting the application..."
if command -v pm2 &> /dev/null; then
    # If PM2 is installed, use it
    if pm2 list | grep -q "largeproject"; then
        echo "Restarting existing PM2 process..."
        pm2 restart largeproject
        pm2 save
    else
        echo "Starting new PM2 process..."
        cd backend
        pm2 start server.js --name largeproject
        pm2 save
        cd ..
    fi
    echo "✓ Application restarted with PM2"
else
    echo "⚠ PM2 not found. Please install PM2 or manually start the server:"
    echo "  cd backend && npm start"
    echo ""
    echo "To install PM2:"
    echo "  npm install -g pm2"
    echo "  pm2 start backend/server.js --name largeproject"
    echo "  pm2 startup"
    echo "  pm2 save"
fi
echo ""

# Step 6: Check status
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
if command -v pm2 &> /dev/null; then
    echo "Application status:"
    pm2 list
    echo ""
    echo "View logs: pm2 logs largeproject"
    echo "Stop: pm2 stop largeproject"
    echo "Restart: pm2 restart largeproject"
else
    echo "Start the server manually with:"
    echo "  cd backend && npm start"
fi
echo ""
echo "Application should be available at:"
echo "  https://emilydensmore.com"
echo ""
