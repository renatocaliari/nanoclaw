#!/bin/bash
# NanoClaw Deployment Health Check Script
# Run this after deployment to verify everything is working

set -e

echo "🔍 NanoClaw Health Check"
echo "======================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check function
check() {
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} $1"
  else
    echo -e "${RED}✗${NC} $1"
    return 1
  fi
}

# 1. Check if Docker is installed
echo "1. Checking Docker installation..."
if command -v docker &> /dev/null; then
  check "Docker is installed"
  docker --version
else
  echo -e "${RED}✗ Docker is not installed${NC}"
  exit 1
fi

echo ""

# 2. Check if Docker Compose is available
echo "2. Checking Docker Compose..."
if docker compose version &> /dev/null; then
  check "Docker Compose is available"
  docker compose version
else
  echo -e "${YELLOW}⚠ Docker Compose not found, trying docker-compose...${NC}"
  if command -v docker-compose &> /dev/null; then
    check "Docker Compose (standalone) is available"
    docker-compose --version
  else
    echo -e "${RED}✗ Docker Compose is not installed${NC}"
    exit 1
  fi
fi

echo ""

# 3. Check if NanoClaw container is running
echo "3. Checking NanoClaw container status..."
CONTAINER_STATUS=$(docker ps --filter "name=nanoclaw-main" --format "{{.Status}}")
if [ -n "$CONTAINER_STATUS" ]; then
  check "NanoClaw container is running"
  echo "   Status: $CONTAINER_STATUS"
else
  echo -e "${RED}✗ NanoClaw container is not running${NC}"
  echo -e "${YELLOW}Try: docker compose up -d${NC}"
  exit 1
fi

echo ""

# 4. Check container health
echo "4. Checking container health..."
HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' nanoclaw-main 2>/dev/null || echo "no-healthcheck")
if [ "$HEALTH_STATUS" = "healthy" ]; then
  check "Container is healthy"
elif [ "$HEALTH_STATUS" = "no-healthcheck" ]; then
  echo -e "${YELLOW}⚠ No health check configured${NC}"
else
  echo -e "${YELLOW}⚠ Container health status: $HEALTH_STATUS${NC}"
fi

echo ""

# 5. Check environment variables
echo "5. Checking environment configuration..."
MISSING_VARS=0

# Check critical variables
docker exec nanoclaw-main printenv | grep -q "AI_PROVIDER=zai\|AI_PROVIDER=anthropic\|AI_PROVIDER=openai" || {
  echo -e "${RED}✗ AI_PROVIDER not set or invalid${NC}"
  MISSING_VARS=$((MISSING_VARS + 1))
}

docker exec nanoclaw-main printenv | grep -q "AI_MODEL=" || {
  echo -e "${RED}✗ AI_MODEL not set${NC}"
  MISSING_VARS=$((MISSING_VARS + 1))
}

docker exec nanoclaw-main printenv | grep -q "CHANNEL_TYPE=" || {
  echo -e "${RED}✗ CHANNEL_TYPE not set${NC}"
  MISSING_VARS=$((MISSING_VARS + 1))
}

if [ $MISSING_VARS -eq 0 ]; then
  check "Environment variables are configured"
else
  echo -e "${RED}✗ $MISSING_VARS critical environment variables missing${NC}"
  exit 1
fi

echo ""

# 6. Check API keys (presence only, don't print them)
echo "6. Checking API keys..."
if docker exec nanoclaw-main printenv | grep -q "ZAI_API_KEY=your-\|OPENAI_API_KEY=your-\|TELEGRAM_BOT_TOKEN=your-"; then
  echo -e "${RED}✗ API keys not configured (still set to placeholder values)${NC}"
  echo "Please update .env.production with real API keys"
  exit 1
else
  check "API keys appear to be configured"
fi

echo ""

# 7. Check volumes
echo "7. Checking persistent volumes..."
VOLUMES=$(docker volume ls --filter "name=nanoclaw" --format "{{.Name}}")
VOLUME_COUNT=$(echo "$VOLUMES" | wc -l)
if [ $VOLUME_COUNT -ge 4 ]; then
  check "Persistent volumes created ($VOLUME_COUNT volumes)"
  echo "$VOLUMES" | sed 's/^/   - /'
else
  echo -e "${YELLOW}⚠ Only $VOLUME_COUNT volumes found (expected at least 4)${NC}"
fi

echo ""

# 8. Check logs for errors
echo "8. Checking recent logs for errors..."
ERROR_COUNT=$(docker logs nanoclaw-main --tail 50 2>&1 | grep -i "error\|failed" | wc -l)
if [ $ERROR_COUNT -eq 0 ]; then
  check "No errors in recent logs"
else
  echo -e "${YELLOW}⚠ Found $ERROR_COUNT error(s) in recent logs${NC}"
  echo "Check logs with: docker logs nanoclaw-main --tail 50"
fi

echo ""

# 9. Check for agent containers
echo "9. Checking agent containers..."
AGENT_CONTAINERS=$(docker ps --filter "name=nanoclaw-agent" --format "{{.Names}}" | wc -l)
if [ $AGENT_CONTAINERS -gt 0 ]; then
  echo -e "${GREEN}✓${NC} Found $AGENT_CONTAINERS agent container(s) running"
  docker ps --filter "name=nanoclaw-agent" --format "   - {{.Names}}"
else
  echo -e "${YELLOW}⚠ No agent containers running yet${NC}"
  echo "Agent containers are spawned when messages are received"
fi

echo ""

# 10. Final summary
echo "======================="
echo -e "${GREEN}✓ Basic health check passed!${NC}"
echo ""
echo "Next steps:"
echo "  1. Send a test message to your Telegram bot"
echo "  2. Check logs: docker logs nanoclaw-main -f"
echo "  3. List all containers: docker ps"
echo ""
echo "For detailed verification, see DEPLOYMENT_VERIFICATION.md"
