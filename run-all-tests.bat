@echo off
REM Test all services locally (Windows)
REM Usage: run-all-tests.bat

echo.
echo 🧪 Running Logistic 18 Test Suite
echo ==================================

set FAILED=0

REM Backend tests
echo.
echo 📦 Running Backend Tests ^(Jest^)...
cd backend
call npm test
if errorlevel 1 (
  echo ❌ Backend tests failed
  set FAILED=1
) else (
  echo ✅ Backend tests passed
)
cd ..

REM Frontend tests
echo.
echo 🎨 Running Frontend Tests ^(Vitest^)...
cd frontend
call npm test -- --run
if errorlevel 1 (
  echo ❌ Frontend tests failed
  set FAILED=1
) else (
  echo ✅ Frontend tests passed
)
cd ..

REM ML Service tests
echo.
echo 🐍 Running ML Service Tests ^(Pytest^)...
cd ml-service
call pytest
if errorlevel 1 (
  echo ❌ ML service tests failed
  set FAILED=1
) else (
  echo ✅ ML service tests passed
)
cd ..

REM Final report
echo.
echo ==================================
if %FAILED% equ 0 (
  echo ✅ All tests passed!
  exit /b 0
) else (
  echo ❌ Some tests failed
  exit /b 1
)
