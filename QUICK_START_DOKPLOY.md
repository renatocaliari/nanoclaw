# Quick Start Guide - Deploy NanoClaw to Dokploy

This guide will help you deploy NanoClaw to Dokploy in 10 minutes.

## Prerequisites

1. **Dokploy instance** running and accessible
2. **GitHub Container Registry** access (public, no auth needed)
3. **API Keys** from providers listed below

---

## Step 1: Get Your API Keys (5 minutes)

### Required Keys

#### 1. z.ai API Key (Primary AI Provider)
- Visit: https://platform.z.ai
- Sign up/login
- Create API key
- **Keep this safe** - you'll need it for deployment

#### 2. OpenAI API Key (For Vector Embeddings)
- Visit: https://platform.openai.com/api-keys
- Create API key
- **Keep this safe** - needed for LanceDB vector memory

#### 3. Telegram Bot Token (For Telegram Channel)
- Open Telegram
- Search for `@BotFather`
- Send `/newbot`
- Follow instructions
- Copy the bot token
- **Keep this safe** - needed for Telegram integration

> **Note**: WhatsApp credentials are optional. You can use Telegram only.

---

## Step 2: Create Dokploy Project (2 minutes)

1. **Log in to Dokploy** web interface
2. **Create new project**:
   - Click "New Project"
   - Name: `nanoclaw`
   - Type: **Docker Compose**
   - Click "Create"

3. **Paste docker-compose.yml**:
   - Copy entire contents of `docker-compose.yml` from this repository
   - Paste into Dokploy's Compose editor
   - Click "Save"

---

## Step 3: Configure Environment Variables (3 minutes)

1. **Open Environment Variables** in Dokploy
2. **Copy these settings** (replace `your-xxx-here` with actual values):

```bash
# ============================================================================
# CHANNEL CONFIGURATION
# ============================================================================
CHANNEL_TYPE=telegram
TELEGRAM_BOT_TOKEN=your-telegram-bot-token-here

# ============================================================================
# AI PROVIDER CONFIGURATION
# ============================================================================
AI_PROVIDER=zai
AI_MODEL=glm-4.7
ZAI_API_KEY=your-zai-api-key-here
ZAI_BASE_URL=https://api.z.ai/api/coding/paas/v4

# ============================================================================
# EMBEDDINGS (for vector memory)
# ============================================================================
EMBEDDINGS_API_KEY=your-openai-api-key-here
EMBEDDINGS_PROVIDER=openai

# ============================================================================
# MEMORY CONFIGURATION
# ============================================================================
KNOWLEDGE_FILE_PATH=groups/main/KNOWLEDGE.md
VECTOR_DB_PATH=/app/vector-db

# ============================================================================
# AGENT CONFIGURATION
# ============================================================================
AI_TEMPERATURE=0.7
AI_MAX_TOKENS=4096
ASSISTANT_NAME=Andy
TRIGGER_PATTERN=@Andy

# ============================================================================
# SYSTEM CONFIGURATION (Docker paths - do not change)
# ============================================================================
LOG_LEVEL=info
DATA_DIR=/app/data
STORE_DIR=/app/store
GROUPS_DIR=/app/groups

# ============================================================================
# CONTAINER CONFIGURATION
# ============================================================================
CONTAINER_RUNTIME=docker
CONTAINER_IMAGE=ghcr.io/renatocaliari/nanoclaw-agent:latest

# ============================================================================
# SCHEDULER CONFIGURATION
# ============================================================================
TIMEZONE=America/Sao_Paulo
POLL_INTERVAL=2000
IPC_POLL_INTERVAL=1000

# ============================================================================
# DEVELOPMENT/DEBUGGING (DISABLE IN PRODUCTION)
# ============================================================================
DEBUG=false
SKIP_CONTAINER_CHECK=false
```

3. **Important: Replace these placeholders**:
   - `your-telegram-bot-token-here` → Your actual Telegram bot token
   - `your-zai-api-key-here` → Your actual z.ai API key
   - `your-openai-api-key-here` → Your actual OpenAI API key

4. **Click "Save"**

---

## Step 4: Deploy (1 minute)

1. **Click "Deploy"** in Dokploy
2. **Wait** (may take 2-5 minutes for first pull)
3. **Watch logs** in Dokploy terminal

You should see:
```
✓ Pulled image: ghcr.io/renatocaliari/nanoclaw-agent:latest
✓ Started container: nanoclaw-main
✓ Connected to Telegram
✓ Ready to receive messages
```

---

## Step 5: Test Your Deployment (1 minute)

1. **Open Telegram**
2. **Find your bot** (search for the bot name you created)
3. **Send a message**:
   ```
   @Andy hello, can you hear me?
   ```

4. **You should receive a response** from the AI assistant

---

## Step 6: Verify It's Working

Run these commands in Dokploy terminal:

```bash
# Check main container is running
docker ps | grep nanoclaw-main

# Check logs (should show connected to Telegram)
docker logs nanoclaw-main

# Check if agent container spawned after your message
docker ps | grep nanoclaw-agent
```

Expected output:
```
# Main container
nanoclaw-main   ... Up

# Agent container (after sending message)
nanoclaw-agent-abc123   ... Up
```

---

## Troubleshooting

### Problem: Container not starting
**Solution**: Check environment variables are set correctly

### Problem: No response from bot
**Solution**:
1. Check API keys are valid
2. Check `docker logs nanoclaw-main` for errors
3. Verify `TELEGRAM_BOT_TOKEN` is correct

### Problem: Agent containers not spawning
**Solution**:
1. Verify Docker socket mount in docker-compose.yml
2. Check `CONTAINER_RUNTIME=docker` is set
3. Check logs for spawn errors

---

## Next Steps

Your NanoClaw is now running! Here's what you can do:

### Try Different AI Providers

Change `AI_PROVIDER` in environment variables:
- `zai` (default, GLM-4.7)
- `anthropic` (Claude 3.5 Sonnet) - requires `ANTHROPIC_API_KEY`
- `openai` (GPT-4) - requires `OPENAI_API_KEY`

Redeploy after changing.

### Add WhatsApp Channel

Add these to environment variables:
```bash
CHANNEL_TYPE=both
WHATSAPP_API_KEY=your-whatsapp-key
WHATSAPP_API_URL=your-whatsapp-url
WHATSAPP_RECIPIENT_PHONE=1234567890
```

### Create Scheduled Tasks

From your main Telegram chat:
```
@Andy send me a weather update every day at 8am
```

### Check Vector Memory

After several conversations:
```bash
# Check vector DB was created
docker exec -it nanoclaw-main ls -la /app/vector-db
```

---

## Advanced Configuration

See full documentation:
- **Deployment Guide**: `docs/DOKPLOY_STEP_BY_STEP.md`
- **Deployment Checklist**: `DEPLOYMENT_READINESS_CHECKLIST.md`
- **Troubleshooting**: `docs/TROUBLESHOOTING.md`
- **Architecture**: `IMPLEMENTATION_SUMMARY.md`

---

## Support

If you encounter issues:
1. Check logs: `docker logs nanoclaw-main -f`
2. Review troubleshooting guide
3. Check GitHub Issues: https://github.com/renatocaliari/nanoclaw/issues
4. Create new issue with logs and error messages

---

**You're all set! 🎉**

Your NanoClaw assistant is now running on Dokploy with:
- ✅ Multi-provider AI support (z.ai, Anthropic, OpenAI)
- ✅ Telegram channel integration
- ✅ LanceDB vector memory
- ✅ Multi-container security isolation
- ✅ Automatic CI/CD from GitHub Actions
