import express from "express";
import fileUpload from "express-fileupload";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import path from "path";
import fs from "fs-extra";
import os from "os";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import { Session } from "./session.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PORT = process.env.PORT || 3001;
const CLI_PATH = process.env.CLI_PATH || findCliPath();
const TEMP_DIR = path.join(os.tmpdir(), "chunker-web");
const UPLOAD_DIR = path.join(TEMP_DIR, "uploads");

// Ensure directories exist
fs.ensureDirSync(TEMP_DIR);
fs.ensureDirSync(UPLOAD_DIR);

// Find the CLI executable
function findCliPath() {
    const possiblePaths = [
        path.join(__dirname, "../../../cli/build/libs/chunker-cli.jar"),
        path.join(__dirname, "../../cli/build/libs/chunker-cli.jar"),
        path.join(process.cwd(), "cli/build/libs/chunker-cli.jar"),
        "/app/chunker-cli.jar", // Docker path
    ];

    for (const cliPath of possiblePaths) {
        if (fs.existsSync(cliPath)) {
            console.log("Found CLI at:", cliPath);
            return cliPath;
        }
    }

    console.warn("CLI not found in default locations. Please set CLI_PATH environment variable.");
    return null;
}

// Create Express app
const app = express();
const server = createServer(app);

// WebSocket server
const wss = new WebSocketServer({ server });

// Session management
const sessions = new Map();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "../../ui/build")));
app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: UPLOAD_DIR,
    limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5GB max
    abortOnLimit: true
}));

// Health check endpoint
app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        cliPath: CLI_PATH,
        cliAvailable: CLI_PATH && fs.existsSync(CLI_PATH)
    });
});

// File upload endpoint
app.post("/api/upload", async (req, res) => {
    try {
        if (!req.files || !req.files.world) {
            return res.status(400).json({ error: "No world file uploaded" });
        }

        const worldFile = req.files.world;
        const uploadId = uuidv4();
        const uploadPath = path.join(UPLOAD_DIR, uploadId);

        await fs.ensureDir(uploadPath);
        const filePath = path.join(uploadPath, worldFile.name);
        await worldFile.mv(filePath);

        res.json({
            success: true,
            uploadId: uploadId,
            path: filePath,
            filename: worldFile.name
        });
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ error: "Failed to upload file" });
    }
});

// Download endpoint
app.get("/download/:sessionId", async (req, res) => {
    try {
        const sessionId = req.params.sessionId;
        const session = sessions.get(sessionId);

        if (!session) {
            return res.status(404).json({ error: "Session not found" });
        }

        const outputZipPath = session.getOutputZipPath();

        if (!fs.existsSync(outputZipPath)) {
            return res.status(404).json({ error: "Output file not found" });
        }

        const filename = session._finalName || "converted-world";
        res.download(outputZipPath, `${filename}.zip`, (err) => {
            if (err) {
                console.error("Download error:", err);
                if (!res.headersSent) {
                    res.status(500).json({ error: "Failed to download file" });
                }
            }
        });
    } catch (error) {
        console.error("Download error:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: "Failed to download file" });
        }
    }
});

// WebSocket connection handler
wss.on("connection", (ws) => {
    console.log("WebSocket client connected");

    if (!CLI_PATH || !fs.existsSync(CLI_PATH)) {
        ws.send(JSON.stringify({
            type: "error",
            error: "Chunker CLI not found. Please ensure the server is properly configured."
        }));
        ws.close();
        return;
    }

    const sessionId = uuidv4();
    let session = null;

    try {
        // Get Java options from query or use defaults
        const javaOptions = process.env.JAVA_OPTIONS || "";

        // Create session
        session = new Session(sessions, sessionId, ws, TEMP_DIR, CLI_PATH, javaOptions);

        // Send connection open event
        ws.send(JSON.stringify({ type: "open" }));

        // Handle WebSocket messages
        ws.on("message", async (data) => {
            try {
                const event = JSON.parse(data.toString());
                if (session) {
                    await session.onEvent(event);
                }
            } catch (error) {
                console.error("Error handling WebSocket message:", error);
                ws.send(JSON.stringify({
                    type: "error",
                    error: "Failed to process message"
                }));
            }
        });

        // Handle WebSocket close
        ws.on("close", async () => {
            console.log("WebSocket client disconnected");
            if (session) {
                await session.close(1000);
            }
        });

        // Handle WebSocket error
        ws.on("error", (error) => {
            console.error("WebSocket error:", error);
        });

    } catch (error) {
        console.error("Error creating session:", error);
        ws.send(JSON.stringify({
            type: "error",
            error: "Failed to create session: " + error.message
        }));
        ws.close();
    }
});

// Serve React app for all other routes
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../../ui/build/index.html"));
});

// Start server
server.listen(PORT, () => {
    console.log(`Chunker Web Server running on port ${PORT}`);
    console.log(`CLI Path: ${CLI_PATH}`);
    console.log(`Temp Directory: ${TEMP_DIR}`);
    console.log(`Visit http://localhost:${PORT} to access the application`);
});

// Cleanup on shutdown
process.on("SIGINT", async () => {
    console.log("\nShutting down gracefully...");
    
    // Close all sessions
    for (const [sessionId, session] of sessions) {
        await session.close(1000);
    }
    
    // Clean up temp files
    try {
        await fs.rm(TEMP_DIR, { recursive: true, force: true });
    } catch (error) {
        console.error("Error cleaning up temp files:", error);
    }
    
    process.exit(0);
});
