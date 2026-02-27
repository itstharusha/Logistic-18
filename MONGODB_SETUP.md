# MongoDB Setup Guide

## Prerequisites

Your backend needs MongoDB running. Choose ONE of the three options below:

---

## Option 1: MongoDB Atlas (Cloud) - RECOMMENDED for Development

MongoDB Atlas offers a free tier perfect for development.

### Steps:
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster (select "Free" tier)
4. Click "Connect" and get your connection string
5. Update `backend/.env`:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/logistic18?retryWrites=true&w=majority
```

Replace `username:password` with your Atlas credentials.

---

## Option 2: Docker (Recommended for Local Development)

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop) installed.

### Steps:
1. Install Docker Desktop
2. From the root directory, run:

```bash
docker-compose up -d
```

3. Update `backend/.env`:

```env
MONGODB_URI=mongodb://admin:password@localhost:27017/logistic18?authSource=admin
```

4. MongoDB runs on `localhost:27017`
5. Mongo Express (web UI) runs on `http://localhost:8081`

### Stop MongoDB:
```bash
docker-compose down
```

---

## Option 3: Local MongoDB Installation

### Windows - Install MongoDB Community Edition:
1. Download from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
2. Install with default settings
3. MongoDB runs automatically on `localhost:27017`
4. Update `backend/.env`:

```env
MONGODB_URI=mongodb://localhost:27017/logistic18
```

### Verify Installation:
```bash
mongosh
```

---

## Next Steps

Once MongoDB is running:

1. **Seed the database** (create demo users):
```bash
cd backend
node seed.js
```

2. **Start the backend**:
```bash
cd backend
npm run dev
```

3. **Start the frontend** (new terminal):
```bash
cd frontend
npm run dev
```

4. **Login with demo credentials**:
   - Email: `admin@demo.org`
   - Password: `AdminPass123!`

---

## Connection Troubleshooting

### "ECONNREFUSED 127.0.0.1:27017"
→ MongoDB is not running. Start it using Option 1, 2, or 3 above.

### "Invalid connection string"
→ Check your MONGODB_URI in `.env` - verify syntax and credentials.

### "Authentication failed"
→ For MongoDB Atlas, ensure username/password are URL-encoded if they contain special characters.

---

## Demo Credentials

After running `node seed.js`:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@demo.org | AdminPass123! |
| Analyst | analyst@demo.org | AnalystPass123! |
| Operator | operator@demo.org | OperatorPass123! |
| Inventory Manager | inventory@demo.org | InventoryPass123! |
| Viewer | viewer@demo.org | ViewerPass123! |
