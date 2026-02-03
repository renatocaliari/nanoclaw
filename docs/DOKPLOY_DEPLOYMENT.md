# Deploying NanoClaw on Dokploy

This guide will walk you through deploying NanoClaw on Dokploy using Docker Compose.

## Prerequisites

1. **Dokploy server** with Docker Compose support
2. **Git repository** with your NanoClaw code (GitHub, GitLab, etc.)
3. **API keys** for your chosen AI provider(s)
4. **WhatsApp** or **Telegram** credentials (for channel setup)

## Quick Start

### Step 1: Prepare Your Repository

Ensure your repository has:

- `docker-compose.yml` ✅ (included)
- `Dockerfile.app` ✅ (included)
- `.env.production.example` ✅ (included)
- `container/Dockerfile` ✅ (included - for agent containers)

### Step 2: Build Agent Container Image

Before deploying, you need to build the agent container image and push it to a registry.

**Option A: Build locally and push to registry**

```bash
# Build the agent container
docker build -t nanoclaw-agent:latest -f container/Dockerfile container/

# Tag for your registry (example: Docker Hub)
docker tag nanoclaw-agent:latest your-username/nanoclaw-agent:latest

# Push to registry
docker push your-username/nanoclaw-agent:latest

# Update .env.production with your image
# CONTAINER_IMAGE=your-username/nanoclaw-agent:latest
```

**Option B: Use Dokploy's build system**

If your registry is set up in Dokploy, you can build directly there.

### Step 3: Configure Environment Variables

1. Copy `.env.production.example` to `.env.production`
2. Fill in the required API keys:

```bash
# Required
ZAI_API_KEY=your-actual-key
OPENAI_API_KEY=your-actual-key-for-embeddings
EMBEDDINGS_API_KEY=your-actual-key

# Optional (for testing other providers)
ANTHROPIC_API_KEY=your-actual-key
OPENAI_API_KEY=your-actual-key
TELEGRAM_BOT_TOKEN=your-actual-token
```

**Important:** Do NOT commit `.env.production` to your repository. Add it to `.gitignore`.

### Step 4: Deploy on Dokploy

#### Method A: Via Dokploy UI

1. **Log in to Dokploy**
2. **Create a new application**:
   - Click "New Application"
   - Select "Docker Compose" as type
   - Connect your Git repository
3. **Configure the application**:
   - Branch: `main` (or your branch)
   - Build context: `/`
   - Docker Compose path: `docker-compose.yml`
4. **Add environment variables**:
   - Either upload `.env.production`
   - Or add variables manually in the UI
5. **Deploy**:
   - Click "Deploy"
   - Wait for the build to complete
   - Check logs for any errors

#### Method B: Via Git + Dokploy CLI

If you have Dokploy CLI set up:

```bash
# Deploy to Dokploy
dokploy deploy nanoclaw --compose docker-compose.yml --env .env.production
```

### Step 5: Verify Deployment

After deployment, check the logs:

```bash
# Via Dokploy UI: Click "Logs" tab
# Or via CLI:
dokploy logs nanoclaw --follow
```

Look for:

- `Connected to WhatsApp` (for WhatsApp)
- `Bot started` (for Telegram)
- `Container runtime: docker`
- No critical errors

## Post-Deployment Setup

### WhatsApp Authentication

If using WhatsApp, you'll need to authenticate:

1. **Check logs** for QR code or pairing code
2. **Open WhatsApp** on your phone
3. **Scan QR code** or **enter pairing code**
4. **Wait for confirmation** in logs

### Telegram Bot Setup

If using Telegram:

1. **Create a bot** via @BotFather
2. **Copy the bot token** to `.env.production`
3. **Set the bot webhook** (if required):
   ```bash
   curl -F "url=https://your-domain.com/webhook" \
     https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
   ```

### Configure Main Channel

After authentication, configure your main channel:

1. **Send a message** to your bot/self-chat
2. **Register the group** if prompted
3. **Edit KNOWLEDGE.md**:
   ```bash
   # Via Dokploy file editor or SSH
   vi /app/groups/main/KNOWLEDGE.md
   ```

## Managing Your Deployment

### Updating NanoClaw

1. **Push changes** to your Git repository
2. **Trigger redeploy** in Dokploy:
   - Click "Redeploy" button
   - Or use CLI: `dokploy redeploy nanoclaw`

### Viewing Logs

```bash
# Via Dokploy UI: Logs tab
# Via CLI:
dokploy logs nanoclaw --tail 100 --follow
```

### Accessing Shell (for troubleshooting)

```bash
# Via Dokploy CLI
dokploy exec nanoclaw -- /bin/bash

# Inside container
ls -la /app/groups
cat /app/logs/nanoclaw.log
```

### Backing Up Data

Important data is stored in Docker volumes:

```bash
# List volumes
docker volume ls | grep nanoclaw

# Backup volumes
docker run --rm -v nanoclaw-groups:/data -v $(pwd):/backup \
  alpine tar czf /backup/nanoclaw-groups-backup.tar.gz /data

# Repeat for: nanoclaw-data, nanoclaw-store, nanoclaw-vector-db
```

## Troubleshooting

### Container Won't Start

**Check logs:**

```bash
dokploy logs nanoclaw
```

**Common issues:**

- Missing API keys → Check `.env.production`
- Volume permission errors → Restart container
- Docker socket not accessible → Check socket mount in `docker-compose.yml`

### Agent Containers Fail

**Symptoms:** Messages not processed, timeouts

**Solutions:**

1. **Verify agent image exists:**

   ```bash
   docker images | grep nanoclaw-agent
   ```

2. **Check container runtime:**

   ```bash
   dokploy exec nanoclaw -- docker ps
   ```

3. **Increase timeout:**
   ```bash
   # In .env.production
   CONTAINER_TIMEOUT=180000
   ```

### WhatsApp Connection Issues

**Symptoms:** Frequent disconnects, auth errors

**Solutions:**

1. **Check auth state persistence:**

   ```bash
   dokploy exec nanoclaw -- ls -la /app/store
   ```

2. **Restart and re-authenticate:**
   - Delete `/app/store/baileys_auth_info`
   - Restart container
   - Re-scan QR code

### Memory Issues

**Symptoms:** Container crashes, high memory usage

**Solutions:**

1. **Increase memory limit** in `docker-compose.yml`:

   ```yaml
   deploy:
     resources:
       limits:
         memory: 4G
   ```

2. **Reduce AI context window**:
   ```bash
   # In .env.production
   AI_MAX_TOKENS=2048
   ```

## Monitoring

### Health Checks

The app includes a health check. Verify it's working:

```bash
dokploy ps nanoclaw
# Look for "healthy" status
```

### Resource Usage

```bash
dokploy stats nanoclaw
```

### Log Analysis

```bash
# Check for errors
dokploy logs nanoclaw | grep -i error

# Count messages processed
dokploy logs nanoclaw | grep "Processing message" | wc -l
```

## Security Best Practices

1. **Never commit API keys** to Git
2. **Use secrets management** in Dokploy (if available)
3. **Rotate API keys** regularly
4. **Limit container permissions** (non-root user)
5. **Keep dependencies updated**:
   ```bash
   npm audit
   npm audit fix
   ```
6. **Monitor logs** for suspicious activity
7. **Back up volumes** regularly

## Scaling Considerations

Current architecture: Single main app + dynamic agent containers

**To scale:**

1. **Run multiple instances** (not recommended - each instance needs unique auth)
2. **Increase resources** (memory, CPU)
3. **Optimize agent container** spawn rate
4. **Use a message queue** (future enhancement)

## Support

For issues or questions:

1. Check logs first
2. Review this guide
3. Check GitHub issues
4. Ask Claude Code: `/debug nanoclaw`

## Updating This Guide

This guide should be updated when:

- New Dokploy features are added
- Deployment process changes
- New troubleshooting steps are discovered
- Security best practices evolve
