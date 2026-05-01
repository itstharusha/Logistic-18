# Backend Testing Setup Guide

## Quick Start

### 1️⃣ Install Dependencies

```bash
cd backend
npm install
```

### 2️⃣ Set Up MongoDB for Testing

#### Option A: Use MongoDB locally (Recommended for development)

**Windows:**
```bash
# Download and install MongoDB Community Edition
# https://www.mongodb.com/try/download/community

# Start MongoDB service
mongod

# Or if installed as a service:
net start MongoDB
```

**macOS:**
```bash
brew install mongodb-community
brew services start mongodb-community
```

**Linux (Ubuntu):**
```bash
sudo apt-get install -y mongodb
sudo systemctl start mongodb
```

#### Option B: Use Docker

```bash
# Start MongoDB in Docker
docker run -d -p 27017:27017 --name mongodb mongo:7.0

# Stop it when done
docker stop mongodb
```

#### Option C: Use MongoDB Atlas (Cloud)

```bash
# Create a cluster at https://www.mongodb.com/cloud/atlas
# Get connection string and set in .env

MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/logistic18_test
```

### 3️⃣ Configure Environment

Create `.env.test.local` in backend directory:

```bash
cp .env.test .env.test.local
```

Edit `.env.test.local` with your MongoDB URI:
```
MONGODB_URI=mongodb://localhost:27017/logistic18_test
```

### 4️⃣ Run Tests

```bash
# All tests
npm test

# Watch mode (re-run on file changes)
npm test -- --watch

# With coverage
npm test -- --coverage

# Specific test file
npm test -- auth.test.js
```

## Troubleshooting

### Tests Skip with "MongoDB not available"

**Problem:** Tests show warning about database not being available

**Solution:**
1. Verify MongoDB is running: `mongosh` (should connect successfully)
2. Check MONGODB_URI in environment
3. Ensure database is accessible

### "Cannot find module" errors

**Problem:** Tests fail with module import errors

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm test
```

### Tests timeout

**Problem:** Tests hang or timeout

**Solution:**
```bash
# Increase timeout
npm test -- --testTimeout=60000

# Check MongoDB connection
mongosh --eval "db.adminCommand('ping')"
```

### Port already in use

**Problem:** "Port 5001 already in use"

**Solution:**
```bash
# Change port in .env.test.local
PORT=5002

# Or kill existing process
lsof -i :5001
kill -9 <PID>
```

## Test Database Isolation

- Each test run uses a fresh database
- `logistic18_test` database is automatically created
- Collections are cleared between test suites
- Test data is cleaned up after all tests

## Adding New Tests

1. Create test file in `src/__tests__/` with `.test.js` extension
2. Use `connectTestDb()` helper for database tests
3. Follow existing test patterns

Example:
```javascript
import { connectTestDb, disconnectTestDb } from '../helpers/testDb.js';

describe('My Feature', () => {
  let dbConnected = false;

  beforeAll(async () => {
    dbConnected = await connectTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  it('should do something', async () => {
    if (!dbConnected) this.skip();
    
    // Test code here
  });
});
```

## CI/CD Integration

The GitHub Actions workflow automatically:
1. Starts MongoDB service container
2. Sets MONGODB_URI to local container
3. Runs all Jest tests
4. Reports coverage to Codecov

## Files Structure

```
backend/
├── jest.config.js          # Jest configuration
├── jest.setup.js           # Test environment setup
├── .env.test               # Test environment variables
├── src/
│   └── __tests__/
│       ├── helpers/
│       │   └── testDb.js   # Database utilities
│       └── routes/
│           ├── auth.test.js
│           └── inventory.test.js
```

## Performance Tips

1. **Tests skipped gracefully** if MongoDB unavailable
2. **Parallel test execution** - Jest runs tests in parallel by default
3. **Database cleanup** - Automatic between tests
4. **Watch mode** - Only re-runs affected tests

## Next Steps

- Add more test cases for other routes
- Increase code coverage to 80%+
- Add mutation testing (stryker)
- Add E2E tests (Supertest + real scenarios)
