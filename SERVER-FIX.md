# How to Fix emilydensmore.com

## The Problem
Your server at `167.99.63.238` is not responding on ports 80 (HTTP) or 443 (HTTPS).
This is a **server configuration issue**, not a code issue.

## Step-by-Step Fix

### Step 1: Access Your Server

Open Terminal and SSH into your server:

```bash
ssh your-username@emilydensmore.com
# or
ssh your-username@167.99.63.238
```

**Don't know your username?** It's usually `root`, `ubuntu`, `admin`, or your name.

---

### Step 2: Run the Diagnostic Script

Once logged into your server, upload and run the diagnostic script:

#### Option A: Upload from your local machine
```bash
# On your LOCAL machine (in a new terminal window):
cd /Users/emily.densmore/Desktop/class/COP4331-LargeProject
scp server-diagnostic.sh your-username@emilydensmore.com:~/
```

Then on the server:
```bash
chmod +x ~/server-diagnostic.sh
sudo ~/server-diagnostic.sh
```

#### Option B: Create it directly on server
```bash
# On the SERVER:
nano ~/diagnostic.sh
# Paste the content from server-diagnostic.sh
# Press Ctrl+X, then Y, then Enter to save

chmod +x ~/diagnostic.sh
sudo ~/diagnostic.sh
```

---

### Step 3: Fix Based on Diagnostic Results

The script will tell you what's wrong. Here are the most common fixes:

#### If Nginx is not running:
```bash
sudo systemctl start nginx
sudo systemctl enable nginx
sudo systemctl status nginx
```

#### If ports 80/443 are blocked:
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5000/tcp
sudo ufw reload
sudo ufw status
```

#### If Nginx is not installed:
```bash
sudo apt update
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### If backend is not running:
```bash
# Find your project directory
cd /var/www/COP4331-LargeProject
# or
cd ~/COP4331-LargeProject

# Install PM2 if needed
npm install -g pm2

# Start the backend
cd backend
pm2 start server.js --name largeproject
pm2 save
pm2 startup  # Follow the instructions it gives
```

#### If Nginx config is missing:
```bash
sudo nano /etc/nginx/sites-available/emilydensmore.com
```

Paste this configuration:
```nginx
server {
    listen 80;
    server_name emilydensmore.com www.emilydensmore.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Then enable it:
```bash
sudo ln -s /etc/nginx/sites-available/emilydensmore.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### Step 4: Verify It's Working

Test from your server:
```bash
curl http://localhost:5000
curl http://localhost
```

Both should return HTML.

Test from your local machine:
```bash
curl http://emilydensmore.com
```

Should return your website!

---

## Quick Commands Cheat Sheet

```bash
# Check what's running
sudo systemctl status nginx
pm2 list
lsof -i :5000

# View logs
pm2 logs largeproject
sudo tail -f /var/log/nginx/error.log

# Restart services
sudo systemctl restart nginx
pm2 restart largeproject

# Check firewall
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

---

## Still Not Working?

If you run the diagnostic script and send me the output, I can give you specific commands to fix your exact issue.

Just copy/paste the output from `sudo ~/server-diagnostic.sh` and I'll help you debug!

---

## Alternative: If You Don't Have Server Access

If you can't SSH in, you may need to:

1. **Check with your hosting provider** (DigitalOcean, AWS, etc.)
2. **Access via web console** (most cloud providers have browser-based terminal)
3. **Check DNS settings** - Make sure emilydensmore.com points to 167.99.63.238
4. **Contact whoever set up the server** - They may have access

Run this on your local machine to verify DNS:
```bash
dig emilydensmore.com
nslookup emilydensmore.com
```
