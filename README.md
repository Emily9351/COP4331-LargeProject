# COP4331-LargeProject
COP4331 Large Project

Figma Prototype: https://www.figma.com/make/KhhVmSPESigmLpcM8zTQCv/Up-Themed-To-Do-List?t=lvqwFhtKgkeaG3lZ-20&fullscreen=1&preview-route=%2Fdashboard

<img width="1024" height="768" alt="Blue and White Simple Modern Timeline Progress Gantt Chart" src="https://github.com/user-attachments/assets/8aac61e5-0ea1-4a96-912c-79c7464be11e" />

## Quick Start

### Local Development (with hot reload)
```bash
# Terminal 1 - Backend
cd backend && npm install && npm start

# Terminal 2 - Frontend  
cd web-frontend && npm install && npm run dev
```
Visit: http://localhost:5173

### Production Deployment (everything on port 5000)
```bash
# Easy way - use the deployment script
./deploy.sh
cd backend && npm start

# Or manually
cd web-frontend && npm run build
cd ../backend && npm start
```
Visit: http://localhost:5000 (or your server IP)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions and troubleshooting.

