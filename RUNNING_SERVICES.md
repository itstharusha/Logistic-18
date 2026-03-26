# 🚀 Quick Start Guide - Run Everything with One Command

## Option 1: Using npm (Recommended)
From the root directory, run:

```bash
npm run dev
```

This will start **both** services simultaneously:
- **Backend**: http://localhost:5000
- **Frontend**: http://localhost:5174

## Option 2: Using Convenience Scripts

### Windows
Double-click `start.bat` or run:
```bash
.\start.bat
```

### Mac/Linux
Run:
```bash
chmod +x start.sh
./start.sh
```

## Available npm Commands

```bash
# Start both frontend and backend
npm run dev

# Start only backend
npm run dev:backend

# Start only frontend
npm run dev:frontend

# Install all dependencies (backend, frontend, root)
npm install:all

# Build frontend for production
npm run build

# Build backend
npm run build:backend

# Start backend in production
npm start
```

## Services Ports

| Service | Port | URL |
|---------|------|-----|
| Backend (Node/Express) | 5000 | http://localhost:5000 |
| Frontend (React/Vite) | 5174 | http://localhost:5174 |
| MongoDB | 27017 | (local) |

## Requirements Before Running

1. ✅ Node.js installed (v18+)
2. ✅ MongoDB running (local or Atlas)
3. ✅ All dependencies installed (`npm run install:all`)
4. ✅ Backend `.env` configured with:
   - `MONGODB_URI`
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`
   - `CORS_ORIGIN=http://localhost:5174`

## Troubleshooting

**Q: Port already in use?**
- Kill process on port 5000: `lsof -ti:5000 | xargs kill -9` (Mac/Linux) or use Task Manager (Windows)
- Kill process on port 5174: `lsof -ti:5174 | xargs kill -9` (Mac/Linux)

**Q: CORS error?**
- Ensure `.env` has `CORS_ORIGIN=http://localhost:5174`
- Restart backend

**Q: concurrently not found?**
- Run: `npm install` from the root directory

---

**That's it!** You now have both services running with a single command. 🎉
