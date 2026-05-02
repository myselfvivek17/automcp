# AutoMCP - Automatic MCP Server Generator

AutoMCP is a production-ready web application that automatically generates Model Context Protocol (MCP) server code from API specifications, eliminating manual MCP server development for AI agent integration.

## 🚀 Features

- **4 Input Methods**: Documentation URLs, OpenAPI/Swagger specs, Manual entry, Natural language
- **Multi-Agent Pipeline**: 9 specialized agents for intelligent code generation
- **Multiple Languages**: Python and TypeScript output
- **Provider Agnostic**: Support for IBM watsonx.ai, OpenAI, Anthropic, Google Gemini
- **Real-Time Visualization**: Live agent pipeline execution streaming
- **Production Ready**: Security, testing, deployment, and monitoring built-in

## 📁 Project Structure

```
automcp/
├── backend/           # FastAPI backend with agent system
├── frontend/          # Next.js 14 frontend with real-time UI
├── shared/            # Shared types and utilities
├── docs/              # Documentation
├── scripts/           # Build and deployment scripts
└── docker/            # Docker configurations
```

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Agent System**: Custom multi-agent orchestration
- **Database**: IBM Cloudant
- **AI Providers**: IBM watsonx.ai, OpenAI, Anthropic, Google Gemini
- **WebSocket**: FastAPI WebSocket support

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui + Radix UI
- **State Management**: Zustand
- **Code Editor**: Monaco Editor
- **Real-Time**: Socket.io-client

## 🚦 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- Python 3.11+
- Docker (optional)
- IBM Cloud account (for Cloudant and watsonx.ai)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd automcp
```

2. Install backend dependencies:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. Install frontend dependencies:
```bash
cd frontend
npm install
```

4. Set up environment variables:
```bash
# Backend (.env)
cp backend/.env.example backend/.env
# Edit backend/.env with your credentials

# Frontend (.env.local)
cp frontend/.env.example frontend/.env.local
# Edit frontend/.env.local with your settings
```

5. Start development servers:
```bash
# Terminal 1 - Backend
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend
npm run dev
```

6. Open http://localhost:3000 in your browser

## 📖 Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [API Documentation](docs/API.md)
- [Agent System Guide](docs/AGENTS.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Security Guide](docs/SECURITY.md)

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

## 🚀 Deployment

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment instructions for IBM Cloud Code Engine.

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- IBM watsonx.ai for AI capabilities
- Model Context Protocol (MCP) specification
- Open source community

## 📞 Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/your-org/automcp/issues)
- Documentation: [docs/](docs/)
- Email: support@automcp.dev

---

Built with ❤️ for the AI agent community