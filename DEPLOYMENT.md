# Deployment Guide

## Architecture

This application has two main components:
- **Backend (Express)**: Runs on port 5000, serves both API endpoints and static frontend files
- **Frontend (React + Vite)**: Built into static files and served by the backend in production

**Production URL**: https://emilydensmore.com (backend serves everything on port 5000, proxied via Nginx)

## Local Development

### Option 1: Run both servers separately (Recommended for development)

1. **Start the backend** (in one terminal):
   ```bash
   cd backend
   npm install
   npm start
   ```
   Backend runs on http://localhost:5000

2. **Start the frontend dev server** (in another terminal):
   ```bash
   cd web-frontend
   npm install
   npm run dev
   ```
   Frontend runs on http://localhost:5173 with hot reload
   API requests are proxied to backend on port 5000

### Option 2: Run production build locally

1. **Build and start everything**:
   ```bash
   # From project root
   npm install
   cd backend && npm install && cd ..
   cd web-frontend && npm install && cd ..
   
   # Build frontend
   npm run build
   
   # Start backend (serves both API and built frontend)
   npm start
   ```
   Everything runs on http://localhost:5000

## Production Deployment

### Prerequisites
- Node.js installed on server
- MongoDB connection string set in `.env`
- Port 5000 accessible (or set custom PORT in environment)

### Step 1: Prepare Environment Variables

Create `/backend/.env` with:
```
MONGODB_URI=your_mongodb_connection_string
PORT=5000
MAILJET_API_KEY=your_key
MAILJET_SECRET_KEY=your_secret
MAILJET_SENDER_EMAIL=your_email
```

### Step 2: Build the Frontend

On your server, run:
```bash
cd /path/to/project
cd web-frontend
npm install
npm run build
```

This creates `web-frontend/dist/` with optimized production files.

### Step 3: Start the Backend

```bash
cd /path/to/project/backend
npm install
npm start
```

Or use PM2 for process management:
```bash
npm install -g pm2
cd /path/to/project/backend
pm2 start server.js --name "largeproject-backend"
pm2 save
pm2 startup
```

### Step 4: Access Your Application

Visit: http://your-server-ip:5000

The backend will:
- Serve the React app at `/`
- Handle API requests at `/api/*`

## Troubleshooting

### Error: "Frontend dist folder not found"
**Solution**: Build the frontend first:
```bash
cd web-frontend && npm run build
```

### Error: "ECONNREFUSED" when calling API from frontend
**Causes:**
1. Backend not running → Start backend with `cd backend && npm start`
2. Wrong port in Vite proxy (dev only) → Should be `localhost:5000`
3. In production, backend not serving files → Rebuild frontend

### API works but frontend shows 404
**Solution**: 
1. Check that `web-frontend/dist/` exists and has files
2. Restart the backend server
3. Check backend console for "Serving frontend from:" message

### Changes not reflecting
**In development:** Vite should auto-reload. If not, restart Vite dev server.
**In production:** You must rebuild:
```bash
cd web-frontend && npm run build
```
Then restart the backend.

## Quick Commands Reference

```bash
# Development (hot reload)
cd backend && npm start              # Terminal 1
cd web-frontend && npm run dev       # Terminal 2

# Production (one server, everything on port 5000)
cd web-frontend && npm run build     # Build first
cd backend && npm start              # Then start

# Or from root:
npm run build                        # Build frontend
npm start                            # Start backend
```

## Nginx Configuration for emilydensmore.com

The production server uses Nginx as a reverse proxy. Here's the configuration:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name emilydensmore.com www.emilydensmore.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name emilydensmore.com www.emilydensmore.com;

    # SSL Configuration (using Let's Encrypt or similar)
    ssl_certificate /etc/letsencrypt/live/emilydensmore.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/emilydensmore.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Proxy to Node.js backend on port 5000
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
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Optional: Serve static files directly through Nginx for better performance
    # location /assets/ {
    #     alias /path/to/project/web-frontend/dist/assets/;
    #     expires 1y;
    #     add_header Cache-Control "public, immutable";
    # }
}
```

### Setting up Nginx on your server:

1. **Install Nginx** (if not already installed):
   ```bash
   sudo apt update
   sudo apt install nginx
   ```

2. **Create the configuration file**:
   ```bash
   sudo nano /etc/nginx/sites-available/emilydensmore.com
   ```
   Paste the configuration above.

3. **Enable the site**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/emilydensmore.com /etc/nginx/sites-enabled/
   ```

4. **Test and reload Nginx**:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

5. **Setup SSL with Let's Encrypt**:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d emilydensmore.com -d www.emilydensmore.com
   ```

Then access via: https://emilydensmore.com
