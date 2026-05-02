# Docker Setup Guide for AutoMCP

## Quick Start with Docker

### Prerequisites
- Docker Desktop installed and running
- Git (for cloning the repository)

### Step 1: Create Environment File

Create a `.env` file in the project root with your credentials:

```bash
# Copy the template
copy .env.docker .env

# Edit with your values
notepad .env
```

Required variables:
```env
DATABASE_URL=https://your-account.cloudant.com
WATSONX_API_KEY=your-watsonx-api-key
WATSONX_PROJECT_ID=your-project-id
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
ENCRYPTION_KEY=your-32-byte-encryption-key-change-this
```

### Step 2: Build and Start Services

```bash
# Build and start all services
docker compose up -d

# View logs
docker compose logs -f

# Check status
docker compose ps
```

### Step 3: Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Redis**: localhost:6379

## Docker Commands

### Starting Services
```bash
# Start all services
docker compose up -d

# Start specific service
docker compose up -d backend
docker compose up -d frontend
docker compose up -d redis
```

### Stopping Services
```bash
# Stop all services
docker compose down

# Stop and remove volumes
docker compose down -v
```

### Viewing Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f redis
```

### Rebuilding After Changes
```bash
# Rebuild all services
docker compose build

# Rebuild specific service
docker compose build backend
docker compose build frontend

# Rebuild and restart
docker compose up -d --build
```

### Accessing Containers
```bash
# Backend shell
docker compose exec backend /bin/bash

# Frontend shell
docker compose exec frontend /bin/sh

# Redis CLI
docker compose exec redis redis-cli
```

## Troubleshooting

### Issue: Environment Variables Not Set

**Error:**
```
The "DATABASE_URL" variable is not set. Defaulting to a blank string.
```

**Solution:**
1. Create `.env` file in project root
2. Copy from `.env.docker` template
3. Fill in your actual credentials

### Issue: Frontend Dockerfile Not Found

**Error:**
```
failed to read dockerfile: open Dockerfile: no such file or directory
```

**Solution:**
Frontend Dockerfile has been created at `frontend/Dockerfile`. Rebuild:
```bash
docker compose build frontend
docker compose up -d
```

### Issue: Port Already in Use

**Error:**
```
Bind for 0.0.0.0:3000 failed: port is already allocated
```

**Solution:**
Change ports in `docker-compose.yml`:
```yaml
frontend:
  ports:
    - "3001:3000"  # Change 3001 to any available port
```

### Issue: Backend Won't Start

**Check logs:**
```bash
docker compose logs backend
```

**Common causes:**
1. Missing environment variables
2. Database connection failed
3. Redis not accessible

**Solution:**
1. Verify `.env` file exists and has correct values
2. Check Cloudant credentials
3. Ensure Redis container is running: `docker compose ps`

### Issue: Frontend Build Fails

**Error:**
```
npm ERR! code ELIFECYCLE
```

**Solution:**
1. Check `frontend/package.json` is valid
2. Rebuild with no cache:
   ```bash
   docker compose build --no-cache frontend
   ```

## Development Workflow with Docker

### 1. Code Changes

For development with hot reload, mount volumes:

```yaml
# Add to docker-compose.yml under backend service
volumes:
  - ./backend:/app
  - /app/venv  # Exclude venv

# Add to docker-compose.yml under frontend service
volumes:
  - ./frontend:/app
  - /app/node_modules  # Exclude node_modules
  - /app/.next  # Exclude .next
```

### 2. Database Migrations

```bash
# Access backend container
docker compose exec backend /bin/bash

# Run migrations (when implemented)
python -m alembic upgrade head
```

### 3. Running Tests

```bash
# Backend tests
docker compose exec backend pytest

# Frontend tests
docker compose exec frontend npm test
```

### 4. Viewing Application Logs

```bash
# Real-time logs
docker compose logs -f backend frontend

# Last 100 lines
docker compose logs --tail=100 backend
```

## Production Deployment

For production, use separate docker-compose files:

```bash
# Production compose file
docker compose -f docker-compose.prod.yml up -d
```

Key differences for production:
- Remove volume mounts
- Use production environment variables
- Enable health checks
- Configure resource limits
- Use secrets management
- Enable HTTPS

## Cleanup

### Remove All Containers and Volumes
```bash
docker compose down -v
```

### Remove Images
```bash
docker rmi automcp-backend automcp-frontend
```

### Complete Cleanup
```bash
# Stop and remove everything
docker compose down -v --rmi all

# Remove unused Docker resources
docker system prune -a
```

## Next Steps

After Docker setup is complete:

1. **Verify Services**: Check all services are running with `docker compose ps`
2. **Test Backend**: Visit http://localhost:8000/docs
3. **Test Frontend**: Visit http://localhost:3000
4. **Check Logs**: Monitor logs with `docker compose logs -f`
5. **Configure**: Update `.env` with your actual credentials
6. **Develop**: Make changes and they'll hot-reload (if volumes mounted)

## Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [AutoMCP Setup Instructions](SETUP_INSTRUCTIONS.md)
- [AutoMCP Build Status](BUILD_STATUS.md)
- [AutoMCP README](README.md)

---

**Note**: The current Docker setup is for development. For production deployment, see the deployment guide in `automcp-planning/` documentation.