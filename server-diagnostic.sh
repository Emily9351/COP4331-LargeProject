#!/bin/bash

# Server diagnostic script for emilydensmore.com
# Upload this to your server and run it to diagnose issues

echo "=========================================="
echo "Server Diagnostics for emilydensmore.com"
echo "=========================================="
echo ""

# System info
echo "1. System Information:"
echo "   Hostname: $(hostname)"
echo "   IP Address: $(hostname -I | awk '{print $1}')"
echo "   OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"
echo ""

# Check Nginx
echo "2. Nginx Status:"
if command -v nginx &> /dev/null; then
    echo "   ✓ Nginx is installed"
    if systemctl is-active --quiet nginx; then
        echo "   ✓ Nginx is running"
    else
        echo "   ✗ Nginx is NOT running"
        echo "   Fix: sudo systemctl start nginx"
    fi
    sudo nginx -t 2>&1 | grep -q "syntax is ok" && echo "   ✓ Nginx config is valid" || echo "   ✗ Nginx config has errors"
else
    echo "   ✗ Nginx is NOT installed"
    echo "   Fix: sudo apt install nginx"
fi
echo ""

# Check firewall
echo "3. Firewall Status:"
if command -v ufw &> /dev/null; then
    echo "   UFW status:"
    sudo ufw status | head -10
    if sudo ufw status | grep -q "80.*ALLOW"; then
        echo "   ✓ Port 80 is open"
    else
        echo "   ✗ Port 80 is NOT open"
        echo "   Fix: sudo ufw allow 80/tcp"
    fi
    if sudo ufw status | grep -q "443.*ALLOW"; then
        echo "   ✓ Port 443 is open"
    else
        echo "   ✗ Port 443 is NOT open"
        echo "   Fix: sudo ufw allow 443/tcp"
    fi
else
    echo "   UFW not found, checking iptables..."
    sudo iptables -L -n | grep -E "80|443" || echo "   Check your firewall manually"
fi
echo ""

# Check ports
echo "4. Listening Ports:"
echo "   Ports 80, 443, 5000:"
sudo netstat -tlnp 2>/dev/null | grep -E ':80 |:443 |:5000 ' || sudo ss -tlnp | grep -E ':80 |:443 |:5000 '
echo ""

# Check Node.js
echo "5. Node.js Status:"
if command -v node &> /dev/null; then
    echo "   ✓ Node.js installed: $(node --version)"
else
    echo "   ✗ Node.js NOT installed"
fi
echo ""

# Check PM2
echo "6. PM2 Status:"
if command -v pm2 &> /dev/null; then
    echo "   ✓ PM2 is installed"
    echo "   Running processes:"
    pm2 list
else
    echo "   ✗ PM2 is NOT installed"
    echo "   Fix: npm install -g pm2"
fi
echo ""

# Check for project directory
echo "7. Project Directory:"
if [ -d "/var/www/COP4331-LargeProject" ]; then
    echo "   ✓ Found at /var/www/COP4331-LargeProject"
elif [ -d "/home/*/COP4331-LargeProject" ]; then
    echo "   ✓ Found at: $(find /home -name "COP4331-LargeProject" -type d 2>/dev/null | head -1)"
elif [ -d "~/COP4331-LargeProject" ]; then
    echo "   ✓ Found at ~/COP4331-LargeProject"
else
    echo "   ✗ Project directory not found"
    echo "   Search manually: find /home -name 'COP4331-LargeProject' 2>/dev/null"
fi
echo ""

# Check Nginx sites
echo "8. Nginx Configuration:"
if [ -d "/etc/nginx/sites-enabled" ]; then
    echo "   Enabled sites:"
    ls -la /etc/nginx/sites-enabled/ | grep -v "^total" | grep -v "^d"
    echo ""
    echo "   Config files mentioning port 5000 or emilydensmore:"
    sudo grep -r "5000\|emilydensmore" /etc/nginx/sites-enabled/ 2>/dev/null | head -5 || echo "   None found"
else
    echo "   No sites-enabled directory found"
fi
echo ""

echo "=========================================="
echo "Summary of Issues:"
echo "=========================================="
echo ""
echo "Run the suggested 'Fix:' commands above to resolve any issues marked with ✗"
echo ""
