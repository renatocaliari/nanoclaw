# NanoClaw Main Application Container
# Runs the main Node.js app that manages WhatsApp/Telegram and spawns agent containers

FROM node:22-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    docker-cli \
    git \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY groups/ ./groups/

# Build TypeScript
RUN npm run build

# Create data directories
RUN mkdir -p /app/data /app/store /app/groups /app/vector-db /app/logs

# Create non-root user
RUN useradd -m -u 1000 -s /bin/bash node && \
    chown -R node:node /app

# Switch to non-root user
USER node

# Expose health check endpoint (if added in future)
# EXPOSE 3000

# Set working directory
WORKDIR /app

# Start the application
CMD ["node", "dist/index.js"]
