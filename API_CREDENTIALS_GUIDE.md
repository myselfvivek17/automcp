# API Credentials Guide for AutoMCP

This guide will help you obtain all the required API keys and credentials to run AutoMCP.

---

## 📋 Required Credentials

### ✅ Required (Core Functionality)
1. **IBM Cloudant** - Database for storing projects and data
2. **IBM watsonx.ai** - Primary AI provider for agent system
3. **JWT Secret** - For authentication (can be generated)
4. **Encryption Key** - For encrypting sensitive data (can be generated)

### 🔧 Optional (Additional AI Providers)
5. **OpenAI** - For GPT models (optional)
6. **Anthropic** - For Claude models (optional)
7. **Google Gemini** - For Gemini models (optional)

---

## 1️⃣ IBM Cloudant (Required)

### What is it?
IBM Cloudant is a NoSQL database service for storing AutoMCP projects, user data, and generated code.

### How to get credentials:

#### Step 1: Create IBM Cloud Account
1. Go to https://cloud.ibm.com/registration
2. Sign up for a free IBM Cloud account
3. Verify your email address

#### Step 2: Create Cloudant Service
1. Log in to IBM Cloud: https://cloud.ibm.com
2. Click **"Create resource"** (top right)
3. Search for **"Cloudant"**
4. Click on **"Cloudant"** service
5. Select:
   - **Plan**: Lite (Free tier - 1GB storage, 20 lookups/sec)
   - **Region**: Choose closest to you (e.g., Dallas, London, Frankfurt)
   - **Service name**: `automcp-cloudant` (or any name)
6. Click **"Create"**

#### Step 3: Get Credentials
1. Go to your Cloudant service dashboard
2. Click **"Service credentials"** in left menu
3. Click **"New credential"** button
4. Give it a name: `automcp-credentials`
5. Click **"Add"**
6. Click **"View credentials"** (expand the credential)
7. Copy these values:
   ```json
   {
     "url": "https://xxxxx-bluemix.cloudant.com",
     "username": "xxxxx-bluemix",
     "password": "xxxxxxxxxxxxx"
   }
   ```

#### Step 4: Add to .env
```env
CLOUDANT_URL=https://xxxxx-bluemix.cloudant.com
CLOUDANT_USERNAME=xxxxx-bluemix
CLOUDANT_PASSWORD=xxxxxxxxxxxxx
CLOUDANT_DATABASE=automcp
```

### Free Tier Limits
- **Storage**: 1 GB
- **Throughput**: 20 lookups/sec, 10 writes/sec, 5 queries/sec
- **Cost**: Free forever
- **Sufficient for**: Development and small-scale production

---

## 2️⃣ IBM watsonx.ai (Required)

### What is it?
IBM watsonx.ai provides AI models (like Granite) for the multi-agent generation pipeline.

### How to get credentials:

#### Step 1: Access watsonx.ai
1. Log in to IBM Cloud: https://cloud.ibm.com
2. Go to https://dataplatform.cloud.ibm.com/wx/home
3. Or search for **"watsonx"** in IBM Cloud catalog

#### Step 2: Create a Project
1. Click **"Create a project"**
2. Select **"Create an empty project"**
3. Enter project name: `AutoMCP`
4. Select or create a Cloud Object Storage instance (required)
5. Click **"Create"**

#### Step 3: Get API Key
1. Click your profile icon (top right)
2. Select **"Profile and settings"**
3. Go to **"API keys"** tab
4. Click **"Create"** button
5. Enter name: `automcp-api-key`
6. Click **"Create"**
7. **IMPORTANT**: Copy and save the API key immediately (you can't see it again!)

#### Step 4: Get Project ID
1. Go to your watsonx.ai project
2. Click **"Manage"** tab
3. Copy the **"Project ID"** (under General section)

#### Step 5: Add to .env
```env
WATSONX_API_KEY=your-api-key-here
WATSONX_PROJECT_ID=your-project-id-here
WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_MODEL=ibm/granite-13b-chat-v2
```

### Available Models
- `ibm/granite-13b-chat-v2` - Recommended for AutoMCP
- `ibm/granite-20b-multilingual`
- `meta-llama/llama-2-70b-chat`
- Many more at https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-models.html

### Free Tier
- **Lite plan**: Limited free usage
- **Trial**: 30-day trial with more capacity
- **Pay-as-you-go**: After trial, pay only for what you use

---

## 3️⃣ JWT Secret (Required)

### What is it?
A secret key used to sign and verify JSON Web Tokens for user authentication.

### How to generate:

#### Option 1: Using Python
```python
import secrets
print(secrets.token_urlsafe(32))
```

#### Option 2: Using Node.js
```javascript
console.log(require('crypto').randomBytes(32).toString('base64'))
```

#### Option 3: Using OpenSSL
```bash
openssl rand -base64 32
```

#### Option 4: Online Generator
Go to https://generate-secret.vercel.app/32

### Add to .env
```env
JWT_SECRET=your-generated-secret-here-min-32-characters-long
```

**⚠️ IMPORTANT**: 
- Must be at least 32 characters
- Keep it secret and secure
- Never commit to git
- Use different secrets for dev/staging/production

---

## 4️⃣ Encryption Key (Required)

### What is it?
A key used to encrypt sensitive data like API keys stored in the database.

### How to generate:

#### Option 1: Using Python
```python
from cryptography.fernet import Fernet
print(Fernet.generate_key().decode())
```

#### Option 2: Using OpenSSL
```bash
openssl rand -base64 32
```

### Add to .env
```env
ENCRYPTION_KEY=your-generated-encryption-key-32-bytes-min
```

**⚠️ IMPORTANT**:
- Must be exactly 32 bytes (44 characters in base64)
- Keep it secret and secure
- Never change it after encrypting data (data will be unrecoverable)
- Back it up securely

---

## 5️⃣ OpenAI (Optional)

### What is it?
Access to GPT models (GPT-4, GPT-3.5) as an alternative AI provider.

### How to get API key:

1. Go to https://platform.openai.com/signup
2. Create an account or sign in
3. Go to https://platform.openai.com/api-keys
4. Click **"Create new secret key"**
5. Give it a name: `AutoMCP`
6. Copy the API key immediately

### Add to .env
```env
OPENAI_API_KEY=sk-...your-key-here
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_ORG_ID=  # Optional, leave empty if not using organization
```

### Pricing
- **Free tier**: $5 credit for new accounts (expires after 3 months)
- **Pay-as-you-go**: 
  - GPT-4 Turbo: $0.01/1K input tokens, $0.03/1K output tokens
  - GPT-3.5 Turbo: $0.0005/1K input tokens, $0.0015/1K output tokens

---

## 6️⃣ Anthropic Claude (Optional)

### What is it?
Access to Claude models (Claude 3 Opus, Sonnet, Haiku) as an alternative AI provider.

### How to get API key:

1. Go to https://console.anthropic.com/
2. Sign up for an account
3. Go to https://console.anthropic.com/settings/keys
4. Click **"Create Key"**
5. Give it a name: `AutoMCP`
6. Copy the API key

### Add to .env
```env
ANTHROPIC_API_KEY=sk-ant-...your-key-here
ANTHROPIC_MODEL=claude-3-opus-20240229
```

### Available Models
- `claude-3-opus-20240229` - Most capable
- `claude-3-sonnet-20240229` - Balanced
- `claude-3-haiku-20240307` - Fastest

### Pricing
- **Free tier**: $5 credit for new accounts
- **Pay-as-you-go**:
  - Claude 3 Opus: $15/1M input tokens, $75/1M output tokens
  - Claude 3 Sonnet: $3/1M input tokens, $15/1M output tokens
  - Claude 3 Haiku: $0.25/1M input tokens, $1.25/1M output tokens

---

## 7️⃣ Google Gemini (Optional)

### What is it?
Access to Google's Gemini models as an alternative AI provider.

### How to get API key:

1. Go to https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Click **"Create API key"**
4. Select or create a Google Cloud project
5. Copy the API key

### Add to .env
```env
GOOGLE_API_KEY=AIza...your-key-here
GOOGLE_MODEL=gemini-pro
```

### Available Models
- `gemini-pro` - Text generation
- `gemini-pro-vision` - Multimodal (text + images)

### Pricing
- **Free tier**: 60 requests per minute
- **Pay-as-you-go**: 
  - Gemini Pro: $0.00025/1K characters input, $0.0005/1K characters output

---

## 📝 Complete .env File Example

```env
# Application
ENVIRONMENT=development
DEBUG=true

# Security
JWT_SECRET=your-generated-jwt-secret-min-32-characters-long
ENCRYPTION_KEY=your-generated-encryption-key-32-bytes

# Database - IBM Cloudant (REQUIRED)
CLOUDANT_URL=https://xxxxx-bluemix.cloudant.com
CLOUDANT_USERNAME=xxxxx-bluemix
CLOUDANT_PASSWORD=xxxxxxxxxxxxx
CLOUDANT_DATABASE=automcp

# IBM watsonx.ai (REQUIRED)
WATSONX_API_KEY=your-watsonx-api-key
WATSONX_PROJECT_ID=your-project-id
WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_MODEL=ibm/granite-13b-chat-v2

# Redis (for local development)
REDIS_HOST=localhost
REDIS_PORT=6379

# CORS
ALLOWED_ORIGINS=http://localhost:3000

# Optional AI Providers
OPENAI_API_KEY=sk-...your-key-here
OPENAI_MODEL=gpt-4-turbo-preview

ANTHROPIC_API_KEY=sk-ant-...your-key-here
ANTHROPIC_MODEL=claude-3-opus-20240229

GOOGLE_API_KEY=AIza...your-key-here
GOOGLE_MODEL=gemini-pro
```

---

## 🔒 Security Best Practices

### 1. Never Commit Credentials
- `.env` is in `.gitignore` - never remove it
- Never commit API keys to git
- Use environment variables in production

### 2. Use Different Keys for Each Environment
- Development: Use test/development keys
- Staging: Use separate staging keys
- Production: Use production keys with restricted permissions

### 3. Rotate Keys Regularly
- Change API keys every 90 days
- Immediately rotate if compromised
- Keep old keys for 24 hours during rotation

### 4. Restrict Permissions
- Use least privilege principle
- Create separate API keys for different services
- Set IP restrictions where possible

### 5. Monitor Usage
- Check IBM Cloud dashboard regularly
- Set up billing alerts
- Monitor for unusual activity

---

## 🆘 Troubleshooting

### "Invalid API key" Error
- Check for extra spaces or newlines
- Ensure key hasn't expired
- Verify key has correct permissions

### "Project not found" Error
- Verify Project ID is correct
- Ensure project exists in watsonx.ai
- Check you're using the right IBM Cloud account

### "Database connection failed" Error
- Verify Cloudant URL is correct
- Check username and password
- Ensure Cloudant service is running

### "Rate limit exceeded" Error
- You've hit free tier limits
- Wait for rate limit to reset
- Consider upgrading to paid tier

---

## 💰 Cost Estimation

### Minimal Setup (Free Tier)
- **IBM Cloudant**: Free (Lite plan)
- **IBM watsonx.ai**: Free trial, then pay-as-you-go
- **Total**: $0/month for development

### Production Setup (Estimated)
- **IBM Cloudant**: $0-50/month (depends on usage)
- **IBM watsonx.ai**: $50-200/month (depends on usage)
- **Optional AI providers**: $0-100/month (if used)
- **Total**: $50-350/month

### Tips to Reduce Costs
1. Use free tiers for development
2. Cache AI responses
3. Implement rate limiting
4. Monitor usage regularly
5. Use cheaper models when possible

---

## 📞 Support

### IBM Cloud Support
- Documentation: https://cloud.ibm.com/docs
- Support: https://cloud.ibm.com/unifiedsupport/supportcenter

### watsonx.ai Support
- Documentation: https://dataplatform.cloud.ibm.com/docs/content/wsj/getting-started/welcome-main.html
- Community: https://community.ibm.com/community/user/watsonx/home

### OpenAI Support
- Documentation: https://platform.openai.com/docs
- Help: https://help.openai.com/

### Anthropic Support
- Documentation: https://docs.anthropic.com/
- Support: https://support.anthropic.com/

### Google AI Support
- Documentation: https://ai.google.dev/docs
- Support: https://support.google.com/

---

## ✅ Checklist

Before running AutoMCP, ensure you have:

- [ ] IBM Cloud account created
- [ ] Cloudant service created and credentials obtained
- [ ] watsonx.ai project created and API key obtained
- [ ] JWT secret generated (32+ characters)
- [ ] Encryption key generated (32 bytes)
- [ ] All credentials added to `backend/.env`
- [ ] Redis installed or Docker running
- [ ] (Optional) Additional AI provider keys obtained

---

**Ready to run AutoMCP!** 🚀

After obtaining all credentials, update your `backend/.env` file and start the application:

```bash
# Backend
cd backend
uvicorn app.main:app --reload

# Frontend
cd frontend
npm run dev
```

Access at:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs