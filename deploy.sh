#!/bin/bash

# Production deployment script for Large Project
# This script builds the frontend and prepares everything for production

set -e  # Exit on any error

echo "=========================================="
echo "Production Deployment Script"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "backend" ] || [ ! -d "web-frontend" ]; then
    echo "Error: Please run this script from the project root directory"
    exit 1
fi

# Step 1: Build Frontend
echo "Step 1: Building frontend..."
cd web-frontend
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi
npm run build
cd ..
echo "✓ Frontend built successfully"
echo ""

# Step 2: Install Backend Dependencies
echo "Step 2: Installing backend dependencies..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install
fi
cd ..
echo "✓ Backend dependencies installed"
echo ""

# Step 3: Check for .env file
echo "Step 3: Checking environment configuration..."
if [ ! -f "backend/.env" ]; then
    echo "⚠ Warning: backend/.env not found"
    echo "Please create backend/.env with your configuration:"
    echo "  MONGODB_URI=your_mongodb_uri"
    echo "  PORT=5000"
    echo "  MAILJET_API_KEY=your_key"
    echo "  MAILJET_SECRET_KEY=your_secret"
    echo "  MAILJET_SENDER_EMAIL=your_email"
    echo ""
    read -p "Do you want to continue anyway? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✓ Environment file found"
fi
echo ""

# Step 4: Summary
echo "=========================================="
echo "Deployment prepared successfully!"
echo "=========================================="
echo ""
echo "To start the server, run:"
echo "  cd backend && npm start"
echo ""
echo "Or use PM2 for production:"
echo "  pm2 start backend/server.js --name largeproject"
echo ""
echo "The application will be available at:"
echo "  http://localhost:5000"
echo ""
