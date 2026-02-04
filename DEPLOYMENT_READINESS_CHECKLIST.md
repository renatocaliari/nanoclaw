# NanoClaw Dokploy Deployment Readiness Checklist

## ✅ Pre-Deployment Status

### Build Status
- [x] **GitHub Actions CI/CD**: Successfully building and pushing container images
  - Latest build: Commit `1c10fef` (Completed successfully ✅)
  - Container image: `ghcr.io/renatocaliari/nanoclaw-agent:latest`
  - Published: 3 minutes ago
  - Image digest: `sha256:9b6aec36a86ce9ea768870470ef270a576c3df9a5ed7cd20603e6c4a2526664c`

### Configuration Files
- [x] `docker-compose.yml`: Updated to use pre-built images from ghcr.io
- [x] `.env.production.example`: Complete environment template
- [x] `Dockerfile.app`: Multi-stage build for main application
- [x] `container/Dockerfile`: Agent container build configuration

---

## 🚀 Deployment Checklist

### Step 1: Prerequisites
Before deploying to Dokploy, ensure you have:

- [ ] **Dokploy Access**: Dokploy instance running and accessible
- [ ] **Dokploy Credentials**: Username and password for Dokploy web interface
- [ ] **Docker Registry Access**: GitHub Container Registry (ghcr.io) accessible from Dokploy server
- [ ] **GitHub Token** (if private): Personal Access Token for pulling from ghcr.io (public repo, should work without token)

### Step 2: API Keys Required

You need to obtain API keys from these providers BEFORE deployment:

#### AI Provider Keys (Choose Primary + Optional Backup)
- [ ] **z.ai API Key** (PRIMARY - Required)
  - Get from: https://platform.z.ai
  - Purpose: Main AI provider (GLM-4.7 model)
  - Environment variable: `ZAI_API_KEY`

- [ ] **Anthropic API Key** (OPTIONAL - Backup provider)
  - Get from: https://console.anthropic.com
  - Purpose: Claude models (Claude 3.5 Sonnet, Haiku, Opus)
  - Environment variable: `ANTHROPIC_API_KEY`

- [ ] **OpenAI API Key** (OPTIONAL - Backup provider)
  - Get from: https://platform.openai.com/api-keys
  - Purpose: GPT models (GPT-4, GPT-3.5)
  - Environment variable: `OPENAI_API_KEY`

> **Note**: Vector embeddings now use **Transformers.js (100% free, local)** - no API key needed!

#### Channel Keys

Choose ONE or BOTH channels:

- [ ] **WhatsApp Configuration** (if using WhatsApp)
  - WhatsApp Business API credentials
  - Environment variables:
    - `WHATSAPP_API_KEY`
    - `WHATSAPP_API_URL`
    - `WHATSAPP_RECIPIENT_PHONE`

- [ ] **Telegram Configuration** (if using Telegram)
  - Bot token from BotFather
  - Environment variable: `TELEGRAM_BOT_TOKEN`
  - Get token: https://t.me/botfather

### Step 3: Dokploy Configuration

#### Create New Project
- [ ] Log in to Dokploy web interface
- [ ] Create new project → Name: `nanoclaw`
- [ ] Select project type: **Docker Compose**
- [ ] Paste contents of `docker-compose.yml`

#### Configure Environment Variables
- [ ] Copy all variables from `.env.production.example`
- [ ] Replace placeholder values with actual API keys
- [ ] Set `CONTAINER_IMAGE=ghcr.io/renatocaliari/nanoclaw-agent:latest`
- [ ] Configure channel type: `CHANNEL_TYPE=whatsapp` or `telegram` or `both`

#### Verify Volume Mounts
- [ ] Confirm Docker socket mount: `/var/run/docker.sock:/var/run/docker.sock`
- [ ] Confirm persistent volumes:
  - `nanoclaw-groups:/app/groups`
  - `nanoclaw-data:/app/data`
  - `nanoclaw-store:/app/store`
  - `nanoclaw-vector-db:/app/vector-db`
  - `nanoclaw-logs:/app/logs`

### Step 4: Deployment Verification

#### Initial Deployment
- [ ] Click "Deploy" in Dokploy
- [ ] Wait for images to pull (may take 2-5 minutes)
- [ ] Check that `nanoclaw-main` container starts successfully

#### Verify Container Health
Run these commands in Dokploy terminal or SSH:

```bash
# Check running containers
docker ps | grep nanoclaw

# Expected output:
# nanoclaw-main (running)

# Check container logs
docker logs nanoclaw-main

# Should see:
# - "Connected to WhatsApp" or "Connected to Telegram"
# - "Agent container runtime: docker"
# - No error messages
```

#### Verify Agent Container Spawning
- [ ] Send a message to your WhatsApp/Telegram channel
- [ ] Check that agent container is spawned:

```bash
docker ps | grep nanoclaw-agent

# Should see new container appear:
# nanoclaw-agent-<random-id> (running)
```

#### Test AI Response
- [ ] Send test message: `@Andy hello`
- [ ] Verify response received
- [ ] Check logs for successful AI call

### Step 5: Post-Deployment Testing

#### Test Multi-Provider AI
- [ ] Test z.ai provider (default):
  - Ensure `AI_PROVIDER=zai`
  - Verify responses work

- [ ] (Optional) Test Anthropic:
  - Change `AI_PROVIDER=anthropic`
  - Redeploy
  - Verify responses work

- [ ] (Optional) Test OpenAI:
  - Change `AI_PROVIDER=openai`
  - Redeploy
  - Verify responses work

#### Test LanceDB Vector Memory
- [ ] Send multiple messages with information
- [ ] Ask agent to recall previous information
- [ ] Verify vector DB is created: Check `/app/vector-db` volume

#### Test Multi-Container Isolation
- [ ] Create multiple conversations/groups
- [ ] Verify each gets its own container
- [ ] Verify containers are isolated (different memory/context)

#### Test Scheduled Tasks
- [ ] Create a scheduled task from main channel
- [ ] Verify task executes at scheduled time
- [ ] Check logs for task execution

---

## 📊 Monitoring & Maintenance

### Health Checks
Monitor these metrics:

- **Container Status**: `docker ps | grep nanoclaw`
- **Logs**: `docker logs nanoclaw-main -f`
- **Disk Usage**: `docker system df`
- **Vector DB Size**: Check `/app/vector-db` directory

### Common Issues

#### Issue: Container fails to start
**Symptoms**: `docker ps` shows no nanoclaw containers

**Solutions**:
1. Check logs: `docker logs nanoclaw-main`
2. Verify environment variables are set correctly
3. Verify API keys are valid
4. Check Docker socket mount: `/var/run/docker.sock`

#### Issue: Agent containers not spawning
**Symptoms**: Main container runs, but no agent containers appear

**Solutions**:
1. Check `CONTAINER_RUNTIME=docker` is set
2. Verify `CONTAINER_IMAGE` points to valid image
3. Check Docker socket is accessible from container
4. Check logs for spawn errors

#### Issue: AI provider not responding
**Symptoms**: Messages sent but no response

**Solutions**:
1. Check API key is valid
2. Check `AI_PROVIDER` and `AI_MODEL` are set correctly
3. Check network connectivity from Dokploy server
4. Try different AI provider

#### Issue: LanceDB connection errors
**Symptoms**: Vector search not working, warnings in logs

**Solutions**:
1. LanceDB falls back to KNOWLEDGE.md only (non-fatal)
2. Check `VECTOR_DB_PATH` is writable
3. Check volume mount for `/app/vector-db`
4. Verify embeddings API key (OpenAI)

---

## 🔄 Updating Deployment

### How to Update

When new changes are pushed to `main`:

1. **GitHub Actions** automatically builds new agent container image
2. **Tagged** as `sha-<commit-sha>` and `latest`
3. **Pull new image** in Dokploy:

```bash
# In Dokploy terminal
docker pull ghcr.io/renatocaliari/nanoclaw-agent:latest

# Restart containers
docker-compose down
docker-compose up -d
```

### Rollback

If new version has issues:

```bash
# Pull previous version
docker pull ghcr.io/renatocaliari/nanoclaw-agent:sha-<previous-commit>

# Update CONTAINER_IMAGE in .env.production
# Redeploy
```

---

## ✅ Ready to Deploy?

### Final Checklist

Before clicking "Deploy" in Dokploy:

- [ ] All API keys obtained and configured
- [ ] Channel credentials configured (WhatsApp and/or Telegram)
- [ ] `CONTAINER_IMAGE` set to `ghcr.io/renatocaliari/nanoclaw-agent:latest`
- [ ] Environment variables copied from `.env.production.example`
- [ ] Docker socket mount configured in docker-compose.yml
- [ ] Volume mounts configured
- [ ] Dokploy project created with Docker Compose type

### If all checked, you're ready to deploy! 🚀

Follow the detailed deployment guide: `docs/DOKPLOY_STEP_BY_STEP.md`

---

## 📞 Support

If you encounter issues:

1. Check logs: `docker logs nanoclaw-main -f`
2. Review troubleshooting guide: `docs/TROUBLESHOOTING.md`
3. Check GitHub Issues: https://github.com/renatocaliari/nanoclaw/issues
4. Create new issue with logs and error messages
