# 🔧 Logistic 18 - Complete Setup Guide

This guide will take you step-by-step through setting up the entire Logistic 18 system from scratch.

---

## ✅ Prerequisites Check

Before starting, ensure you have:

```bash
# Node.js 16+ and npm 8+
node --version   # v16.0.0 or higher
npm --version    # v8.0.0 or higher

# Python 3.9+ (optional, for ML service)
python --version  # Python 3.9 or higher

# MongoDB (local or Atlas cloud)
# If using local: mongod should be available
mongod --version  # MongoDB Community v5.0+
```

If missing any prerequisites:
- **Node.js**: Download from https://nodejs.org (LTS recommended)
- **Python**: Download from https://python.org
- **MongoDB**: 
  - Local: https://docs.mongodb.com/manual/installation/
  - Cloud (Free): https://www.mongodb.com/cloud/atlas

---

## 📂 Step 1: Project Setup

### Open Terminal/Command Prompt

Navigate to your desired project location:

```bash
# Windows PowerShell
cd Desktop

# macOS/Linux
cd ~/Documents
```

### Clone/Navigate to Logistics18 folder

The folder structure should already be created. Navigate to it:

```bash
cd Logistics18
ls -la  # Verify you see: backend, frontend, ml-service, README.md
```

---

## 🛠️ Step 2: Configure MongoDB

### Option A: Use MongoDB Atlas (Recommended for Development)

1. **Create Account**: https://www.mongodb.com/cloud/atlas
2. **Create Free Cluster**: Click "Create Deployment" → Select M0 (Free Tier)
3. **Create Database User**:
   - Username: `devuser`
   - Password: `DevPassword123` (save this!)
4. **Get Connection String**:
   - Click "Connect" → "Compass" or "Get Connection String"
   - Copy the URI, it looks like: `mongodb+srv://devuser:DevPassword123@cluster0.xyz.mongodb.net/logistic18`
5. **Replace `<password>` with your actual password**

### Option B: Use Local MongoDB

```bash
# macOS with Homebrew
brew install mongodb-community
brew services start mongodb-community

# Windows - Use MongoDB Installer (follow setup wizard)
# Linux (Ubuntu)
sudo apt-get install -y mongodb

# Verify it's running
mongosh
> db.version()  # Should show version
> exit
```

Your local connection string will be: `mongodb://localhost:27017/logistic18`

---

## 📝 Step 3: Backend Setup

### Create Environment File

```bash
cd backend
cp .env.example .env
```

### Edit `.env` with Your Settings

Using your preferred editor (VS Code, nano, etc.), update:

```env
# Database
MONGODB_URI=mongodb+srv://devuser:DevPassword123@cluster0.xyz.mongodb.net/logistic18
DB_NAME=logistic18

# Server
PORT=5000
NODE_ENV=development

# JWT (Generate random 32+ character strings)
# Windows PowerShell:
# [System.Convert]::ToBase64String([System.byte[]]::new(32) | ForEach-Object { Get-Random -Maximum 256 }) | head -c 32

JWT_ACCESS_SECRET=your-super-secret-access-token-key-minimum-32-characters
JWT_REFRESH_SECRET=your-super-secret-refresh-token-key-minimum-32-characters

# Other settings
ML_SERVICE_URL=http://localhost:8000
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

**Generate JWT Secrets** (minimum 32 characters, use alphanumeric):

```bash
# macOS/Linux
openssl rand -base64 32

# Windows PowerShell
[System.Convert]::ToBase64String((1..32 | % { [byte](Get-Random -Maximum 256) }))
```

### Install Dependencies

```bash
npm install
# This should complete in 2-3 minutes
```

### Verify Installation

```bash
npm list express mongoose jsonwebtoken
# All should show installed versions
```

---

## ⚛️ Step 4: Frontend Setup

### Create Environment File

```bash
cd ../frontend
cp .env.example .env
```

### Edit `.env`

```env
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=Logistic 18
VITE_APP_VERSION=1.0.0
```

### Install Dependencies

```bash
npm install
# This should complete in 3-4 minutes
```

### Verify Installation

```bash
npm list react react-router-dom @reduxjs/toolkit
# All should show installed versions
```

---

## 🐍 Step 5: ML Service Setup (Optional)

The ML service is optional for full development. It's a FastAPI service that provides ML predictions.

### Create Python Virtual Environment

```bash
cd ../ml-service

# macOS/Linux
python3 -m venv venv
source venv/bin/activate

# Windows PowerShell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### Install Python Dependencies

```bash
pip install -r requirements.txt
# This should complete in 2-3 minutes
```

### Verify Installation

```bash
python -c "import fastapi; import xgboost; print('✓ ML service dependencies OK')"
```

---

## 🚀 Step 6: Start All Services

You'll need **3 terminal windows** open simultaneously.

### Terminal 1: Backend API Server

```bash
cd Logistics18/backend
npm run dev

# Expected output:
# ✓ MongoDB connected successfully
# ✓ Logistic 18 Backend running on http://localhost:5000
```

**Test it**: Open http://localhost:5000/api/health in browser
- Should show: `{"status":"ok","message":"Logistic 18 Backend is running",...}`

### Terminal 2: Frontend Dev Server

```bash
cd Logistics18/frontend
npm run dev

# Expected output:
#   VITE v5.0.0  ready in 234 ms
#   ➜  Local:   http://localhost:5173/
```

**Test it**: Open http://localhost:5173 in browser
- Should show login page

### Terminal 3 (Optional): ML Service

```bash
cd Logistics18/ml-service
source venv/bin/activate  # macOS/Linux
# OR
.\venv\Scripts\Activate.ps1  # Windows

python main.py

# Expected output:
# INFO:     Uvicorn running on http://0.0.0.0:8000
# INFO:     Application startup complete
```

**Test it**: Open http://localhost:8000/health in browser
- Should show ML service status

---

## 🧪 Step 7: First-Time Test Flow

### 1. Open Frontend

Go to http://localhost:5173

### 2. Register Account

Click "Create one" → Fill out registration form:
```
Name: Test User
Email: test@example.com
Password: TestPassword123 (must have uppercase, lowercase, number, 8+ chars)
Organization ID: org-test-001
```

Click "Register" → Should show success message

### 3. Login

Email: `test@example.com`  
Password: `TestPassword123`

Click "Login" → Should redirect to Dashboard

### 4. View Dashboard

You should see:
- Navigation tabs (Overview, Suppliers, Shipments, etc.)
- KPI cards (Risk Score, Active Alerts, Delayed Shipments, At-Risk Inventory)
- Quick links section

### 5. Access Users Panel (Admin Only)

As registered user, you need ORG_ADMIN role:
- Click avatar → Settings (in full implementation)
- Or directly edit user role in database to test

Database command:
```bash
mongosh
use logistic18
db.users.updateOne(
  { email: "test@example.com" },
  { $set: { role: "ORG_ADMIN" } }
)
```

Then refresh page, click "Users" in nav → User management page should appear

### 6. Invite New User

If ORG_ADMIN:
- Click "+ Invite User" button
- Fill form:
  ```
  Name: John Doe
  Email: john@example.com
  Role: LOGISTICS_OPERATOR
  ```
- Click "Send Invite"
- Should show success message

---

## 📊 Step 8: View Backend Logs

In Terminal 1 (Backend), you should see logs like:

```
[2024-02-27 10:15:32] POST /api/auth/register - 201 (245ms)
[2024-02-27 10:16:01] POST /api/auth/login - 200 (156ms)
[2024-02-27 10:16:15] GET /api/users - 200 (892ms)
[2024-02-27 10:16:32] POST /api/users/invite - 201 (234ms)
```

This confirms requests are being processed.

---

## 🐛 Troubleshooting

### Problem: "Cannot connect to MongoDB"

**Symptoms:** Backend shows `✗ MongoDB connection failed`

**Solutions:**
1. Verify MongoDB is running:
   ```bash
   mongosh  # Should connect, not error
   ```
2. Check MONGODB_URI in `.env`:
   - Starts with `mongodb://` (local) or `mongodb+srv://` (Atlas)
   - Has correct username, password, host
   - Has database name `/logistic18`
3. If using Atlas, check IP whitelist:
   - Go to Atlas → Network Access → IP Whitelist
   - Add your IP (or 0.0.0.0/0 for development only)

### Problem: "Port 5000 already in use"

**Symptoms:** `Error: listen EADDRINUSE :::5000`

**Solutions:**
```bash
# Windows PowerShell - Find what's using port 5000
Get-NetTCPConnection -LocalPort 5000 | Stop-Process -Force

# macOS/Linux
lsof -i :5000  # Find process
kill -9 <PID>  # Kill it
```

Or change PORT in `.env` to something else (5001, 5002, etc)

### Problem: "Module not found" / "Cannot find module"

**Symptoms:** `Error: Cannot find module 'express'` when starting backend

**Solutions:**
```bash
# Reinstall node_modules
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Problem: Frontend shows "CORS error" or "API not reachable"

**Symptoms:** Browser console shows CORS error, requests fail

**Solutions:**
1. Ensure backend is running (Terminal 1 shows "Backend running...")
2. Verify CORS_ORIGIN in backend `.env` matches frontend URL:
   ```env
   CORS_ORIGIN=http://localhost:5173  # Match your frontend URL
   ```
3. Restart backend after changing .env

### Problem: "SyntaxError" in backend logs

**Symptoms:** Backend crashes with JavaScript syntax errors

**Solutions:**
- Check that all files use correct ES6 syntax
- Verify no missing closing braces/parentheses
- Backend uses `"type": "module"` in package.json for ES6 imports

---

## 🔒 Security Checklist

Before production deployment:

- [ ] Change JWT secrets to random 32+ character strings
- [ ] Set `NODE_ENV=production` in backend
- [ ] Enable HTTPS/TLS for all communications
- [ ] Use MongoDB Atlas with strong credentials
- [ ] Enable IP whitelist on MongoDB Atlas
- [ ] Review and restrict CORS origins
- [ ] Set secure SameSite cookie attributes
- [ ] Enable database backups
- [ ] Implement rate limiting
- [ ] Add request validation on all inputs
- [ ] Use environment variables (never hardcode secrets)
- [ ] Run security audit: `npm audit fix`

---

## 📈 Next Steps After Setup

1. **Test All Authentication Flows**
   - Register → Login → Logout → Login again
   - Password change
   - Token refresh

2. **Test RBAC**
   - Change user roles
   - Verify access control works

3. **Test Audit Logging**
   - Check audit logs in database for all actions

4. **Integrate Other Modules** (done by team members)
   - Suppliers (Rifshadh)
   - Shipments (Umayanthi)
   - Inventory (Wijemanna)
   - Alerts (Kulatunga)
   - Analytics (Senadeera)

5. **Deploy to Production**
   - Use Docker Compose for containerization
   - Deploy to cloud (AWS, GCP, Azure, Heroku, etc)

---

## 📞 Getting Help

**Issues with setup?**
1. Check this guide's Troubleshooting section
2. Check [README.md](./README.md) for more info
3. Check [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for API details
4. Verify all prerequisites are installed correctly
5. Check backend logs and browser console for error messages

**Development Tips:**
- Use browser DevTools (F12) to debug frontend
- Monitor backend logs in Terminal 1
- Use MongoDB Compass to view database
- Use Postman to test API endpoints manually

---

**Setup completed!** 🎉

You now have a fully functional:
- ✓ Node.js/Express backend with JWT auth and RBAC
- ✓ React frontend with Redux state management
- ✓ MongoDB database with multi-tenant isolation
- ✓ Python FastAPI ML microservice (optional)

Ready for team members to implement their modules!

---

**Last Updated**: February 27, 2026
