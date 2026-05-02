# API Credentials Guide - AutoMCP v2.0 (Simplified)

**Important:** AutoMCP v2.0 works **WITHOUT any API keys** using smart templates and mock responses. API keys are **completely optional** and only needed if you want AI-enhanced code generation.

---

## 🎯 Quick Start (No Credentials Needed!)

AutoMCP v2.0 is designed to work immediately without any setup:

1. **No Database** - No Cloudant needed
2. **No Redis** - No caching service needed
3. **No Authentication** - No JWT or user accounts
4. **No API Keys Required** - Works with mock generation

Just run the app and start generating MCP code!

---

## 🤖 Optional: AI Provider API Keys

If you want **AI-enhanced code generation**, you can optionally add API keys for these providers:

### Option 1: IBM Watsonx.ai (Recommended)

**Why Watsonx?**
- Granite models optimized for code generation
- Enterprise-grade reliability
- Good for structured output

**How to Get:**
1. Go to https://cloud.ibm.com/watsonx
2. Sign up for IBM Cloud (free tier available)
3. Create a Watsonx.ai project
4. Get your API key and Project ID

**Add to `.env`:**
```bash
WATSONX_API_KEY=your-api-key-here
WATSONX_PROJECT_ID=your-project-id-here
WATSONX_URL=https://us-south.ml.cloud.ibm.com
```

### Option 2: OpenAI (Popular)

**Why OpenAI?**
- GPT-4 for high-quality code
- Well-documented API
- Fast response times

**How to Get:**
1. Go to https://platform.openai.com/api-keys
2. Sign up for OpenAI account
3. Create an API key

**Add to `.env`:**
```bash
OPENAI_API_KEY=sk-your-key-here
```

### Option 3: Anthropic Claude (Advanced)

**Why Claude?**
- Excellent at following instructions
- Good for complex code generation
- Strong reasoning capabilities

**How to Get:**
1. Go to https://console.anthropic.com/
2. Sign up for Anthropic account
3. Create an API key

**Add to `.env`:**
```bash
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### Option 4: Google Gemini (Free Tier)

**Why Gemini?**
- Free tier available
- Fast inference
- Good for experimentation

**How to Get:**
1. Go to https://makersuite.google.com/app/apikey
2. Sign in with Google account
3. Create an API key

**Add to `.env`:**
```bash
GOOGLE_API_KEY=your-key-here
```

---

## 📝 Configuration Steps

### Step 1: Copy Environment File

```bash
cd automcp/backend
cp .env.simple .env
```

### Step 2: Edit `.env` File

Open `backend/.env` in any text editor:

```bash
# Simplified AutoMCP Configuration

# App Settings (leave as is)
APP_NAME=AutoMCP
DEBUG=true

# AI Provider API Keys (OPTIONAL - add only if you want AI enhancement)
WATSONX_API_KEY=
WATSONX_PROJECT_ID=
WATSONX_URL=https://us-south.ml.cloud.ibm.com

OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=

# CORS Origins (leave as is)
CORS_ORIGINS=["http://localhost:3000","http://localhost:3001"]
```

### Step 3: Add Your Keys (Optional)

**If you want AI enhancement**, add your keys:

```bash
# Example with Watsonx
WATSONX_API_KEY=abc123xyz789
WATSONX_PROJECT_ID=project-456

# Or with OpenAI
OPENAI_API_KEY=sk-proj-abc123xyz789

# Or leave empty to use mock generation
WATSONX_API_KEY=
OPENAI_API_KEY=
```

### Step 4: Start the App

```bash
# Windows
start.bat

# Mac/Linux
./start.sh
```

---

## 🎨 Using API Keys in the UI

When generating code, you can:

1. **Leave API Key field empty** - Uses mock generation (works great!)
2. **Enter API key in UI** - Uses AI for that generation only
3. **Set in .env file** - Uses AI for all generations

### In the UI:

1. Go to http://localhost:3000/generate
2. Configure your input (OpenAPI, Swagger, or text)
3. **Optional:** Enter API key in the "API Key" field
4. Select provider (Watsonx, OpenAI, Claude, Gemini)
5. Click "Generate MCP Server"

---

## 💡 Mock Generation vs AI Generation

### Mock Generation (No API Key)
- ✅ Works immediately
- ✅ No cost
- ✅ Fast (2-5 seconds)
- ✅ Good quality templates
- ✅ Production-ready code
- ⚠️ Uses predefined patterns

### AI-Enhanced Generation (With API Key)
- ✅ Smarter code generation
- ✅ Better error handling
- ✅ More context-aware
- ✅ Custom optimizations
- ⚠️ Costs money (usually cents per generation)
- ⚠️ Slower (5-15 seconds)

**Recommendation:** Start with mock generation. It works great! Add AI keys later if you want enhancements.

---

## 🔒 Security Notes

### v2.0 Simplified Security:

1. **No Encryption** - API keys stored in plain text in `.env`
2. **Local Only** - For personal use on your machine
3. **Not for Production** - Don't deploy with API keys in `.env`
4. **Git Ignore** - `.env` is in `.gitignore` (don't commit it!)

### Best Practices:

- ✅ Keep `.env` file local
- ✅ Don't commit `.env` to Git
- ✅ Use environment variables for deployment
- ✅ Rotate API keys periodically
- ❌ Don't share your `.env` file
- ❌ Don't hardcode keys in code

---

## 🐛 Troubleshooting

### "Module not found" errors

```bash
# Install Python dependencies
cd backend
pip install fastapi uvicorn pydantic pydantic-settings websockets httpx pyyaml

# Optional: Install AI provider SDKs
pip install ibm-watsonx-ai  # For Watsonx
pip install openai          # For OpenAI
pip install anthropic       # For Anthropic
```

### "API key invalid" errors

1. Check your API key is correct
2. Ensure no extra spaces in `.env`
3. Restart the backend server
4. Try entering key in UI instead

### "Generation failed" errors

1. Check backend logs for details
2. Try without API key (mock generation)
3. Verify API key has credits/quota
4. Check internet connection

### Backend won't start

```bash
# Check if .env exists
ls backend/.env

# If not, create it
cp backend/.env.simple backend/.env

# Check Python version
python --version  # Should be 3.11+

# Install dependencies
pip install -r backend/requirements.txt
```

---

## 📊 Cost Estimates (If Using AI)

### IBM Watsonx.ai
- **Free Tier:** Limited requests per month
- **Paid:** ~$0.01-0.05 per generation
- **Best for:** Enterprise use

### OpenAI
- **GPT-3.5:** ~$0.002 per generation
- **GPT-4:** ~$0.03 per generation
- **Best for:** High quality code

### Anthropic Claude
- **Claude 3 Haiku:** ~$0.001 per generation
- **Claude 3 Sonnet:** ~$0.015 per generation
- **Best for:** Complex logic

### Google Gemini
- **Free Tier:** 60 requests per minute
- **Paid:** ~$0.001 per generation
- **Best for:** Experimentation

**Note:** Costs are approximate and vary by usage. Mock generation is always free!

---

## 🎯 Recommended Setup

### For Learning/Testing:
```bash
# No API keys needed!
# Just run the app and use mock generation
```

### For Personal Projects:
```bash
# Add one provider (cheapest option)
GOOGLE_API_KEY=your-key-here
# or
OPENAI_API_KEY=your-key-here
```

### For Production Use:
```bash
# Use environment variables, not .env file
# Set up proper secrets management
# Consider IBM Watsonx for enterprise
```

---

## 📞 Getting Help

### API Key Issues:
1. Check provider documentation
2. Verify account has credits
3. Try mock generation first
4. Check backend logs

### General Issues:
1. Read README_V2.md
2. Check WHATS_NEW_V2.md
3. Review code comments
4. Try without API keys

---

## 🎉 Summary

**AutoMCP v2.0 is designed to work WITHOUT any credentials!**

- ✅ No database setup
- ✅ No Redis installation
- ✅ No authentication config
- ✅ No API keys required
- ✅ Just run and use!

**API keys are optional** and only needed if you want AI-enhanced generation. The mock generation works great for most use cases!

---

**Version:** 2.0.0  
**Last Updated:** May 2, 2026  
**Status:** ✅ Simplified for Personal Use