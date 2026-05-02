# AutoMCP Setup Instructions

## Prerequisites

- Python 3.11+
- Node.js 18+
- Git
- IBM Cloud account (for Cloudant and watsonx.ai)

## Quick Setup

### 1. Backend Setup

```powershell
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\activate

# Install dependencies (currently running in Terminal 3)
pip install -r requirements.txt

# Copy environment file
copy .env.example .env

# Edit .env with your credentials
notepad .env
```

### 2. Frontend Setup

**PowerShell Execution Policy Issue Fix:**

If you get "running scripts is disabled" error, run PowerShell as Administrator and execute:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then proceed with frontend setup:

```powershell
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Copy environment file
copy .env.example .env.local

# Edit .env.local with your settings
notepad .env.local
```

### 3. Environment Configuration

#### Backend (.env)

Required variables:
```env
# Security
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
ENCRYPTION_KEY=your-32-byte-encryption-key-change-this

# IBM Cloudant
CLOUDANT_URL=https://your-account.cloudant.com
CLOUDANT_USERNAME=your-username
CLOUDANT_PASSWORD=your-password

# IBM watsonx.ai
WATSONX_API_KEY=your-watsonx-api-key
WATSONX_PROJECT_ID=your-project-id

# Redis (if not using Docker)
REDIS_HOST=localhost
REDIS_PORT=6379
```

#### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

## Running the Application

### Option 1: Using Docker (Recommended)

```powershell
# From project root
docker-compose up -d
```

Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Option 2: Manual Start

**Terminal 1 - Backend:**
```powershell
cd backend
.\venv\Scripts\activate
uvicorn app.main:app --reload
```

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run dev
```

**Terminal 3 - Redis (if not using Docker):**
```powershell
# Install Redis for Windows or use Docker
docker run -d -p 6379:6379 redis:7-alpine
```

## Verification

### Backend Health Check
```powershell
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "environment": "development"
}
```

### Frontend
Open http://localhost:3000 in your browser

## Troubleshooting

### Backend Issues

**ModuleNotFoundError:**
- Ensure virtual environment is activated
- Run `pip install -r requirements.txt` again

**Database Connection Error:**
- Verify Cloudant credentials in .env
- Check network connectivity to IBM Cloud

**Redis Connection Error:**
- Ensure Redis is running (Docker or local)
- Check REDIS_HOST and REDIS_PORT in .env

### Frontend Issues

**'next' is not recognized:**
- Run `npm install` in frontend directory
- Check Node.js version: `node --version` (should be 18+)

**Module not found errors:**
- Delete node_modules and package-lock.json
- Run `npm install` again

**Port already in use:**
- Change port in package.json: `"dev": "next dev -p 3001"`

### PowerShell Execution Policy

If you can't run npm commands:

1. Open PowerShell as Administrator
2. Run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
3. Confirm with 'Y'
4. Close and reopen PowerShell

## Development Workflow

1. **Start Backend**: `cd backend && uvicorn app.main:app --reload`
2. **Start Frontend**: `cd frontend && npm run dev`
3. **Make Changes**: Edit files, hot reload will update automatically
4. **Test**: Backend at http://localhost:8000/docs, Frontend at http://localhost:3000
5. **Commit**: `git add . && git commit -m "Your message"`

## Next Steps

After successful setup:

1. Review [`BUILD_STATUS.md`](BUILD_STATUS.md) for current progress
2. Check [`automcp-planning/`](../automcp-planning/) for detailed documentation
3. Start implementing Phase 2: Core Backend Infrastructure
4. Use Impeccable skill for frontend development (see [`automcp-planning/IMPECCABLE_FRONTEND_INTEGRATION.md`](../automcp-planning/IMPECCABLE_FRONTEND_INTEGRATION.md))

## Getting Help

- **Build Status**: See [`BUILD_STATUS.md`](BUILD_STATUS.md)
- **Architecture**: See [`automcp-planning/AUTOMCP_ARCHITECTURE.md`](../automcp-planning/AUTOMCP_ARCHITECTURE.md)
- **Implementation**: See [`automcp-planning/IMPLEMENTATION_GUIDE.md`](../automcp-planning/IMPLEMENTATION_GUIDE.md)
- **Security**: See [`automcp-planning/SECURITY_IMPLEMENTATION.md`](../automcp-planning/SECURITY_IMPLEMENTATION.md)

## Current Status

✅ **Backend dependencies**: Installing (Terminal 3)  
⚠️ **Frontend dependencies**: Needs PowerShell execution policy fix  
📝 **Configuration**: .env files need to be created and configured  
🚀 **Ready to run**: After dependencies install and configuration

---

**Note**: Backend pip install is currently running in Terminal 3. Wait for it to complete before starting the backend server.