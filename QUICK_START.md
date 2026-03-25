# ⚡ Logistic 18 - Quick Start (5 Minutes)

For experienced developers who want to get running FAST.

---

## Prerequisites

```bash
node --version    # 16+
npm --version     # 8+
python --version  # 3.9+ (optional)
mongosh --version # or mongod running locally
```

---

## 1. Configure Database (1 min)

### Option A: MongoDB Atlas (Cloud) ✅ RECOMMENDED
- Sign up: https://www.mongodb.com/cloud/atlas
- Create free cluster (M0)
- Get connection string: `mongodb+srv://user:pass@cluster.xyz.mongodb.net/logistic18`

### Option B: Local MongoDB
- Make sure `mongod` is running
- Connection string: `mongodb://localhost:27017/logistic18`

---

## 2. Setup Backend (1 min)

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```env
MONGODB_URI=<your-mongodb-connection-string>
DB_NAME=logistic18
JWT_ACCESS_SECRET=your-random-secret-key-123456789012345
JWT_REFRESH_SECRET=another-random-secret-key-123456789012345
```

```bash
npm install
npm run dev
```

✓ Backend ready: http://localhost:5000/api/health

---

## 3. Setup Frontend (1 min)

```bash
cd ../frontend
cp .env.example .env
npm install
npm run dev
```

✓ Frontend ready: http://localhost:5173

---

## 4. Test Registration

Open http://localhost:5173

Register account:
- Email: test@example.com
- Password: TestPassword123 (needs uppercase, lowercase, number, 8+ chars)
- Org ID: org-001

---

## 5. Login & Explore

Login → See Dashboard with KPI cards

Want to test Users page?
1. Make yourself ORG_ADMIN in MongoDB:
```bash
mongosh logistic18
db.users.updateOne(
  { email: "test@example.com" },
  { $set: { role: "ORG_ADMIN" } }
)
exit
```

2. Refresh browser → Click "Users" in navigation

---

## 🎯 You're Done!

System running with:
- ✓ Authentication (register/login/logout)
- ✓ RBAC (role-based access)
- ✓ User management
- ✓ Audit logging
- ✓ Dashboard

---

## 🆘 Common Issues

| Issue | Fix |
|-------|-----|
| "MongoDB connection failed" | Check MONGODB_URI in .env |
| "Port 5000 in use" | Kill existing process or change PORT in .env |
| "Module not found" | Run `npm install` in that directory |
| "CORS error" | Backend and Frontend not talking - restart backend |
| Can't register user | Check backend logs in Terminal 1 |

---

## 📚 Next: Full Documentation

- Detailed setup: [SETUP_GUIDE.md](./SETUP_GUIDE.md)
- API reference: [README.md](./README.md#api-endpoints)
- Architecture: [README.md](./README.md#authentication-flow)

---

**Done!** 🚀 Start building!
