# NanoClaw Docker Quick Reference

## Common Commands

### Starting and Stopping

```bash
# Start NanoClaw
docker compose up -d

# Stop NanoClaw
docker compose down

# Restart NanoClaw
docker compose restart

# View logs
docker logs nanoclaw-main -f

# View logs with tail
docker logs nanoclaw-main --tail 50
```

### Monitoring

```bash
# Check container status
docker ps

# Check all containers (including stopped)
docker ps -a

# Check resource usage
docker stats nanoclaw-main

# Inspect container
docker inspect nanoclaw-main

# Check container health
docker inspect --format='{{.State.Health.Status}}' nanoclaw-main
```

### Logs and Debugging

```bash
# Follow logs in real-time
docker logs nanoclaw-main -f

# Show last 100 lines
docker logs nanoclaw-main --tail 100

# Show logs with timestamps
docker logs nanoclaw-main -t

# Search logs for errors
docker logs nanoclaw-main | grep -i error

# Save logs to file
docker logs nanoclaw-main > nanoclaw-logs.txt
```

### Agent Containers

```bash
# List all agent containers
docker ps --filter "name=nanoclaw-agent"

# View specific agent logs
docker logs <agent-container-name>

# Stop all agent containers
docker stop $(docker ps -q --filter "name=nanoclaw-agent")

# Remove all agent containers
docker rm $(docker ps -aq --filter "name=nanoclaw-agent")
```

### Volume Management

```bash
# List all NanoClaw volumes
docker volume ls | grep nanoclaw

# Inspect a volume
docker volume inspect nanoclaw-groups

# Backup a volume
docker run --rm -v nanoclaw-groups:/data -v $(pwd):/backup alpine tar czf /backup/nanoclaw-groups-backup.tar.gz -C /data .

# Restore a volume
docker run --rm -v nanoclaw-groups:/data -v $(pwd):/backup alpine tar xzf /backup/nanoclaw-groups-backup.tar.gz -C /data
```

### Environment Configuration

```bash
# Edit environment file
nano .env.production

# Recreate container with new environment
docker compose up -d --force-recreate

# Show current environment variables
docker exec nanoclaw-main printenv
```

### Updates and Maintenance

```bash
# Pull latest image
docker pull ghcr.io/renatocaliari/nanoclaw-app:latest

# Recreate with new image
docker compose up -d --force-recreate

# Clean up old images
docker image prune -a

# View disk usage
docker system df
```

### Troubleshooting Commands

```bash
# Check if container is running
docker ps | grep nanoclaw-main

# Enter container shell
docker exec -it nanoclaw-main sh

# Check container processes
docker top nanoclaw-main

# Check container resource usage
docker stats nanoclaw-main --no-stream

# Restart container
docker restart nanoclaw-main

# Full restart (stop, remove, start)
docker compose down
docker compose up -d
```

## Health Check Script

We provide a health check script to verify your deployment:

```bash
# Make script executable
chmod +x scripts/health-check.sh

# Run health check
./scripts/health-check.sh
```

This will check:
- Docker installation
- Container status
- Environment variables
- API key configuration
- Volume setup
- Recent logs for errors
- Agent container status

## Common Issues and Solutions

### Container won't start

```bash
# Check logs
docker logs nanoclaw-main

# Common causes:
# 1. Missing environment variables -> Check .env.production
# 2. Invalid API keys -> Update keys in .env.production
# 3. Docker socket not accessible -> Check /var/run/docker.sock mount
```

### Agent containers not spawning

```bash
# Check if Docker socket is accessible
docker exec nanoclaw-main ls -la /var/run/docker.sock

# Check CONTAINER_IMAGE variable
docker exec nanoclaw-main printenv | grep CONTAINER_IMAGE

# Manually test agent container
docker run --rm ghcr.io/renatocaliari/nanoclaw-agent:latest echo "Agent image works"
```

### Telegram bot not responding

```bash
# Check channel configuration
docker exec nanoclaw-main printenv | grep CHANNEL_TYPE

# Check bot token (don't print full token)
docker exec nanoclaw-main printenv | grep TELEGRAM_BOT_TOKEN | cut -c1-20

# Check logs for Telegram errors
docker logs nanoclaw-main | grep -i telegram
```

### High memory usage

```bash
# Check current usage
docker stats nanoclaw-main

# Adjust limits in docker-compose.yml:
# deploy:
#   resources:
#     limits:
#       memory: 4G  # Increase from 2G

# Then restart
docker compose up -d --force-recreate
```

## Backup and Restore

### Full Backup

```bash
# 1. Stop containers
docker compose down

# 2. Backup volumes
docker run --rm -v nanoclaw-groups:/data -v nanoclaw-data:/data2 -v nanoclaw-store:/data3 -v nanoclaw-vector-db:/data4 -v $(pwd):/backup alpine sh -c "cd /data && tar czf /backup/nanoclaw-groups.tar.gz . && cd /data2 && tar czf /backup/nanoclaw-data.tar.gz . && cd /data3 && tar czf /backup/nanoclaw-store.tar.gz . && cd /data4 && tar czf /backup/nanoclaw-vector-db.tar.gz ."

# 3. Restart containers
docker compose up -d
```

### Full Restore

```bash
# 1. Stop containers
docker compose down

# 2. Remove volumes
docker volume rm nanoclaw-groups nanoclaw-data nanoclaw-store nanoclaw-vector-db

# 3. Recreate volumes
docker volume create nanoclaw-groups
docker volume create nanoclaw-data
docker volume create nanoclaw-store
docker volume create nanoclaw-vector-db

# 4. Restore data
docker run --rm -v nanoclaw-groups:/data -v $(pwd):/backup alpine sh -c "cd /data && tar xzf /backup/nanoclaw-groups.tar.gz"
docker run --rm -v nanoclaw-data:/data -v $(pwd):/backup alpine sh -c "cd /data && tar xzf /backup/nanoclaw-data.tar.gz"
docker run --rm -v nanoclaw-store:/data -v $(pwd):/backup alpine sh -c "cd /data && tar xzf /backup/nanoclaw-store.tar.gz"
docker run --rm -v nanoclaw-vector-db:/data -v $(pwd):/backup alpine sh -c "cd /data && tar xzf /backup/nanoclaw-vector-db.tar.gz"

# 5. Restart containers
docker compose up -d
```

## Performance Tuning

### Adjust Resource Limits

Edit `docker-compose.yml`:

```yaml
deploy:
  resources:
    limits:
      cpus: '4.0'      # Increase for more concurrent agents
      memory: 4G       # Increase for more memory-intensive tasks
    reservations:
      cpus: '1.0'
      memory: 1G
```

### Adjust Polling Intervals

Edit `.env.production`:

```bash
# Check for messages less frequently (reduces CPU)
POLL_INTERVAL=5000        # Default: 2000 (2 seconds)

# Check for agent responses less frequently
IPC_POLL_INTERVAL=2000    # Default: 1000 (1 second)
```

## Security Hardening

### Run with Specific User

Add to `docker-compose.yml`:

```yaml
services:
  nanoclaw:
    user: "1000:1000"  # Run as specific UID/GID
```

### Restrict Network Access

```yaml
services:
  nanoclaw:
    networks:
      - nanoclaw-network
    # Remove default network access
    network_mode: none  # Only if you don't need external API access
```

### Read-Only Root Filesystem

```yaml
services:
  nanoclaw:
    read_only: true
    tmpfs:
      - /tmp
      - /app/logs
```

## Monitoring and Alerts

### Simple Monitoring Script

```bash
#!/bin/bash
# save as monitor-nanoclaw.sh

while true; do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' nanoclaw-main 2>/dev/null || echo "unknown")
  if [ "$STATUS" != "healthy" ]; then
    echo "WARNING: NanoClaw container status: $STATUS"
    # Send alert (webhook, email, etc.)
  fi
  sleep 60
done
```

### Log Aggregation

```bash
# Export logs to external service
docker logs nanoclaw-main --tail 0 -f | \
  jq -rc '{log: ., timestamp: now}' | \
  curl -X POST https://your-log-aggregator.com/logs -d @-
```

## Getting Help

If you encounter issues:

1. Check logs: `docker logs nanoclaw-main --tail 100`
2. Run health check: `./scripts/health-check.sh`
3. Review troubleshooting guides in deployment documentation
4. Check GitHub Issues: https://github.com/renatocaliari/nanoclaw/issues
