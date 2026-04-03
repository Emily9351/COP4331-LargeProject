# Server Email Freezing - Port Blocking Issue

## Problem: Email Hangs at "Attempting to send"

This means your **server is blocking outbound SMTP connections**. Many hosting providers block SMTP ports (587/465) by default to prevent spam.

## Quick Diagnosis

Run these commands on your server to test connectivity:

### Test Gmail SMTP Port 587:
```bash
timeout 5 bash -c '</dev/tcp/smtp.gmail.com/587' && echo "Port 587 OPEN" || echo "Port 587 BLOCKED"
```

### Test Gmail SMTP Port 465:
```bash
timeout 5 bash -c '</dev/tcp/smtp.gmail.com/465' && echo "Port 465 OPEN" || echo "Port 465 BLOCKED"
```

### Alternative test with telnet:
```bash
telnet smtp.gmail.com 587
# If it connects, you'll see: "220 smtp.gmail.com ESMTP..."
# If it hangs or times out, the port is blocked
```

### Alternative test with nc (netcat):
```bash
nc -zv smtp.gmail.com 587
nc -zv smtp.gmail.com 465
```

## If Ports Are BLOCKED:

You have 3 options:

---

## Option 1: Use Port 587 with Different Settings (Quick Try)

Update `backend/utils/SendPasswordResetEmail.js`:

```javascript
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Use STARTTLS
    auth: {
        user: process.env.EMAIL_USER || "adnan400283@gmail.com",
        pass: process.env.EMAIL_PASS || "idchvrimzownatsa",
    },
    tls: {
        rejectUnauthorized: false // Don't fail on invalid certs
    },
    connectionTimeout: 10000, // 10 second timeout
    greetingTimeout: 10000,
    socketTimeout: 10000
});
```

---

## Option 2: Use Port 465 (SSL/TLS)

Update `backend/utils/SendPasswordResetEmail.js`:

```javascript
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // Use SSL
    auth: {
        user: process.env.EMAIL_USER || "adnan400283@gmail.com",
        pass: process.env.EMAIL_PASS || "idchvrimzownatsa",
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000
});
```

---

## Option 3: Use SendGrid (RECOMMENDED - No SMTP Blocking)

SendGrid uses HTTP/HTTPS instead of SMTP, so it bypasses firewall blocks.

### 3a. Sign up for SendGrid:
1. Go to https://sendgrid.com/
2. Create free account (100 emails/day free forever)
3. Go to Settings > API Keys
4. Create new API key with "Mail Send" permission
5. Copy the API key

### 3b. Install SendGrid:
```bash
cd backend
npm install @sendgrid/mail
```

### 3c. Update `.env`:
```env
SENDGRID_API_KEY=your-sendgrid-api-key-here
EMAIL_USER=noreply@emilydensmore.com
FRONTEND_URL=http://emilydensmore.com
```

### 3d. Create new file `backend/utils/SendPasswordResetEmailSendGrid.js`:
```javascript
require("dotenv").config();
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendPasswordResetEmail(toEmail, resetToken) {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
    
    const msg = {
        to: toEmail,
        from: {
            email: process.env.EMAIL_USER || 'noreply@emilydensmore.com',
            name: 'Up To-Do App'
        },
        subject: 'Password Reset Request - Up To-Do App',
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: auto;">
            <h2>Password Reset</h2>
            <p>You requested to reset your password. Click the button below to reset it. This link expires in 1 hour.</p>
            <div style="margin: 24px 0;">
              <a href="${resetLink}" 
                 style="background-color: #4F46E5; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
            <p style="color: #4F46E5; font-size: 12px; word-break: break-all;">${resetLink}</p>
            <p style="color: #888; font-size: 12px; margin-top: 24px;">If you didn't request this, please ignore this email. Your password will remain unchanged.</p>
          </div>
        `,
    };

    try {
        await sgMail.send(msg);
        console.log("✅ Password reset email sent via SendGrid");
        console.log("   To:", toEmail);
        console.log("   Reset link:", resetLink);
        return { success: true };
    } catch (error) {
        console.error("❌ Failed to send email via SendGrid:");
        console.error("   Error:", error.message);
        if (error.response) {
            console.error("   Response:", error.response.body);
        }
        return { success: false, error: error.message };
    }
}

module.exports = sendPasswordResetEmail;
```

### 3e. Update `backend/server.js`:
```javascript
// Change this line:
const sendPasswordResetEmail = require("./utils/SendPasswordResetEmail");

// To this:
const sendPasswordResetEmail = require("./utils/SendPasswordResetEmailSendGrid");
```

---

## Option 4: Ask Your Hosting Provider

Contact your hosting provider and ask them to:
- Unblock outbound SMTP ports (587 and 465)
- Or provide their SMTP relay server

Common providers that block SMTP:
- DigitalOcean
- Google Cloud Platform
- AWS (blocks port 25, but 587/465 usually work)
- Azure

---

## Quick Test Script with Timeout

Create `backend/test-smtp-connection.js`:

```javascript
const net = require('net');

function testPort(host, port) {
    return new Promise((resolve) => {
        const socket = net.createConnection(port, host);
        
        const timeout = setTimeout(() => {
            socket.destroy();
            resolve({ port, status: 'TIMEOUT/BLOCKED' });
        }, 5000);
        
        socket.on('connect', () => {
            clearTimeout(timeout);
            socket.destroy();
            resolve({ port, status: 'OPEN' });
        });
        
        socket.on('error', (err) => {
            clearTimeout(timeout);
            resolve({ port, status: 'BLOCKED', error: err.message });
        });
    });
}

async function testSMTP() {
    console.log('Testing SMTP connectivity...\n');
    
    const ports = [587, 465, 25];
    
    for (const port of ports) {
        const result = await testPort('smtp.gmail.com', port);
        console.log(`Port ${result.port}: ${result.status}`);
        if (result.error) {
            console.log(`  Error: ${result.error}`);
        }
    }
}

testSMTP();
```

Run it:
```bash
node test-smtp-connection.js
```

---

## What Each Status Means:

- **OPEN** ✅ - Port is accessible, email should work
- **BLOCKED** ❌ - Port is blocked by firewall
- **TIMEOUT** ⏱️ - Port is blocked or server doesn't respond

---

## My Recommendation:

**Use SendGrid (Option 3)** because:
- ✅ No SMTP port issues
- ✅ Better deliverability (99%+ inbox rate)
- ✅ Free tier: 100 emails/day
- ✅ Works on ALL hosting providers
- ✅ Provides email tracking and analytics
- ✅ Faster and more reliable

---

## Summary

Your issue is almost certainly **port blocking**. The email code is working fine (it works locally), but your server's firewall or hosting provider is blocking outbound SMTP connections.

**Run the port test first**, then choose:
- If ports are **OPEN**: Try Option 1 or 2 (different port settings)
- If ports are **BLOCKED**: Use Option 3 (SendGrid) - this is the fastest fix
- If you need SMTP: Contact your hosting provider (Option 4)
