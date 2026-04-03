#!/bin/bash
# Test all services locally
# Usage: ./run-all-tests.sh

echo "🧪 Running Logistic 18 Test Suite"
echo "=================================="

FAILED=0

# Backend tests
echo ""
echo "📦 Running Backend Tests (Jest)..."
cd backend
npm test
if [ $? -ne 0 ]; then
  echo "❌ Backend tests failed"
  FAILED=1
else
  echo "✅ Backend tests passed"
fi
cd ..

# Frontend tests
echo ""
echo "🎨 Running Frontend Tests (Vitest)..."
cd frontend
npm test -- --run
if [ $? -ne 0 ]; then
  echo "❌ Frontend tests failed"
  FAILED=1
else
  echo "✅ Frontend tests passed"
fi
cd ..

# ML Service tests
echo ""
echo "🐍 Running ML Service Tests (Pytest)..."
cd ml-service
pytest
if [ $? -ne 0 ]; then
  echo "❌ ML service tests failed"
  FAILED=1
else
  echo "✅ ML service tests passed"
fi
cd ..

# Final report
echo ""
echo "=================================="
if [ $FAILED -eq 0 ]; then
  echo "✅ All tests passed!"
  exit 0
else
  echo "❌ Some tests failed"
  exit 1
fi
