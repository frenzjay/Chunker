# Chunker Web App Features

## Overview

The Chunker web app provides a browser-based interface for converting Minecraft worlds between Java and Bedrock editions without requiring any desktop installation.

## Core Features

### 🌐 Browser-Based Interface
- No installation required - works entirely in your web browser
- Responsive design that works on desktop and tablet devices
- Clean, intuitive interface matching the desktop app

### 📤 File Upload
- **Drag & drop** support for easy file selection
- **Click to browse** traditional file selection
- Supported formats:
  - `.zip` - Compressed world files
  - `.mcworld` - Bedrock world files
- Real-time upload progress indicator
- File validation before processing
- Maximum upload size: 5GB (configurable)

### 🔄 World Conversion
All the same features as the desktop app:
- Convert between Java Edition and Bedrock Edition
- Upgrade/downgrade between different game versions
- Supported versions:
  - Java: 1.8.8 through 1.21.9
  - Bedrock: 1.12.0 through 1.21.110

### ⚙️ Advanced Settings
- Block mappings customization
- Dimension mapping configuration
- World settings editing (level name, game mode, etc.)
- Pruning settings for selective conversion
- Converter options:
  - Custom block identifiers
  - Block connections
  - Item conversion
  - Loot table conversion
  - Map conversion
  - Compact mode
  - Empty chunk handling

### 📊 Real-Time Progress
- WebSocket-based live updates
- Detailed progress indicators for:
  - Upload progress
  - World detection
  - Settings generation
  - Preview generation
  - Conversion progress
  - Output packaging
- Animated progress bars
- Estimated completion status

### 💾 Download Results
- One-click download of converted worlds
- Automatic ZIP packaging
- Custom filename based on world name
- Download progress tracking

### 🔍 World Preview
- Interactive 2D map preview
- Zoom and pan controls
- Biome visualization
- Player spawn point indicator
- Dimension switching (Overworld, Nether, End)

### 📝 Conversion Log
- Detailed output log showing:
  - Missing block identifiers
  - Conversion warnings
  - Processing steps
- Export log for troubleshooting

## Technical Features

### 🔒 Security
- Session-based isolation
- Secure file upload validation
- Path sanitization to prevent traversal attacks
- Content Security Policy enforcement
- Automatic cleanup of temporary files
- No persistent storage of user data

### ⚡ Performance
- Efficient streaming for large files
- Memory-optimized conversion process
- Automatic Java heap size calculation
- Concurrent session support
- Non-blocking WebSocket communication

### 🔄 Reliability
- Automatic error recovery
- Graceful degradation
- Connection retry logic
- Session timeout handling
- Clean shutdown procedures

### 📊 Multi-User Support
- Multiple simultaneous conversions
- Session isolation per user
- Independent progress tracking
- Automatic resource cleanup

### 🌍 Cross-Platform
- Works on Windows, macOS, Linux
- Compatible with modern browsers:
  - Chrome/Chromium
  - Firefox
  - Safari
  - Edge

## Deployment Features

### 🐳 Docker Support
- Pre-built Dockerfile included
- Multi-stage build for optimization
- Health check configuration
- Environment variable configuration
- Docker Compose support

### 🔧 Configuration
- Environment variable based config
- `.env` file support
- Runtime configuration without rebuild
- Customizable:
  - Server port
  - CLI path
  - Java options
  - Upload limits
  - Memory allocation

### 📈 Production Ready
- PM2 process manager support
- Nginx reverse proxy compatible
- SSL/HTTPS ready
- Rate limiting compatible
- Log management
- Monitoring hooks

### 🛠️ Developer Friendly
- Hot reload in development
- Detailed error logging
- API health endpoint
- Debug mode support
- Clean code structure
- Comprehensive documentation

## User Experience

### ✨ Advantages Over Desktop App
- **No installation** - Start converting immediately
- **Always up-to-date** - No need to download updates
- **Cross-device** - Access from any device with a browser
- **No storage** - Files don't take up local disk space
- **Easy sharing** - Share a link instead of installation instructions

### 🎯 Perfect For
- **Casual users** - Quick one-time conversions
- **Testing** - Try Chunker before installing desktop app
- **Remote access** - Convert on a server, download anywhere
- **Shared computers** - No admin rights needed
- **Mobile devices** - Convert on tablets (desktop not supported on mobile)
- **Public services** - Host a conversion service for your community

## Limitations

Compared to the desktop app:
- Requires active internet connection
- Upload/download depends on network speed
- Subject to server resource availability
- Maximum file size limits
- Cannot process worlds directly from filesystem
- Folder selection not supported (must be zipped first)

## Future Enhancements (Potential)

- Batch conversion support
- Conversion history
- User accounts and saved settings
- Direct cloud storage integration
- Mobile app companion
- Progressive Web App (PWA) support
- Offline processing queue
- Collaborative conversion sharing

## Supported Browsers

### Fully Supported
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Requirements
- JavaScript enabled
- WebSocket support
- File API support
- Modern ES6+ support

## API Endpoints

### HTTP Endpoints
- `GET /` - Serve web interface
- `GET /api/health` - Health check
- `POST /api/upload` - File upload
- `GET /download/:sessionId` - Download converted world

### WebSocket
- `ws://host/` - Real-time communication
  - World detection
  - Settings generation
  - Preview generation
  - Conversion progress
  - Error handling

## Resource Requirements

### Client (Browser)
- Modern browser with JavaScript enabled
- Stable internet connection
- Upload speed: 10+ Mbps recommended for large worlds

### Server
- Node.js 18+ runtime
- Java 17+ JVM
- CPU: 2+ cores recommended
- RAM: 2GB minimum, 8GB+ recommended
- Disk: 10GB+ free space for temporary files
- Network: Good upload/download speeds

## Compliance

- GDPR compliant (no personal data stored)
- No tracking or analytics by default
- Session data automatically deleted
- No cookies required
- Open source (MIT License)

---

**The Chunker web app brings the power of world conversion to your browser!** 🎮✨
