#!/bin/bash

# Simple server setup script for emilydensmore.com:5000
# Run this on your server after uploading your code

set -e

echo "=========================================="
echo "Setting up COP4331-LargeProject"
echo "Running on Port 5000"
echo "=========================================="
echo ""

# Check we're in the right place
if [ ! -f "package.json" ]; then
    echo "Error: Run this from the project root directory"
    exit 1
fi

# Step 1: Build frontend
echo "Step 1: Building frontend..."
cd web-frontend
npm install
npm run build
echo "✓ Frontend built"
echo ""

# Step 2: Setup backend
echo "Step 2: Setting up backend..."
cd ../backend
npm install
echo "✓ Backend dependencies installed"
echo ""

# Step 3: Check .env
echo "Step 3: Checking environment..."
if [ ! -f ".env" ]; then
    echo "⚠ WARNING: backend/.env not found!"
    echo ""
    echo "Create backend/.env with:"
    echo "  MONGODB_URI=your_connection_string"
    echo "  PORT=5000"
    echo "  MAILJET_API_KEY=your_key"
    echo "  MAILJET_SECRET_KEY=your_secret"
    echo "  MAILJET_SENDER_EMAIL=noreply@emilydensmore.com"
    echo "  NODE_ENV=production"
    echo ""
    read -p "Create .env now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cat > .env << 'EOF'
MONGODB_URI=
PORT=5000
MAILJET_API_KEY=
MAILJET_SECRET_KEY=
MAILJET_SENDER_EMAIL=
NODE_ENV=production
EOF
        echo "✓ Created .env template - please edit it with your values:"
        echo "  nano backend/.env"
        exit 0
    fi
else
    echo "✓ .env file exists"
fi
echo ""

# Step 4: Check PM2
echo "Step 4: Setting up PM2..."
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi
echo "✓ PM2 ready"
echo ""

# Step 5: Start the app
echo "Step 5: Starting application..."
cd ..

# Stop existing instance if running
pm2 delete largeproject 2>/dev/null || true

# Start new instance
cd backend
pm2 start server.js --name largeproject
pm2 save
echo "✓ Application started"
echo ""

# Step 6: Setup auto-start
echo "Step 6: Setting up auto-start..."
pm2 startup | grep -E "^sudo" | sh
echo "✓ Auto-start configured"
echo ""

# Step 7: Check firewall
echo "Step 7: Checking firewall..."
if command -v ufw &> /dev/null; then
    if sudo ufw status | grep -q "5000.*ALLOW"; then
        echo "✓ Port 5000 is open"
    else
        echo "Opening port 5000..."
        sudo ufw allow 5000/tcp
        sudo ufw reload
        echo "✓ Port 5000 opened"
    fi
else
    echo "⚠ UFW not found - make sure port 5000 is open in your firewall"
fi
echo ""

# Final status
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Your application is running at:"
echo "  http://emilydensmore.com:5000"
echo ""
echo "Useful commands:"
echo "  pm2 list              - Check status"
echo "  pm2 logs largeproject - View logs"
echo "  pm2 restart largeproject - Restart app"
echo "  pm2 stop largeproject - Stop app"
echo ""

# Show status
pm2 list
echo ""

# Test local connection
echo "Testing local connection..."
if curl -s http://localhost:5000 > /dev/null; then
    echo "✓ Server is responding!"
else
    echo "✗ Server not responding - check logs: pm2 logs largeproject"
fi
echo ""
