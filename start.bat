@echo off
REM AutoMCP v2.0 Startup Script for Windows

echo 🤖 Starting AutoMCP v2.0...
echo.

REM Check if backend .env exists
if not exist "backend\.env" (
    echo 📝 Creating backend .env file...
    copy "backend\.env.simple" "backend\.env"
    echo ✅ Created backend\.env (you can add API keys later)
)

REM Check if frontend .env.local exists
if not exist "frontend\.env.local" (
    echo 📝 Creating frontend .env.local file...
    echo NEXT_PUBLIC_API_URL=http://localhost:8000 > "frontend\.env.local"
    echo ✅ Created frontend\.env.local
)

echo.
echo 🚀 Starting Backend (FastAPI)...
start "AutoMCP Backend" cmd /k "cd backend && python -m app.main_simple"

echo ⏳ Waiting for backend to start...
timeout /t 3 /nobreak > nul

echo.
echo 🎨 Starting Frontend (Next.js)...
start "AutoMCP Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ✅ AutoMCP is running!
echo.
echo 📍 Frontend: http://localhost:3000
echo 📍 Backend:  http://localhost:8000
echo 📍 API Docs: http://localhost:8000/docs
echo.
echo Press any key to open the application in your browser...
pause > nul

start http://localhost:3000

@REM Made with Bob
