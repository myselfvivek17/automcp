# 🚀 AutoMCP v2.0 - Quick Start Guide

## ⚡ Super Fast Setup (2 Minutes!)

### Step 1: Install Dependencies

```bash
# Backend dependencies
cd automcp/backend
pip install fastapi uvicorn pydantic pydantic-settings websockets httpx pyyaml

# Frontend dependencies
cd ../frontend
npm install

# Go back to root
cd ..
```

### Step 2: Configure Environment

```bash
# Copy the simplified .env template
cd backend
cp .env.simple .env
cd ..
```

**That's it!** No database, no Redis, no complex setup needed!

### Step 3: Start the Application

**Windows:**
```bash
# Just double-click start.bat
```

**Mac/Linux:**
```bash
chmod +x start.sh
./start.sh
```

**Or manually:**
```bash
# Terminal 1 - Backend
cd automcp/backend
python -m app.main_simple

# Terminal 2 - Frontend  
cd automcp/frontend
npm run dev
```

### Step 4: Open in Browser

Navigate to: **http://localhost:3000**

---

## 🐛 Troubleshooting

### Issue 1: Backend Import Errors

**Error:**
```
ValidationError: 6 validation errors for Settings
JWT_SECRET Field required
ENCRYPTION_KEY Field required
CLOUDANT_URL Field required
```

**Solution:**
The backend is trying to use the old config. Make sure you're running `main_simple.py`:

```bash
cd automcp/backend
python -m app.main_simple
```

NOT `python -m app.main` (that's the old version)

**Alternative:** If still having issues, create a minimal `.env` file:

```bash
# automcp/backend/.env
APP_NAME=AutoMCP
DEBUG=true
WATSONX_API_KEY=
WATSONX_PROJECT_ID=
WATSONX_URL=https://us-south.ml.cloud.ibm.com
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
CORS_ORIGINS=["http://localhost:3000","http://localhost:3001"]
```

### Issue 2: Frontend Has No Styling (Plain White Page)

**Cause:** Tailwind CSS not compiled or dependencies not installed

**Solution:**

```bash
cd automcp/frontend

# 1. Install all dependencies
npm install

# 2. If that doesn't work, clean install
rm -rf node_modules package-lock.json
npm install

# 3. Restart the dev server
npm run dev
```

**Check:** Make sure these are in `package.json`:
- `tailwindcss`
- `postcss`
- `autoprefixer`

### Issue 3: WebSocket Connection Failed

**Error in browser console:**
```
WebSocket connection to 'ws://localhost:8000/api/v1/generate/stream' failed
```

**Solution:**
1. Make sure backend is running on port 8000
2. Check backend logs for errors
3. Try the synchronous endpoint first (POST /api/v1/generate)

### Issue 4: Monaco Editor Not Loading

**Solution:**
```bash
cd automcp/frontend
npm install @monaco-editor/react monaco-editor
npm run dev
```

### Issue 5: Module Not Found Errors

**Backend:**
```bash
cd automcp/backend
pip install --upgrade fastapi uvicorn pydantic pydantic-settings websockets httpx pyyaml
```

**Frontend:**
```bash
cd automcp/frontend
npm install
```

---

## ✅ Verification Checklist

After starting, verify everything works:

### Backend (http://localhost:8000)

- [ ] Visit http://localhost:8000 - Should see `{"message": "AutoMCP API"}`
- [ ] Visit http://localhost:8000/health - Should see `{"status": "healthy"}`
- [ ] Visit http://localhost:8000/docs - Should see API documentation

### Frontend (http://localhost:3000)

- [ ] Page loads with gradient background (blue to indigo)
- [ ] See "🤖 AutoMCP" title
- [ ] See feature cards with icons
- [ ] Click "Start Generating" button - goes to /generate
- [ ] Generate page has two panels (input/output)
- [ ] Can select input type, language, provider
- [ ] "Load Sample" button works
- [ ] Can enter API specification
- [ ] "Generate MCP Server" button is visible

---

## 🎯 Quick Test

1. Go to http://localhost:3000/generate
2. Click "Load Sample" button
3. Select "Python" as output language
4. Click "🚀 Generate MCP Server"
5. Watch the agents work in real-time!
6. See generated code in Monaco Editor
7. Click "📥 Download" to save the code

---

## 📝 What Files to Use

### Backend Files:

**✅ USE THESE (v2.0 Simplified):**
- `app/main_simple.py` - Main application
- `app/config_simple.py` - Configuration
- `app/api/simple/generation_standalone.py` - Generation API
- `app/api/simple/openapi_parser.py` - OpenAPI parser
- `.env.simple` - Environment template

**❌ DON'T USE THESE (v1.0 Old):**
- `app/main.py` - Old version with database/Redis
- `app/config.py` - Old config requiring database
- `app/api/v1/generation.py` - Old generation API
- `.env.example` - Old environment template

### Frontend Files:

**✅ USE THESE (v2.0 Enhanced):**
- `src/app/page.tsx` - New landing page
- `src/app/generate/page.tsx` - New generation page with Monaco
- `src/app/layout.tsx` - Root layout
- `src/app/globals.css` - Tailwind CSS

---

## 🔑 Optional: Add AI Provider Keys

If you want AI-enhanced generation (optional):

### IBM Watsonx.ai

1. Go to https://cloud.ibm.com/watsonx
2. Create account and project
3. Get API key and Project ID
4. Add to `backend/.env`:
```bash
WATSONX_API_KEY=your-key-here
WATSONX_PROJECT_ID=your-project-id
```

### OpenAI

1. Go to https://platform.openai.com/api-keys
2. Create API key
3. Add to `backend/.env`:
```bash
OPENAI_API_KEY=sk-your-key-here
```

### Anthropic Claude

1. Go to https://console.anthropic.com/
2. Create API key
3. Add to `backend/.env`:
```bash
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### Google Gemini

1. Go to https://makersuite.google.com/app/apikey
2. Create API key
3. Add to `backend/.env`:
```bash
GOOGLE_API_KEY=your-key-here
```

**Remember:** API keys are completely optional! The app works great without them using smart templates.

---

## 📊 What You Get

### Without API Keys (Mock Generation):
- ✅ Works immediately
- ✅ No cost
- ✅ Fast (2-5 seconds)
- ✅ Production-ready code
- ✅ Real-time agent visualization
- ✅ Python and TypeScript support

### With API Keys (AI-Enhanced):
- ✅ Smarter code generation
- ✅ Better error handling
- ✅ More context-aware
- ✅ Custom optimizations
- ⚠️ Costs money (usually cents)
- ⚠️ Slower (5-15 seconds)

---

## 🎓 Usage Examples

### Example 1: Generate from Sample

1. Go to http://localhost:3000/generate
2. Click "Load Sample"
3. Click "Generate MCP Server"
4. Watch agents work!
5. Download your code

### Example 2: Generate from Your OpenAPI Spec

1. Copy your OpenAPI 3.0 spec (JSON or YAML)
2. Select "OpenAPI 3.0" as input type
3. Paste your spec
4. Select output language (Python/TypeScript)
5. Generate!

### Example 3: Generate from Plain Text

1. Select "Plain Text" as input type
2. Describe your API:
```
I have a REST API at https://api.myapp.com
Endpoints:
- GET /users - list users
- POST /users - create user
- GET /users/{id} - get user by ID
- PUT /users/{id} - update user
- DELETE /users/{id} - delete user
```
3. Generate!

---

## 💡 Pro Tips

1. **Start Simple**: Use mock generation first to see how it works
2. **Load Sample**: Click "Load Sample" to see a working example
3. **Watch Agents**: The real-time visualization shows you what's happening
4. **Download Code**: Always download your generated code
5. **Try Both Languages**: Generate in both Python and TypeScript to compare
6. **No API Keys Needed**: The app works great without any API keys!

---

## 🆘 Still Having Issues?

### Check Logs

**Backend logs:**
```bash
cd automcp/backend
python -m app.main_simple
# Watch the console output
```

**Frontend logs:**
- Open browser DevTools (F12)
- Check Console tab for errors
- Check Network tab for failed requests

### Common Solutions

1. **Restart everything:**
```bash
# Stop all terminals (Ctrl+C)
# Start fresh
cd automcp/backend
python -m app.main_simple

# New terminal
cd automcp/frontend
npm run dev
```

2. **Clean install:**
```bash
# Backend
cd automcp/backend
pip uninstall -y fastapi uvicorn pydantic
pip install fastapi uvicorn pydantic pydantic-settings websockets httpx pyyaml

# Frontend
cd automcp/frontend
rm -rf node_modules package-lock.json .next
npm install
npm run dev
```

3. **Check ports:**
```bash
# Make sure ports 3000 and 8000 are free
# Windows:
netstat -ano | findstr :3000
netstat -ano | findstr :8000

# Mac/Linux:
lsof -i :3000
lsof -i :8000
```

---

## 📞 Need Help?

1. Check `README_V2.md` for detailed documentation
2. Check `WHATS_NEW_V2.md` for feature list
3. Check `API_CREDENTIALS_GUIDE_V2.md` for API key setup
4. Review code comments in the source files

---

**Version:** 2.0.0  
**Last Updated:** May 2, 2026  
**Status:** ✅ Ready to Use!

🎉 **Enjoy generating MCP servers!**