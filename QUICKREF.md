# Quick Reference - Development vs Production

## Development (localhost)

### Running locally with hot reload:

**Terminal 1 - Backend:**
```bash
cd backend
npm start
# Runs on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd web-frontend
npm run dev
# Runs on http://localhost:5173
# API calls proxied to localhost:5000
```

**Access:** http://localhost:5173

---

## Production (emilydensmore.com)

### Deploying to your server:

1. **SSH into your server:**
   ```bash
   ssh your-username@emilydensmore.com
   ```

2. **Navigate to project:**
   ```bash
   cd /path/to/COP4331-LargeProject
   ```

3. **Run deployment script:**
   ```bash
   ./deploy-server.sh
   ```

   This script will:
   - Pull latest code from git
   - Install dependencies
   - Build the frontend
   - Restart the backend with PM2

4. **Manual steps (if needed):**
   ```bash
   # Pull code
   git pull
   
   # Build frontend
   cd web-frontend && npm install && npm run build && cd ..
   
   # Restart backend
   cd backend && npm install
   pm2 restart largeproject
   # OR without PM2:
   npm start
   ```

**Access:** https://emilydensmore.com

---

## Architecture Overview

### Local Development
```
Browser → http://localhost:5173 (Vite)
                ↓ (proxy /api/*)
         http://localhost:5000 (Express)
                ↓
            MongoDB
```

### Production
```
Browser → https://emilydensmore.com
                ↓ (Nginx :443)
         http://localhost:5000 (Express)
         ├── Serves React app (/)
         └── Serves API (/api/*)
                ↓
            MongoDB
```

---

## Key Files

- **Backend Server:** `backend/server.js`
- **Backend Config:** `backend/.env` (not in git!)
- **Frontend Dev Server:** `web-frontend/vite.config.ts`
- **API Config:** `web-frontend/src/config/api.ts`
- **Deployment Script:** `deploy-server.sh`

---

## Common Commands

### Backend
```bash
cd backend
npm start              # Start server
pm2 list              # Check PM2 status
pm2 logs largeproject # View logs
pm2 restart largeproject # Restart
```

### Frontend
```bash
cd web-frontend
npm run dev           # Development server
npm run build         # Build for production
npm run preview       # Preview production build locally
```

### Full Stack
```bash
# From project root
npm run build         # Build frontend
npm start            # Start backend
```

---

## Troubleshooting

### Issue: API not responding on emilydensmore.com

**Check:**
1. Backend is running: `pm2 list` or `ps aux | grep node`
2. Port 5000 is open: `netstat -tlnp | grep 5000`
3. Nginx is running: `sudo systemctl status nginx`
4. Check logs: `pm2 logs largeproject`

**Fix:**
```bash
cd /path/to/project/backend
pm2 restart largeproject
# OR
sudo systemctl restart nginx
```

### Issue: Changes not showing up

**Frontend changes:**
```bash
cd web-frontend && npm run build
pm2 restart largeproject
```

**Backend changes:**
```bash
pm2 restart largeproject
```

### Issue: Build fails

**Check Node version:**
```bash
node --version  # Should be v18+ or v20+
```

**Clean install:**
```bash
cd web-frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## Environment Variables

### Backend (.env)
Required in `backend/.env`:
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
PORT=5000
MAILJET_API_KEY=your_key
MAILJET_SECRET_KEY=your_secret
MAILJET_SENDER_EMAIL=noreply@emilydensmore.com
```

### Frontend
No environment variables needed! Uses relative paths in production.

---

## PM2 Setup (One-time)

```bash
# Install PM2 globally
npm install -g pm2

# Start your app
cd /path/to/project/backend
pm2 start server.js --name largeproject

# Save the process list
pm2 save

# Setup auto-start on server reboot
pm2 startup
# Follow the instructions it gives you (will be a sudo command)

# Useful PM2 commands
pm2 list                  # List all processes
pm2 logs largeproject    # View logs
pm2 restart largeproject # Restart
pm2 stop largeproject    # Stop
pm2 delete largeproject  # Remove from PM2
```
