# Multi-stage Docker build for Chunker Web Server

# Stage 1: Build the CLI
FROM gradle:8-jdk17 AS cli-builder
WORKDIR /build
COPY . .
RUN gradle :cli:build -x test

# Stage 2: Build the UI
FROM node:18 AS ui-builder
WORKDIR /build
COPY app/ui/package*.json ./
RUN npm ci
COPY app/ui/ ./
RUN npm run build

# Stage 3: Runtime
FROM node:18-slim

# Install Java runtime
RUN apt-get update && \
    apt-get install -y openjdk-17-jre-headless && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy web server
COPY app/web/package*.json ./
RUN npm ci --only=production

COPY app/web/src ./src

# Copy built UI
COPY --from=ui-builder /build/build ./ui/build

# Copy CLI jar
COPY --from=cli-builder /build/cli/build/libs/chunker-cli.jar ./chunker-cli.jar

# Set environment
ENV PORT=3001
ENV CLI_PATH=/app/chunker-cli.jar
ENV NODE_ENV=production

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start server
CMD ["node", "src/index.js"]
