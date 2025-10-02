# Chunker Web App Deployment Guide

This guide explains how to deploy Chunker as a web application.

## Table of Contents

- [Overview](#overview)
- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Manual Setup](#manual-setup)
- [Docker Deployment](#docker-deployment)
- [Configuration](#configuration)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

## Overview

The Chunker web app allows users to convert Minecraft worlds without installing desktop software. It consists of:

- **React UI** - The browser-based user interface
- **Express Server** - Handles HTTP requests and serves static files
- **WebSocket Server** - Provides real-time communication for conversion progress
- **Java CLI Backend** - Performs the actual world conversion

## Requirements

- **Node.js** 18 or higher
- **Java** 17 or higher
- **Gradle** (included via wrapper)
- At least 2GB of available RAM
- At least 5GB of free disk space (for temporary files)

## Quick Start

The fastest way to get started is using the setup script:

```bash
# From the project root
cd app/web
chmod +x setup.sh
./setup.sh
```

Then start the server:

```bash
npm start
```

Open your browser to `http://localhost:3001`

## Manual Setup

If you prefer to set up manually:

### 1. Build the Chunker CLI

```bash
cd /path/to/Chunker
./gradlew :cli:build -x test
```

This creates `cli/build/libs/chunker-cli-VERSION.jar`

### 2. Build the React UI

```bash
cd app/ui
npm install
npm run build
```

This creates the production build in `app/ui/build/`

### 3. Install Web Server Dependencies

```bash
cd app/web
npm install
```

### 4. Start the Server

```bash
npm start
```

The server will:
- Auto-detect the CLI jar file
- Serve the React UI
- Start the WebSocket server
- Listen on port 3001

## Docker Deployment

### Build the Docker Image

From the project root:

```bash
docker build -f app/web/Dockerfile -t chunker-web .
```

### Run the Container

```bash
docker run -p 3001:3001 chunker-web
```

### With Custom Configuration

```bash
docker run -p 8080:8080 \
  -e PORT=8080 \
  -e JAVA_OPTIONS="-Xmx4G" \
  chunker-web
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  chunker-web:
    build:
      context: .
      dockerfile: app/web/Dockerfile
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
      - JAVA_OPTIONS=-Xmx4G
    restart: unless-stopped
```

Run with:
```bash
docker-compose up -d
```

## Configuration

Configuration is done via environment variables:

### PORT
- **Default:** `3001`
- **Description:** The port the web server listens on
- **Example:** `PORT=8080 npm start`

### CLI_PATH
- **Default:** Auto-detected
- **Description:** Path to the Chunker CLI jar file
- **Example:** `CLI_PATH=/app/chunker-cli.jar npm start`

### JAVA_OPTIONS
- **Default:** Auto-calculated based on available memory
- **Description:** JVM options for the Java backend
- **Example:** `JAVA_OPTIONS="-Xmx8G -Xms2G" npm start`

### Using .env File

Copy the example configuration:
```bash
cp .env.example .env
```

Edit `.env` with your settings:
```
PORT=3001
JAVA_OPTIONS=-Xmx4G
```

## Production Deployment

### Reverse Proxy with Nginx

Example Nginx configuration:

```nginx
server {
    listen 80;
    server_name chunker.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    # Increase timeouts for large file uploads
    client_max_body_size 5G;
    proxy_read_timeout 300s;
    proxy_connect_timeout 75s;
}
```

### Process Manager with PM2

Install PM2:
```bash
npm install -g pm2
```

Start Chunker:
```bash
cd app/web
pm2 start src/index.js --name chunker-web
pm2 save
pm2 startup
```

Monitor:
```bash
pm2 status
pm2 logs chunker-web
```

### SSL/HTTPS

For production, use a reverse proxy (Nginx/Apache) with Let's Encrypt:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d chunker.yourdomain.com
```

### Security Considerations

1. **File Upload Limits**: The default max upload is 5GB. Adjust if needed.
2. **CORS**: The server only accepts connections from the same origin by default.
3. **Rate Limiting**: Consider adding rate limiting for production deployments.
4. **Session Cleanup**: Sessions are automatically cleaned up on completion.
5. **Temp Files**: Temporary files are stored in `/tmp/chunker-web` and removed after conversion.

## Troubleshooting

### Server Won't Start

**Error: "CLI not found"**
- Make sure you've built the CLI: `./gradlew :cli:build`
- Check the CLI_PATH environment variable
- Verify Java is installed: `java -version`

**Error: "Port already in use"**
- Change the port: `PORT=3002 npm start`
- Or kill the process using the port: `lsof -ti:3001 | xargs kill`

### Build Issues

**Error: "Browserslist: caniuse-lite is outdated"**
- This is a warning, not an error. The build will still succeed.
- To fix: `npx update-browserslist-db@latest`

**Error: "npm install fails"**
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json`, then reinstall
- Make sure Node.js version is 18+: `node --version`

### Conversion Issues

**Error: "Out of memory"**
- Increase Java heap size: `JAVA_OPTIONS="-Xmx8G" npm start`
- Close other applications to free up memory

**Error: "Upload fails"**
- Check file size (default limit is 5GB)
- Verify disk space is available
- Check browser console for errors

### WebSocket Connection Issues

**Error: "WebSocket failed to connect"**
- Check firewall settings
- Verify WebSocket support in reverse proxy
- Try disabling browser extensions

### Performance Optimization

1. **Use SSD**: Store temporary files on SSD for better performance
2. **Allocate Memory**: Set `-Xmx` to at least 4GB for large worlds
3. **CPU**: World conversion is CPU-intensive; more cores = faster conversion
4. **Network**: For remote deployment, ensure good upload/download speeds

## Support

For issues or questions:
- GitHub Issues: https://github.com/HiveGamesOSS/Chunker/issues
- Documentation: https://github.com/HiveGamesOSS/Chunker

## License

MIT License - See LICENSE file for details
