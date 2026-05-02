#!/bin/bash

# AutoMCP v2.0 Startup Script

echo "🤖 Starting AutoMCP v2.0..."
echo ""

# Check if backend .env exists
if [ ! -f "backend/.env" ]; then
    echo "📝 Creating backend .env file..."
    cp backend/.env.simple backend/.env
    echo "✅ Created backend/.env (you can add API keys later)"
fi

# Check if frontend .env.local exists
if [ ! -f "frontend/.env.local" ]; then
    echo "📝 Creating frontend .env.local file..."
    echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > frontend/.env.local
    echo "✅ Created frontend/.env.local"
fi

echo ""
echo "🚀 Starting Backend (FastAPI)..."
cd backend
python -m app.main_simple &
BACKEND_PID=$!
cd ..

echo "⏳ Waiting for backend to start..."
sleep 3

echo ""
echo "🎨 Starting Frontend (Next.js)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ AutoMCP is running!"
echo ""
echo "📍 Frontend: http://localhost:3000"
echo "📍 Backend:  http://localhost:8000"
echo "📍 API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for Ctrl+C
trap "echo ''; echo '🛑 Stopping AutoMCP...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait

# Made with Bob
