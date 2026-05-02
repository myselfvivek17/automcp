# AutoMCP Windows Setup Script
# Run this script to set up the development environment

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "AutoMCP Setup Script for Windows" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  Warning: Not running as Administrator" -ForegroundColor Yellow
    Write-Host "Some operations may require elevated privileges" -ForegroundColor Yellow
    Write-Host ""
}

# Check Python
Write-Host "Checking Python..." -ForegroundColor Green
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found. Please install Python 3.11+" -ForegroundColor Red
    exit 1
}

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Green
try {
    $nodeVersion = node --version 2>&1
    Write-Host "✅ Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js 18+" -ForegroundColor Red
    exit 1
}

# Check npm
Write-Host "Checking npm..." -ForegroundColor Green
try {
    $npmVersion = npm --version 2>&1
    Write-Host "✅ npm $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not found" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Setting up Backend..." -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

# Backend setup
Set-Location backend

# Create virtual environment if it doesn't exist
if (-not (Test-Path "venv")) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Yellow
    python -m venv venv
    Write-Host "✅ Virtual environment created" -ForegroundColor Green
} else {
    Write-Host "✅ Virtual environment already exists" -ForegroundColor Green
}

# Activate virtual environment and install dependencies
Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
Write-Host "(This may take a few minutes)" -ForegroundColor Gray
& .\venv\Scripts\Activate.ps1
pip install -r requirements.txt

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
}

# Create .env if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "✅ .env file created - Please edit with your credentials" -ForegroundColor Green
} else {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
}

Set-Location ..

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Setting up Frontend..." -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

# Frontend setup
Set-Location frontend

# Check execution policy
$executionPolicy = Get-ExecutionPolicy -Scope CurrentUser
if ($executionPolicy -eq "Restricted") {
    Write-Host "⚠️  PowerShell execution policy is Restricted" -ForegroundColor Yellow
    Write-Host "Attempting to set to RemoteSigned..." -ForegroundColor Yellow
    
    try {
        Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
        Write-Host "✅ Execution policy updated" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to update execution policy" -ForegroundColor Red
        Write-Host "Please run as Administrator: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser" -ForegroundColor Yellow
    }
}

# Install npm dependencies
Write-Host "Installing npm dependencies..." -ForegroundColor Yellow
Write-Host "(This may take a few minutes)" -ForegroundColor Gray
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to install frontend dependencies" -ForegroundColor Red
}

# Create .env.local if it doesn't exist
if (-not (Test-Path ".env.local")) {
    Write-Host "Creating .env.local file..." -ForegroundColor Yellow
    Copy-Item .env.example .env.local
    Write-Host "✅ .env.local file created" -ForegroundColor Green
} else {
    Write-Host "✅ .env.local file already exists" -ForegroundColor Green
}

Set-Location ..

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Green
Write-Host "1. Edit backend/.env with your IBM Cloud credentials" -ForegroundColor White
Write-Host "2. Start backend: cd backend && .\venv\Scripts\Activate.ps1 && uvicorn app.main:app --reload" -ForegroundColor White
Write-Host "3. Start frontend: cd frontend && npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Or use Docker: docker-compose up -d" -ForegroundColor White
Write-Host ""
Write-Host "Access:" -ForegroundColor Green
Write-Host "- Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "- Backend API: http://localhost:8000" -ForegroundColor White
Write-Host "- API Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "For more information, see SETUP_INSTRUCTIONS.md" -ForegroundColor Gray

# Made with Bob
