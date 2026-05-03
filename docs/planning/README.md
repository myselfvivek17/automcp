# AutoMCP - Automatic MCP Server Generator

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Node](https://img.shields.io/badge/node-20+-green.svg)](https://nodejs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688.svg)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14+-black.svg)](https://nextjs.org/)

**AutoMCP** is a production-ready web application that automatically generates Model Context Protocol (MCP) server code from API specifications, eliminating manual MCP server development for AI agent integration.

## 🚀 Features

### Multi-Input Support
- **OpenAPI/Swagger** - Upload or provide URL to swagger.json/openapi.yaml
- **Documentation URLs** - Crawl and parse API documentation pages
- **Manual Entry** - Add custom REST API endpoints via intuitive forms
- **Natural Language** - Describe APIs in plain English, let AI infer structure

### Multi-Agent Generation Pipeline
- **9 Specialized Agents** working sequentially to transform API specs into production code
- **Real-time Visualization** of agent execution with progress tracking
- **Streaming Updates** showing intermediate outputs and decisions
- **Intelligent Code Generation** with best practices and optimizations

### Multi-Provider AI Support
- **IBM watsonx.ai** (Granite models) - Primary provider
- **OpenAI** (GPT-4, GPT-3.5) - Alternative provider
- **Anthropic** (Claude 3) - Alternative provider
- **Google Gemini** - Alternative provider
- **Custom Endpoints** - Any OpenAI-compatible API

### Production-Ready Output
- **Python & TypeScript** MCP servers with full type safety
- **Middleware Layers** for caching, rate limiting, logging
- **Error Handling** with retry mechanisms and circuit breakers
- **Authentication** support for OAuth, API keys, JWT, Basic auth
- **Testing Suite** with generated test cases
- **Documentation** with README, usage examples, and API guides

### Project Management
- **Save & Version** generated MCP servers
- **Template Library** for popular APIs (Stripe, GitHub, Slack, etc.)
- **Diff Viewer** for comparing versions
- **Export Options** - Standalone files, Docker containers, deployment packages
- **Collaboration** - Share projects with team members

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Architecture](#-architecture)
- [Installation](#-installation)
- [Usage](#-usage)
- [Development](#-development)
- [Deployment](#-deployment)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [License](#-license)

## ⚡ Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- Docker & Docker Compose (recommended)
- IBM Cloud account (optional, for production)

### 5-Minute Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/automcp.git
cd automcp

# Create environment file
cp .env.example .env
# Edit .env and add your AI provider API keys

# Start with Docker Compose
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

For detailed setup instructions, see [QUICK_START.md](QUICK_START.md).

## 🏗️ Architecture

AutoMCP uses a modern, scalable architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Frontend                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Input   │  │  Agent   │  │   Code   │  │ Project  │  │
│  │  Forms   │  │   Viz    │  │  Editor  │  │  Manager │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                    WebSocket + REST API
                            │
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Backend                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Multi-Agent Pipeline                       │  │
│  │  Input → Schema → Mapper → Auth → MCP → Code →     │  │
│  │  Normalizer  Extractor  Analyzer  Translator        │  │
│  │  Generator → Optimizer → Validator → Doc Generator  │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Provider Abstraction Layer                   │  │
│  │  watsonx.ai │ OpenAI │ Anthropic │ Gemini │ Custom  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │ Cloudant │  │  Redis   │  │   Key    │                 │
│  │    DB    │  │  Cache   │  │  Vault   │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

### Multi-Agent Pipeline

Each agent specializes in a specific task:

1. **Input Normalizer** - Standardizes all input formats
2. **Schema Extractor** - Deep analysis of API structure
3. **Endpoint Mapper** - Maps endpoints to MCP tools/resources
4. **Auth Analyzer** - Analyzes authentication flows
5. **MCP Translator** - Translates to MCP protocol
6. **Code Generator** - Generates production code
7. **Optimizer** - Applies best practices
8. **Validator** - Tests and validates code
9. **Doc Generator** - Creates documentation

For detailed architecture, see [AUTOMCP_ARCHITECTURE.md](AUTOMCP_ARCHITECTURE.md).

## 📦 Installation

### Local Development

#### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Docker

```bash
docker-compose up -d
```

### Production (IBM Cloud Code Engine)

```bash
# Configure IBM Cloud CLI
ibmcloud login
ibmcloud target --cf

# Deploy backend
ibmcloud ce application create \
  --name automcp-backend \
  --image icr.io/namespace/automcp-backend:latest \
  --env-from-secret automcp-secrets

# Deploy frontend
ibmcloud ce application create \
  --name automcp-frontend \
  --image icr.io/namespace/automcp-frontend:latest \
  --env NEXT_PUBLIC_API_URL=https://automcp-backend.example.com
```

See [deployment/ibm-cloud/README.md](deployment/ibm-cloud/README.md) for details.

## 🎯 Usage

### 1. Choose Input Method

Navigate to http://localhost:3000/generate and select your input method:

#### OpenAPI/Swagger
```bash
# Upload file or provide URL
https://petstore.swagger.io/v2/swagger.json
```

#### Documentation URL
```bash
# Provide API documentation URL
https://docs.stripe.com/api
```

#### Manual Entry
Fill in the form with:
- Endpoint path: `/users/{id}`
- Method: `GET`
- Parameters: `id` (path, required)
- Response schema: JSON

#### Natural Language
```
Create an MCP server for a weather API that has endpoints to:
- Get current weather by city name
- Get 5-day forecast by coordinates
- Search for cities
Uses API key authentication in the header
```

### 2. Configure Generation

- **Select AI Provider**: watsonx.ai, OpenAI, Anthropic, or Gemini
- **Choose Target Language**: Python or TypeScript
- **Set Options**: Enable caching, rate limiting, logging

### 3. Watch Agent Pipeline

Real-time visualization shows:
- Current agent and its task
- Progress percentage
- Intermediate outputs
- Warnings and suggestions

### 4. Review Generated Code

- View generated MCP server code with syntax highlighting
- Edit code directly in Monaco Editor
- Download as standalone file or Docker container
- Save project for future reference

### 5. Test & Deploy

- Use built-in testing interface
- Validate MCP protocol compliance
- Export deployment package
- Deploy to your infrastructure

## 🛠️ Development

### Project Structure

```
automcp/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── agents/      # Multi-agent pipeline
│   │   ├── api/         # REST & WebSocket routes
│   │   ├── services/    # Business logic
│   │   ├── models/      # Data models
│   │   └── utils/       # Utilities
│   └── tests/           # Backend tests
├── frontend/            # Next.js frontend
│   └── src/
│       ├── app/         # Pages
│       ├── components/  # React components
│       ├── hooks/       # Custom hooks
│       └── lib/         # Utilities
├── shared/              # Shared types
├── deployment/          # Deployment configs
└── docs/               # Documentation
```

### Running Tests

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test

# E2E tests
npm run test:e2e
```

### Code Quality

```bash
# Backend
black backend/app
flake8 backend/app
mypy backend/app

# Frontend
npm run lint
npm run type-check
```

### Adding a New Agent

See [IMPLEMENTATION_GUIDE.md#adding-agents](IMPLEMENTATION_GUIDE.md) for detailed instructions.

## 🚀 Deployment

### Docker

```bash
docker build -t automcp-backend ./backend
docker build -t automcp-frontend ./frontend
docker-compose up -d
```

### Kubernetes

```bash
kubectl apply -f deployment/kubernetes/
```

### IBM Cloud Code Engine

```bash
# See deployment/ibm-cloud/README.md
./deployment/ibm-cloud/deploy.sh
```

## 📚 Documentation

- [Architecture Overview](AUTOMCP_ARCHITECTURE.md) - System design and components
- [Implementation Guide](IMPLEMENTATION_GUIDE.md) - Step-by-step development guide
- [Quick Start](QUICK_START.md) - Get started in 5 minutes
- [API Reference](docs/API.md) - REST API documentation
- [Agent System](docs/AGENTS.md) - Multi-agent pipeline details
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment
- [Development Guide](docs/DEVELOPMENT.md) - Contributing guidelines

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests
5. Run linters and tests
6. Commit your changes (`git commit -m 'feat: add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## 📊 Roadmap

### Phase 1 (Current) - MVP
- ✅ OpenAPI/Swagger input
- ✅ Basic agent pipeline
- ✅ Python code generation
- ✅ watsonx.ai integration

### Phase 2 - Enhanced Features
- 🔄 All input methods
- 🔄 TypeScript generation
- 🔄 Multi-provider support
- 🔄 Project management

### Phase 3 - Production Ready
- ⏳ Testing interface
- ⏳ Template library
- ⏳ Collaboration features
- ⏳ Analytics dashboard

### Phase 4 - Advanced
- ⏳ GraphQL support
- ⏳ gRPC support
- ⏳ Custom middleware marketplace
- ⏳ Visual API designer

## 🔒 Security

- API keys encrypted at rest (AES-256)
- Input sanitization and validation
- Rate limiting and throttling
- Security scanning in CI/CD
- Regular dependency updates

Report security vulnerabilities to security@example.com

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- IBM watsonx.ai team for AI capabilities
- FastAPI and Next.js communities
- OpenAPI Initiative
- Model Context Protocol specification

## 📞 Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/automcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/automcp/discussions)
- **Email**: support@example.com

## 🌟 Star History

If you find AutoMCP useful, please consider giving it a star! ⭐

---

**Built with ❤️ using IBM watsonx.ai, FastAPI, and Next.js**