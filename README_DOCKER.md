# NanoClaw Dokploy Deployment

Complete Docker Compose setup for deploying NanoClaw on Dokploy.

## Quick Start

```bash
# 1. Clone repository
git clone <your-repo>
cd nanoclaw

# 2. Build agent container image
docker build -t nanoclaw-agent:latest -f container/Dockerfile container/

# 3. Configure environment
cp .env.production.example .env.production
# Edit .env.production and add your API keys

# 4. Deploy to Dokploy
# Follow: docs/DOKPLOY_DEPLOYMENT.md
```

## What's Included

✅ **docker-compose.yml** - Main application stack
✅ **Dockerfile.app** - Main app container
✅ **.env.production.example** - Production environment template
✅ **.dockerignore** - Optimized build context
✅ **docs/DOKPLOY_DEPLOYMENT.md** - Complete deployment guide

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Docker Host                        │
│                                                       │
│  ┌──────────────────────────────────────────────┐  │
│  │  nanoclaw-main (App Container)               │  │
│  │  - Node.js process                           │  │
│  │  - Manages WhatsApp/Telegram                 │  │
│  │  - Spawns agent containers via Docker socket │  │
│  │  - Mounts: /var/run/docker.sock              │  │
│  └──────────────────────────────────────────────┘  │
│                      │                               │
│                      │ docker spawn                  │
│                      ▼                               │
│  ┌──────────────────────────────────────────────┐  │
│  │  nanoclaw-agent (Ephemeral)                  │  │
│  │  - Isolated per-group                        │  │
│  │  - Runs Claude Agent SDK                     │  │
│  │  - Auto-removed after execution              │  │
│  └──────────────────────────────────────────────┘  │
│                                                       │
│  Volumes:                                            │
│  - nanoclaw-groups (group configurations)            │
│  - nanoclaw-data (sessions, IPC)                     │
│  - nanoclaw-store (auth state)                       │
│  - nanoclaw-vector-db (LanceDB)                      │
└─────────────────────────────────────────────────────┘
```

## Features

### Multi-Provider AI Support

- **z.ai** (glm-4.7)
- **Anthropic** (Claude 3.5 Sonnet/Haiku)
- **OpenAI** (GPT-4, GPT-4 Turbo)

### Multi-Channel Support

- **WhatsApp** (via Baileys)
- **Telegram** (via Telegraf)

### Advanced Memory

- **KNOWLEDGE.md** - Critical facts and instructions
- **LanceDB** - Vector database for semantic search

### Security

- Container isolation per group
- Non-root user execution
- Read-only global memory for non-main groups
- Isolated IPC per group

## Environment Variables

See `.env.production.example` for all available variables.

**Required:**

- `ZAI_API_KEY` - Your z.ai API key
- `EMBEDDINGS_API_KEY` - OpenAI API key for embeddings
- `CHANNEL_TYPE` - `whatsapp` or `telegram`

**Optional:**

- `ANTHROPIC_API_KEY` - For Anthropic provider
- `OPENAI_API_KEY` - For OpenAI provider
- `TELEGRAM_BOT_TOKEN` - For Telegram channel

## Deployment Options

### Option 1: Dokploy (Recommended)

See [docs/DOKPLOY_DEPLOYMENT.md](docs/DOKPLOY_DEPLOYMENT.md) for complete guide.

### Option 2: Manual Docker Compose

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Option 3: Docker Swarm

```bash
docker stack deploy -c docker-compose.yml nanoclaw
```

## Volume Management

```bash
# List volumes
docker volume ls | grep nanoclaw

# Backup a volume
docker run --rm -v nanoclaw-groups:/data -v $(pwd):/backup \
  alpine tar czf /backup/nanoclaw-groups-backup.tar.gz /data

# Restore a volume
docker run --rm -v nanoclaw-groups:/data -v $(pwd):/backup \
  alpine tar xzf /backup/nanoclaw-groups-backup.tar.gz -C /
```

## Troubleshooting

### Container won't start

```bash
docker-compose logs nanoclaw
```

### Agent containers failing

```bash
# Check if agent image exists
docker images | grep nanoclaw-agent

# Build if missing
docker build -t nanoclaw-agent:latest -f container/Dockerfile container/
```

### Permission errors

```bash
# Fix volume permissions
docker-compose exec nanoclaw chown -R node:node /app
```

See [docs/DOKPLOY_DEPLOYMENT.md](docs/DOKPLOY_DEPLOYMENT.md) for more troubleshooting steps.

## Monitoring

### Health Check

```bash
docker-compose ps
# Should show "healthy" status
```

### Resource Usage

```bash
docker stats nanoclaw-main
```

### Logs

```bash
# All logs
docker-compose logs -f

# Errors only
docker-compose logs | grep -i error
```

## Updating

```bash
# Pull latest code
git pull

# Rebuild and redeploy
docker-compose up -d --build
```

## Support

- **Deployment Guide:** [docs/DOKPLOY_DEPLOYMENT.md](docs/DOKPLOY_DEPLOYMENT.md)
- **Main README:** [../README.md](../README.md)
- **Implementation Details:** [../IMPLEMENTATION_SUMMARY.md](../IMPLEMENTATION_SUMMARY.md)

## License

MIT
