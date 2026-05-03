# AutoMCP - Quick Start Guide

This guide will help you get AutoMCP up and running quickly for development.

## Prerequisites

- **Python 3.11+** - Backend runtime
- **Node.js 20+** - Frontend runtime
- **Docker & Docker Compose** - For containerized development
- **Git** - Version control
- **IBM Cloud Account** (optional for production) - For watsonx.ai, Cloudant, Code Engine

## Quick Setup (5 minutes)

### Option 1: Docker Compose (Recommended)

```bash
# Clone or create the project
mkdir automcp && cd automcp

# Create docker-compose.yml (see IMPLEMENTATION_GUIDE.md)
# Create .env file
cat > .env << EOF
# Backend
ENVIRONMENT=development
DEBUG=true
LOG_LEVEL=INFO

# AI Providers (add your keys)
WATSONX_API_KEY=your_watsonx_api_key_here
WATSONX_PROJECT_ID=your_project_id_here
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Database (optional for local dev)
CLOUDANT_URL=
CLOUDANT_API_KEY=

# Redis
REDIS_URL=redis://redis:6379

# Security
ENCRYPTION_KEY=$(openssl rand -hex 32)
SECRET_KEY=$(openssl rand -hex 32)
EOF

# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f
```

Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Option 2: Local Development

#### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (same as above)
cp ../.env .env

# Run development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend Setup

```bash
# In a new terminal, navigate to frontend
cd frontend

# Install dependencies
npm install

# Create .env.local
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
EOF

# Run development server
npm run dev
```

## Project Structure Setup

Run this script to create the complete project structure:

```bash
#!/bin/bash

# Create backend structure
mkdir -p backend/app/{agents,api/{routes,websocket},services/{input_processors,providers,code_generation/{templates/{python,typescript}},storage,security},models,utils}
mkdir -p backend/tests/{test_agents,test_services,test_api}

# Create frontend structure
mkdir -p frontend/src/{app/{projects/{[id]},generate,templates},components/{input,visualization,editor,providers,common},hooks,lib,types,styles}
mkdir -p frontend/public

# Create shared types
mkdir -p shared/types

# Create deployment configs
mkdir -p deployment/{ibm-cloud/{code-engine,cloudant},docker,kubernetes}

# Create docs
mkdir -p docs

# Create GitHub workflows
mkdir -p .github/workflows

echo "Project structure created successfully!"
```

## Backend Dependencies

**File: `backend/requirements.txt`**

```txt
# Core Framework
fastapi==0.109.0
uvicorn[standard]==0.27.0
pydantic==2.5.3
pydantic-settings==2.1.0
python-dotenv==1.0.0

# WebSocket
websockets==12.0
python-socketio==5.11.0

# HTTP Client
httpx==0.26.0
aiohttp==3.9.1

# OpenAPI/Swagger
openapi-spec-validator==0.7.1
pyyaml==6.0.1

# AI Providers
openai==1.10.0
anthropic==0.8.1
google-generativeai==0.3.2
ibm-watson-machine-learning==1.0.335

# Database
cloudant==2.15.0
redis==5.0.1
hiredis==2.3.2

# Security
cryptography==42.0.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4

# Parsing & Scraping
beautifulsoup4==4.12.3
lxml==5.1.0
html2text==2020.1.16
markdown==3.5.2

# Utilities
python-multipart==0.0.6
python-json-logger==2.0.7
tenacity==8.2.3

# Testing
pytest==7.4.4
pytest-asyncio==0.23.3
pytest-cov==4.1.0
httpx-mock==0.7.0

# Development
black==24.1.1
flake8==7.0.0
mypy==1.8.0
```

## Frontend Dependencies

**File: `frontend/package.json`**

```json
{
  "name": "automcp-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "dependencies": {
    "next": "14.1.0",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "@monaco-editor/react": "^4.6.0",
    "react-flow-renderer": "^10.3.17",
    "socket.io-client": "^4.6.1",
    "axios": "^1.6.5",
    "zustand": "^4.5.0",
    "react-hot-toast": "^2.4.1",
    "lucide-react": "^0.312.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "@types/node": "20.11.5",
    "@types/react": "18.2.48",
    "@types/react-dom": "18.2.18",
    "typescript": "5.3.3",
    "tailwindcss": "3.4.1",
    "postcss": "8.4.33",
    "autoprefixer": "10.4.17",
    "eslint": "8.56.0",
    "eslint-config-next": "14.1.0",
    "@testing-library/react": "^14.1.2",
    "@testing-library/jest-dom": "^6.2.0",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0"
  }
}
```

## Testing the Setup

### 1. Test Backend Health

```bash
curl http://localhost:8000/api/v1/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-05-01T16:00:00.000Z",
  "environment": "development"
}
```

### 2. Test Frontend

Open http://localhost:3000 in your browser. You should see the AutoMCP landing page.

### 3. Test WebSocket Connection

```javascript
// In browser console
const ws = new WebSocket('ws://localhost:8000/ws/generate/test-session');
ws.onopen = () => console.log('Connected');
ws.onmessage = (event) => console.log('Message:', event.data);
```

## Development Workflow

### 1. Create a New Feature Branch

```bash
git checkout -b feature/agent-pipeline
```

### 2. Make Changes

Edit files in `backend/app/` or `frontend/src/`

### 3. Test Changes

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

### 4. Format Code

```bash
# Backend
black backend/app
flake8 backend/app

# Frontend
npm run lint
```

### 5. Commit and Push

```bash
git add .
git commit -m "feat: implement agent pipeline"
git push origin feature/agent-pipeline
```

## Common Development Tasks

### Add a New Agent

1. Create agent file: `backend/app/agents/my_agent.py`
2. Extend `BaseAgent` class
3. Implement `process()` method
4. Register in orchestrator
5. Add tests in `backend/tests/test_agents/`

### Add a New API Endpoint

1. Create route file: `backend/app/api/routes/my_route.py`
2. Define Pydantic models
3. Implement endpoint logic
4. Register router in `main.py`
5. Add tests in `backend/tests/test_api/`

### Add a New Frontend Component

1. Create component: `frontend/src/components/my_component.tsx`
2. Define TypeScript interfaces
3. Implement component logic
4. Add to appropriate page
5. Add tests in `__tests__/`

### Add a New AI Provider

1. Create provider: `backend/app/services/providers/my_provider.py`
2. Extend `AIProvider` base class
3. Implement required methods
4. Register in provider factory
5. Add configuration in settings
6. Add tests

## Troubleshooting

### Backend won't start

```bash
# Check Python version
python --version  # Should be 3.11+

# Reinstall dependencies
pip install --upgrade -r requirements.txt

# Check environment variables
cat .env

# Check logs
docker-compose logs backend
```

### Frontend won't start

```bash
# Check Node version
node --version  # Should be 20+

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check environment variables
cat .env.local

# Check logs
docker-compose logs frontend
```

### Database connection issues

```bash
# Check Redis
redis-cli ping  # Should return PONG

# Check Cloudant (if configured)
curl -X GET "$CLOUDANT_URL/_all_dbs" \
  -H "Authorization: Bearer $CLOUDANT_API_KEY"
```

### WebSocket connection fails

1. Check CORS settings in `backend/app/main.py`
2. Verify WebSocket URL in frontend
3. Check firewall/proxy settings
4. Test with simple WebSocket client

## Next Steps

1. **Review Architecture**: Read [`AUTOMCP_ARCHITECTURE.md`](AUTOMCP_ARCHITECTURE.md)
2. **Follow Implementation Guide**: See [`IMPLEMENTATION_GUIDE.md`](IMPLEMENTATION_GUIDE.md)
3. **Start with Phase 1**: Set up project structure
4. **Implement MVP**: Focus on OpenAPI input + basic generation
5. **Iterate**: Add features incrementally

## Getting Help

- **Documentation**: Check `docs/` directory
- **API Reference**: http://localhost:8000/docs
- **Issues**: Create GitHub issues for bugs
- **Discussions**: Use GitHub discussions for questions

## Production Deployment

For production deployment to IBM Cloud Code Engine, see:
- [`deployment/ibm-cloud/README.md`](deployment/ibm-cloud/README.md)
- [`AUTOMCP_ARCHITECTURE.md#deployment-architecture`](AUTOMCP_ARCHITECTURE.md#deployment-architecture)

## License

[Your License Here]