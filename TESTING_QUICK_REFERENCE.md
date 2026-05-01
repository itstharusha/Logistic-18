# 🚀 Quick Reference - Testing Setup

## ✅ What's Been Set Up

| Component | Tool | Config | Tests | Status |
|-----------|------|--------|-------|--------|
| Backend | Jest | `jest.config.js` | 15 tests | ✅ Ready |
| Frontend | Vitest | `vite.config.js` | 16 tests | ✅ Ready |
| ML Service | Pytest | `pytest.ini` | 11 tests | ✅ Ready |
| CI/CD | GitHub Actions | `.github/workflows/ci-cd.yml` | Full pipeline | ✅ Ready |

---

## 📦 Installation

### Install Missing Dependencies

```bash
# Frontend (new testing packages)
cd frontend
npm install

# ML Service (Python packages)
cd ../ml-service
pip install pytest pytest-cov
```

### Verify Installation

```bash
# Backend (should already have jest & supertest)
cd backend
npm test -- --version

# Frontend (verify vitest installed)
cd frontend
npm run test:coverage -- --version 2>&1 | head -1

# ML Service (verify pytest)
cd ml-service
pytest --version
```

---

## 🧪 Run Tests

### Quick Commands

```bash
# Run all tests in one service
cd backend && npm test
cd ../frontend && npm test -- --run
cd ../ml-service && pytest

# Run all tests everywhere
bash run-all-tests.sh         # macOS/Linux
run-all-tests.bat             # Windows

# Run with coverage
npm test -- --coverage        # Backend
npm run test:coverage         # Frontend
pytest --cov                  # ML Service
```

### Watch Mode (Development)

```bash
# Backend - re-run on file changes
cd backend && npm test -- --watch

# Frontend - interactive UI
cd frontend && npm run test:ui

# ML Service - re-run on file changes
cd ml-service && pytest -v -s --tb=short
```

---

## 📊 Test Files Location

### Backend
- `backend/src/__tests__/routes/auth.test.js` - 8 tests
- `backend/src/__tests__/routes/inventory.test.js` - 7 tests

### Frontend
- `frontend/src/__tests__/components/TopNav.test.jsx` - 7 tests
- `frontend/src/__tests__/components/KPICard.test.jsx` - 5 tests
- `frontend/src/__tests__/utils/ThemeContext.test.jsx` - 4 tests

### ML Service
- `ml-service/tests/test_ml_service.py` - 11 tests

---

## 🔄 GitHub Actions Pipeline

The workflow at `.github/workflows/ci-cd.yml` runs automatically:

**On Every Push/PR:**
1. Backend tests (Jest) ✅
2. Frontend tests (Vitest) ✅
3. ML service tests (Pytest) ✅
4. Integration tests (Smoke tests) ✅
5. Code quality scan (SonarCloud) 🔧

**On Main Branch:**
6. Docker image build 🐳

---

## 📚 Documentation

Read these files for details:

| File | Purpose |
|------|---------|
| `TESTING_GUIDE.md` | Complete testing guide with examples |
| `TESTING_SETUP.md` | What was set up and why |
| `.github/workflows/ci-cd.yml` | CI/CD pipeline definition |

---

## ✨ Testing Capabilities

✅ **Unit Tests** - Test individual functions/components
✅ **Integration Tests** - Test API endpoints with database
✅ **Component Tests** - Test React components rendering
✅ **E2E Smoke Tests** - Test full system flow
✅ **Coverage Reports** - Track test code coverage
✅ **Parallel Testing** - Run all services simultaneously
✅ **Watch Mode** - Continuous testing during development
✅ **CI/CD Automation** - Automated testing on every push

---

## 🎯 Adding New Tests

### Backend (Jest)
```javascript
// backend/src/__tests__/routes/suppliers.test.js
const request = require('supertest');
const app = require('../../app.js');

describe('Suppliers', () => {
  it('should list all suppliers', async () => {
    const res = await request(app).get('/api/suppliers');
    expect(res.statusCode).toBe(200);
  });
});
```

### Frontend (Vitest)
```javascript
// frontend/src/__tests__/components/NewComponent.test.jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import NewComponent from '../../components/NewComponent';

describe('NewComponent', () => {
  it('renders correctly', () => {
    render(<NewComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

### ML Service (Pytest)
```python
# ml-service/tests/test_predictions.py
def test_risk_prediction():
    from main import calculate_risk
    result = calculate_risk({'score': 0.5})
    assert 0 <= result <= 1
```

---

## 🐛 Troubleshooting

### "module not found" errors

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# For ML service
pip install --upgrade -r requirements.txt
```

### Tests won't run

```bash
# Check Node version (need 18+)
node --version

# Check Python version (need 3.8+)
python --version

# Verify packages installed
npm list jest vitest
pip list | grep pytest
```

### Coverage report not generating

```bash
# Make sure you have coverage tools
npm install --save-dev @vitest/coverage-v8  # Frontend
pip install pytest-cov                      # ML Service
```

---

## 📈 Next Steps

1. **Increase Coverage** - Add more tests to reach 80%+ coverage
2. **Add E2E Tests** - Use Playwright for full-stack testing
3. **Performance Testing** - Add load testing with k6
4. **Contract Tests** - Verify API contracts between services
5. **Configure Metrics** - Set up test dashboards in GitHub

---

## 🔗 Quick Links

- **GitHub Actions:** `https://github.com/yourusername/Logistic-18/actions`
- **Test Files:** `backend/src/__tests__/`, `frontend/src/__tests__/`, `ml-service/tests/`
- **Workflow:** `.github/workflows/ci-cd.yml`

---

## 💡 Pro Tips

| Tip | Command |
|-----|---------|
| Run single test | `npm test -- auth.test.js` |
| Skip slow tests | `npm test -- --testNamePattern="^(?!.*slow)"` |
| Debug mode | `node --inspect-brk ./node_modules/.bin/jest` |
| Update snapshots | `npm test -- --updateSnapshot` |
| Stop on first failure | `npm test -- --bail` |
| Run UI dashboard | `npm run test:ui` |

---

**✅ Your system now has enterprise-grade testing!**

Questions? Check `TESTING_GUIDE.md` or the test files themselves - they have detailed comments!
