#!/bin/bash

echo "🔍 Testing SMTP Port Connectivity..."
echo ""

# Test Port 587
echo -n "Testing smtp.gmail.com:587 ... "
timeout 5 bash -c "echo quit | telnet smtp.gmail.com 587" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ OPEN"
    PORT_587="OPEN"
else
    timeout 5 bash -c '</dev/tcp/smtp.gmail.com/587' > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ OPEN"
        PORT_587="OPEN"
    else
        echo "❌ BLOCKED or TIMEOUT"
        PORT_587="BLOCKED"
    fi
fi

# Test Port 465
echo -n "Testing smtp.gmail.com:465 ... "
timeout 5 bash -c "echo quit | telnet smtp.gmail.com 465" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ OPEN"
    PORT_465="OPEN"
else
    timeout 5 bash -c '</dev/tcp/smtp.gmail.com/465' > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ OPEN"
        PORT_465="OPEN"
    else
        echo "❌ BLOCKED or TIMEOUT"
        PORT_465="BLOCKED"
    fi
fi

echo ""
echo "📊 Results:"
echo "  Port 587 (STARTTLS): $PORT_587"
echo "  Port 465 (SSL/TLS):  $PORT_465"
echo ""

if [ "$PORT_587" = "OPEN" ] || [ "$PORT_465" = "OPEN" ]; then
    echo "✅ At least one port is open! SMTP should work."
    echo ""
    echo "Next step: Test actual email sending"
    echo "Run: node test-email.js your-email@example.com"
else
    echo "❌ Both ports appear blocked."
    echo ""
    echo "Possible causes:"
    echo "  1. DigitalOcean Cloud Firewall (check dashboard)"
    echo "  2. iptables blocking (run: sudo iptables -L OUTPUT -n)"
    echo "  3. ISP blocking (unlikely on server)"
    echo "  4. New account restrictions (contact DO support)"
    echo ""
    echo "Alternative: Use SendGrid (already configured, no port issues)"
fi
