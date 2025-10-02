# Chunker Web App - Quick Start

Get Chunker running as a web app in 5 minutes!

## Prerequisites Check

```bash
# Check Node.js (need 18+)
node --version

# Check Java (need 17+)
java -version

# Check npm
npm --version
```

If any are missing, install them first.

## Installation

### Method 1: Automated (Recommended)

```bash
cd app/web
chmod +x setup.sh
./setup.sh
```

This script will:
1. Build the Chunker CLI
2. Build the React UI
3. Install web server dependencies
4. Display startup instructions

### Method 2: Manual

```bash
# Step 1: Build CLI (from project root)
./gradlew :cli:build -x test

# Step 2: Build UI
cd app/ui
npm install
npm run build

# Step 3: Setup web server
cd ../web
npm install
```

## Starting the Server

### Basic

```bash
cd app/web
npm start
```

Then open http://localhost:3001

### With Custom Port

```bash
PORT=8080 npm start
```

Then open http://localhost:8080

### With More Memory

```bash
JAVA_OPTIONS="-Xmx8G" npm start
```

### Production Mode

```bash
NODE_ENV=production npm start
```

## Using Docker

### Quick Start

```bash
# From project root
docker build -f app/web/Dockerfile -t chunker-web .
docker run -p 3001:3001 chunker-web
```

### With Docker Compose

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
      - JAVA_OPTIONS=-Xmx4G
    restart: unless-stopped
```

Start:
```bash
docker-compose up -d
```

## Usage

1. **Open browser** to http://localhost:3001
2. **Upload world** - Drag & drop or click "Choose File"
3. **Select versions** - Choose input and output formats
4. **Configure settings** (optional) - Advanced settings available
5. **Convert** - Start the conversion
6. **Download** - Get your converted world

## Configuration

### Environment Variables

Create `.env` file in `app/web/`:

```env
PORT=3001
JAVA_OPTIONS=-Xmx4G
```

### Available Options

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Server port |
| `CLI_PATH` | Auto | Path to CLI jar |
| `JAVA_OPTIONS` | Auto | JVM options |
| `NODE_ENV` | development | Node environment |

## Verification

### Health Check

```bash
curl http://localhost:3001/api/health
```

Should return:
```json
{
  "status": "ok",
  "cliPath": "/path/to/chunker-cli.jar",
  "cliAvailable": true
}
```

### Check Logs

Server logs show:
```
Found CLI at: /path/to/chunker-cli.jar
Chunker Web Server running on port 3001
CLI Path: /path/to/chunker-cli.jar
Temp Directory: /tmp/chunker-web
Visit http://localhost:3001 to access the application
```

## Troubleshooting

### Server won't start?

**Check if port is in use:**
```bash
lsof -i :3001
```

**Use different port:**
```bash
PORT=3002 npm start
```

### CLI not found?

**Check CLI exists:**
```bash
ls cli/build/libs/*.jar
```

**Rebuild CLI:**
```bash
./gradlew :cli:build -x test
```

**Set path manually:**
```bash
CLI_PATH=/full/path/to/chunker-cli.jar npm start
```

### Out of memory?

**Increase Java heap:**
```bash
JAVA_OPTIONS="-Xmx8G -Xms2G" npm start
```

### UI not loading?

**Rebuild UI:**
```bash
cd app/ui
npm run build
```

**Clear browser cache:**
- Chrome/Firefox: Ctrl+Shift+Delete
- Or use incognito/private mode

## Common Commands

### Development

```bash
# Start with hot reload (if using dev mode)
npm start

# Check for errors
npm run lint
```

### Production

```bash
# With PM2
pm2 start src/index.js --name chunker-web
pm2 logs chunker-web
pm2 restart chunker-web
pm2 stop chunker-web
```

### Maintenance

```bash
# Update dependencies
npm update

# Clean install
rm -rf node_modules package-lock.json
npm install

# Clean temporary files
rm -rf /tmp/chunker-web
```

## File Locations

| Item | Location |
|------|----------|
| Server code | `app/web/src/` |
| UI build | `app/ui/build/` |
| CLI jar | `cli/build/libs/` |
| Temp files | `/tmp/chunker-web/` |
| Logs | Console output |

## Next Steps

1. ✅ Server is running → Open http://localhost:3001
2. 📖 Read [FEATURES.md](FEATURES.md) for full feature list
3. 🚀 Check [WEB_DEPLOYMENT.md](../../WEB_DEPLOYMENT.md) for production setup
4. 🐳 Use Docker for easy deployment
5. 🔧 Customize settings via `.env` file

## Support

- **Issues**: https://github.com/HiveGamesOSS/Chunker/issues
- **Documentation**: [README.md](README.md)
- **Deployment Guide**: [WEB_DEPLOYMENT.md](../../WEB_DEPLOYMENT.md)

## Tips

💡 **For best performance:**
- Use SSD for temporary files
- Allocate at least 4GB RAM to Java
- Use a modern browser (Chrome/Firefox)
- Good network speed for uploads/downloads

💡 **For production:**
- Use a reverse proxy (Nginx)
- Enable SSL/HTTPS
- Set up process manager (PM2)
- Configure firewall rules
- Set up monitoring

💡 **For development:**
- Use `npm start` in app/ui for hot reload
- Check browser console for errors
- Monitor server logs
- Test with sample worlds first

---

**Ready to convert worlds? Let's go!** 🎮✨
