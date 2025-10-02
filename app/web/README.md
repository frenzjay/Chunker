# Chunker Web Server

This is a web-based version of Chunker that allows you to convert Minecraft worlds without installing the desktop application.

## Requirements

- Node.js 18 or higher
- Java 17 or higher (for the CLI backend)
- Built Chunker CLI jar file

## Setup

1. Build the Chunker project:
   ```bash
   cd /path/to/Chunker
   ./gradlew build
   ```

2. Build the UI:
   ```bash
   cd app/ui
   npm install
   npm run build
   ```

3. Install web server dependencies:
   ```bash
   cd app/web
   npm install
   ```

## Running the Server

### Development Mode

From the `app/web` directory:

```bash
npm start
```

The server will start on port 3001 by default. Open your browser to `http://localhost:3001`

### Production Mode

You can set the following environment variables:

- `PORT` - Server port (default: 3001)
- `CLI_PATH` - Path to the Chunker CLI jar file (auto-detected by default)
- `JAVA_OPTIONS` - Java options to pass to the CLI (e.g., "-Xmx4G")

Example:

```bash
PORT=8080 CLI_PATH=/path/to/chunker-cli.jar npm start
```

## Docker Deployment

A Dockerfile is provided for easy deployment:

```bash
# Build the Docker image
docker build -t chunker-web .

# Run the container
docker run -p 3001:3001 chunker-web
```

## Features

- Upload Minecraft world files (ZIP or .mcworld)
- Convert between Java and Bedrock editions
- Convert between different game versions
- Download converted worlds
- Web-based interface (no installation required)

## Architecture

The web server consists of:

1. **Express HTTP Server** - Serves the React UI and handles file uploads/downloads
2. **WebSocket Server** - Provides real-time communication between browser and backend
3. **Session Management** - Handles concurrent conversions from multiple users
4. **Java CLI Backend** - Performs the actual world conversion

## Limitations

- Maximum upload size: 5GB (configurable)
- Conversions are performed sequentially per session
- Files are stored temporarily on the server during conversion

## Security Considerations

- File uploads are validated and sanitized
- Session data is isolated and cleaned up after completion
- CORS and CSP policies are enforced
- Temporary files are automatically removed on server shutdown

## License

MIT License - See the main Chunker project for details
