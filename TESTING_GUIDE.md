# Testing Guide - Logistic 18

This document explains the automated testing setup for the Logistic 18 system across all services.

## Quick Start

### Run All Tests Locally

```bash
# Backend tests (Node.js/Jest)
cd backend
npm test

# Frontend tests (React/Vitest)
cd ../frontend
npm test

# ML Service tests (Python/Pytest)
cd ../ml-service
pytest
```

---

## 🔧 Backend Testing (Node.js/Jest)

### Setup

Jest and Supertest are already configured in `backend/package.json`.

### Configuration Files

- **jest.config.js** - Jest configuration
- **jest.setup.js** - Test environment setup

### Test Files

All backend tests are in `backend/src/__tests__/`:

```
__tests__/
├── controllers/     # Controller unit tests
├── services/        # Service layer tests
└── routes/          # Integration tests (API endpoints)
  ├── auth.test.js
  └── inventory.test.js
```

### Run Tests

```bash
cd backend

# Run all tests
npm test

# Run specific test file
npm test -- auth.test.js

# Run with coverage
npm test -- --coverage

# Watch mode (re-runs on file changes)
npm test -- --watch
```

### Test Examples

#### Authentication Tests (`auth.test.js`)
- ✅ Register new user
- ✅ Login with credentials
- ✅ Handle invalid passwords
- ✅ Prevent duplicate emails

#### Inventory Tests (`inventory.test.js`)
- ✅ Create, read, update, delete items
- ✅ Validate low stock alerts
- ✅ Check authorization requirements

### Writing New Backend Tests

```javascript
// Example: backend/src/__tests__/routes/suppliers.test.js
const request = require('supertest');
const app = require('../../app.js');

describe('Suppliers API', () => {
  it('should fetch all suppliers', async () => {
    const res = await request(app)
      .get('/api/suppliers')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
```

---

## 🎨 Frontend Testing (React/Vitest)

### Setup

Install testing dependencies:

```bash
cd frontend
npm install
```

This adds:
- **vitest** - Unit/component testing
- **@testing-library/react** - React testing utilities
- **jsdom** - Browser DOM simulation

### Configuration Files

- **vitest.config.js** - Vitest configuration
- **vitest.setup.js** - Test environment setup

### Test Files

All frontend tests are in `frontend/src/__tests__/`:

```
__tests__/
├── components/         # Component tests
│   ├── TopNav.test.jsx
│   └── KPICard.test.jsx
├── pages/             # Page component tests
└── utils/             # Utility/hook tests
    └── ThemeContext.test.jsx
```

### Run Tests

```bash
cd frontend

# Run all tests
npm test

# Run with UI dashboard
npm test:ui

# Generate coverage report
npm test:coverage

# Watch mode
npm test -- --watch
```

### Test Examples

#### Component Tests (`TopNav.test.jsx`)
- ✅ Renders navigation bar
- ✅ Shows admin-only tabs
- ✅ User menu functionality
- ✅ Theme toggle button

#### Hook Tests (`ThemeContext.test.jsx`)
- ✅ Provides default theme
- ✅ Updates localStorage on theme change
- ✅ Persists theme between sessions

### Writing New Frontend Tests

```javascript
// Example: frontend/src/__tests__/components/MyComponent.test.jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MyComponent from '../../components/MyComponent';

describe('MyComponent', () => {
  it('should render with props', () => {
    render(<MyComponent title="Test" />);
    
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

---

## 🐍 ML Service Testing (Python/Pytest)

### Setup

Tests require pytest:

```bash
cd ml-service
pip install pytest pytest-cov
```

### Configuration Files

- **pytest.ini** - Pytest configuration
- Test markers defined: `@pytest.mark.unit`, `@pytest.mark.integration`

### Test Files

All ML service tests are in `ml-service/tests/`:

```
tests/
└── test_ml_service.py
    ├── TestMLServiceBasics     # Service availability
    ├── TestDataValidation      # Data structure validation
    ├── TestRiskCalculations    # Risk scoring logic
    └── TestDataProcessing      # Data pipeline tests
```

### Run Tests

```bash
cd ml-service

# Run all tests
pytest

# Run specific test class
pytest tests/test_ml_service.py::TestRiskCalculations

# Run only unit tests
pytest -m unit

# With coverage report
pytest --cov=./ --cov-report=html
```

### Test Examples

#### Data Validation Tests
- ✅ Supplier data structure
- ✅ Inventory thresholds
- ✅ Shipment status values

#### Risk Calculation Tests
- ✅ Risk score ranges (0-1)
- ✅ Weighted average calculations
- ✅ Anomaly detection thresholds

### Writing New ML Tests

```python
# Example: ml-service/tests/test_model.py
import pytest

def test_model_prediction():
    from main import predict_risk
    
    result = predict_risk({
        'payment_history': 0.95,
        'delivery_rate': 0.92
    })
    
    assert 0 <= result <= 1
```

---

## 🔄 CI/CD Pipeline (GitHub Actions)

Automated testing runs on:
- Every push to `main` or `develop` branch
- Every pull request
- Manual trigger

### Workflow File

Located at `.github/workflows/ci-cd.yml`

### Pipeline Stages

1. **Backend Tests** - Jest + coverage
2. **Frontend Tests** - Build + Vitest
3. **ML Service Tests** - Pytest + coverage
4. **Integration Tests** - Smoke tests against running services
5. **Docker Build** - Build container images (main branch only)
6. **Code Quality** - SonarCloud scan (optional)
7. **Status Check** - Aggregates results

### Viewing Results

- GitHub Actions tab in repository
- Check "Actions" → latest workflow run
- See pass/fail status and coverage reports

---

## 📊 Coverage Reports

### Backend Coverage

After running `npm test`:

```bash
# View HTML report
open coverage/index.html
```

Targets:
- **Branches**: 50%
- **Functions**: 50%
- **Lines**: 50%
- **Statements**: 50%

### Frontend Coverage

After running `npm test:coverage`:

```bash
# View HTML report
open coverage/index.html
```

### ML Service Coverage

After running `pytest --cov`:

```bash
# View HTML report
open htmlcov/index.html
```

---

## 🐛 Debugging Tests

### Backend (Jest)

```bash
# Run single test with detailed output
npm test -- auth.test.js --verbose

# Debug mode (pause at breakpoints)
node --inspect-brk ./node_modules/.bin/jest --runInBand
```

### Frontend (Vitest)

```bash
# UI mode for visual debugging
npm test:ui

# Single test
npm test -- TopNav.test.jsx

# With debugging
npm test -- --inspect-brk
```

### ML Service (Pytest)

```bash
# Verbose output
pytest -vv

# Print statements
pytest -s

# Stop on first failure
pytest -x
```

---

## ✅ Best Practices

### Backend Tests
- ✅ Test both success and failure paths
- ✅ Mock external dependencies (databases, APIs)
- ✅ Use descriptive test names
- ✅ Clean up test data (beforeEach/afterEach)

### Frontend Tests
- ✅ Test user interactions, not implementation
- ✅ Use accessible queries (getByRole, getByLabelText)
- ✅ Mock API calls
- ✅ Test accessibility features

### ML Service Tests
- ✅ Validate data structures
- ✅ Test edge cases (empty data, outliers)
- ✅ Verify output ranges
- ✅ Use fixtures for test data

---

## 🚀 Next Steps

1. **Add more test coverage** - Target increased % coverage
2. **E2E tests** - Add Playwright for full-stack testing
3. **Performance tests** - Measure API response times
4. **Load testing** - Test system under stress
5. **Contract testing** - Verify API contracts between services

---

## 📞 Troubleshooting

### Backend Tests Fail
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm test
```

### Frontend Tests Fail
```bash
# Clear cache and reinstall
rm -rf node_modules .vitest
npm install
npm test
```

### ML Service Tests Fail
```bash
# Reinstall dependencies
pip install --upgrade -r requirements.txt
pytest
```

---

For questions or issues, check the test files themselves - they contain detailed comments!
