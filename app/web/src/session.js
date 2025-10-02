import { spawn } from "child_process";
import { freemem, totalmem } from "os";
import path from "path";
import fs from "fs-extra";
import jszip from "jszip";
import { copyRecursive, countFiles, zipRecursive } from "./util.js";
import archiver from "archiver";

export class Session {
    _sessions = null;
    _sessionID = null;
    _ws = null;
    _connected = true;
    _closePromise = null;

    // Paths
    _sessionPath = null;
    _tempDir = null;

    // Settings
    _worldSettings = null;
    _pruningSettings = null;
    _finalName = null;
    _dimensionMappings = null;
    _blockMappings = null;

    // Handlers
    _asyncResponseMappers = {};

    // Constructor
    constructor(sessions, sessionID, ws, tempDir, cliPath, javaOptions) {
        this._sessions = sessions;
        this._sessionID = sessionID;
        this._ws = ws;
        this._tempDir = tempDir;

        // Save the session
        sessions.set(sessionID, this);

        // Find the CLI executable
        let executable = cliPath;

        // Attach JVM options (calculate memory if not set)
        if (javaOptions.indexOf("-Xm") === -1) {
            let maximumMB;
            if (process.platform !== "darwin") {
                // Use 75% of available memory (but ensure there is at least 1024MB free for the system)
                const freeMemoryMB = freemem() / (1024 * 1024);
                const desiredMB = freeMemoryMB * 0.75;

                // Ensure we leave at least 1GB free in memory for the system
                const reservedMB = 1024;

                // Ensure the VM gets at least 512MB of ram
                const requiredMB = 512;
                maximumMB = Math.max(Math.min(freeMemoryMB - reservedMB, desiredMB), requiredMB);
            } else {
                // Use 75% of total memory (but ensure there is 4096MB free for the system on mac)
                const totalMemoryMB = totalmem() / (1024 * 1024);

                // Ensure the VM gets at least 512MB of ram
                const requiredMB = 512;
                maximumMB = Math.max(Math.min(totalMemoryMB - 4096, totalMemoryMB * 0.75), requiredMB);
            }

            let generatedOptions = "-Xmx" + Math.floor(maximumMB) + "M";
            javaOptions = javaOptions + (javaOptions.length > 0 ? " " : "") + generatedOptions;
        }

        // Execute as process or a jar
        if (executable.endsWith(".jar")) {
            this._process = spawn("java", ["-jar", executable, "messenger"], {
                env: {
                    ...process.env,
                    _JAVA_OPTIONS: javaOptions
                }
            });
        } else {
            this._process = spawn(executable, ["messenger"], {
                env: {
                    ...process.env,
                    _JAVA_OPTIONS: javaOptions
                }
            });
        }

        let buffer = "";
        this._process.stdout.on("data", (data) => {
            (async () => {
                buffer += data.toString();
                let lines = buffer.split("\n");
                for (let i = 0; i < lines.length - 1; i++) {
                    let line = lines[i];
                    if (line.length === 0) continue;
                    console.debug("Process output: ", line.trim());
                    try {
                        let obj = JSON.parse(line);

                        // If it's a progress message then it should continue listening for further updates
                        if (obj.type === "progress" || obj.type === "progress_state") {
                            obj.continue = true;
                        } else {
                            if (obj.type === "response" && obj.requestId && this._asyncResponseMappers[obj.requestId] !== undefined) {
                                // Apply response mapper if it's present
                                obj = await this._asyncResponseMappers[obj.requestId](obj);
                            }

                            // Ensure the mapper is removed
                            delete this._asyncResponseMappers[obj.requestId];
                        }

                        // Send to the client
                        this.sendMessage(obj);
                    } catch (e) {
                        // Error parsing
                        console.error(`Error parsing output from process: ${data}`, e)
                    }
                }

                // Update buffer with remaining content
                buffer = lines[lines.length - 1];
            })().catch((e) => console.error("Failed to process data for process", e));
        });
        this._process.stderr.on("data", (data) => {
            let value = data.toString().trim();

            // Ensure the JVM indicating what options it has is info and not an error
            if (value.startsWith("Picked up")) {
                console.info(`Info from process: ${value}`)
            } else {
                console.error(`Error from process: ${value}`)
            }
        });
        this._process.on("close", (code) => {
            // Close the session
            console.debug("Process exited with error code", code)
            this.close(code).catch((e) => console.error("Failed to close process", e));
        });

        // Setup output path
        this._sessionPath = path.join(this._tempDir, this._sessionID);
        fs.mkdirSync(this._sessionPath, { recursive: true });
    }

    close(errorCode) {
        if (!this._connected) return Promise.resolve();

        // Run the close code inside a promise, so it can be monitored
        this._closePromise = (async () => {
            // Send the close message
            this.sendRaw({ type: "close", code: errorCode });

            // Mark as not connected
            this._connected = false;

            // Stop the process
            if (this._process) {
                this._process.kill();
            }

            // Call onClose
            await this.onClose(errorCode);
        })();

        // Return the promise
        return this._closePromise;
    }

    sendToProcess(obj, asyncResponseMapper) {
        // Save the response mapper (used to mutate the response)
        if (obj.requestId && asyncResponseMapper) {
            this._asyncResponseMappers[obj.requestId] = asyncResponseMapper;
        }

        // Write the request
        console.debug("Writing to process ", JSON.stringify(obj) + "\n")
        this._process.stdin.write(JSON.stringify(obj) + "\n");
    }

    sendMessage(obj) {
        this.sendRaw({ type: "message", data: JSON.stringify(obj) });
    }

    sendRaw(obj) {
        if (!this._connected) return;
        if (this._ws.readyState === 1) { // WebSocket.OPEN
            this._ws.send(JSON.stringify(obj));
        }
    }

    async onEvent(event) {
        if (!this._connected) return;
        switch (event.type) {
            case "close":
                await this.close(event.code);
                break;
            case "message":
                await this.onMessage(JSON.parse(event.data));
                break;
        }
    }

    async onClose(errorCode) {
        // Remove output
        if (this._sessionPath) {
            console.log("Deleting session data: ", this._sessionID);
            await fs.rm(this._sessionPath, { recursive: true, force: true });
        }

        // Remove the session
        this._sessions.delete(this._sessionID);
    }

    async onMessage(data) {
        switch (data.type) {
            case "flow":
                await this.onFlow(data);
                break;
            case "settings":
                await this.onSettings(data);
                break;
            case "mappings":
                await this.onMappings(data);
                break;
            default:
                console.log("Unhandled message type ", data.type, ", full message: ", data);
                break;
        }
    }

    async onFlow(data) {
        switch (data.method) {
            case "cancel":
                await this.cancelTask(data.requestId);
                break;
            case "save":
                await this.save(data.requestId);
                break;
            case "select_world":
                await this.selectWorld(data.path, data.requestId);
                break;
            case "generate_settings":
                await this.generateSettings(data.requestId);
                break;
            case "generate_preview":
                await this.generatePreview(data.requestId);
                break;
            case "convert":
                await this.convertWorld(data.outputType, data.requestId, data);
                break;
            default:
                console.log("Unhandled flow message ", data.method, ", full message: ", data);
                break;
        }
    }

    async save(requestId) {
        // For web version, the file will be downloaded via HTTP
        // Just send the path to download
        try {
            const outputZipPath = path.join(this._sessionPath, "output.zip");
            
            this.sendMessage({
                requestId: requestId,
                type: "response",
                output: {
                    downloadUrl: `/download/${this._sessionID}`,
                    sessionId: this._sessionID
                }
            });
        } catch (e) {
            console.error("Failed to prepare download", e);
            this.sendMessage({
                requestId: requestId,
                type: "error",
                error: "Failed to prepare download.",
                stackTrace: e.stack.toString() + "\n"
            });
        }
    }

    async onSettings(data) {
        switch (data.method) {
            case "set_world_settings":
                this._worldSettings = data.settings;
                this.sendMessage({ requestId: data.requestId, type: "response" });
                break;
            case "set_pruning_settings":
                this._pruningSettings = data.settings;
                this.sendMessage({ requestId: data.requestId, type: "response" });
                break;
            case "set_output_name":
                this._finalName = data.name;
                this.sendMessage({ requestId: data.requestId, type: "response" });
                break;
        }
    }

    async onMappings(data) {
        switch (data.method) {
            case "set_block_mappings":
                this._blockMappings = data.mappings;
                this.sendMessage({ requestId: data.requestId, type: "response" });
                break;
            case "set_dimension_mappings":
                this._dimensionMappings = data.dimensions;
                this.sendMessage({ requestId: data.requestId, type: "response" });
                break;
        }
    }

    async cancelTask(requestId) {
        let request = {
            type: "kill",
            requestId: requestId,
            anonymousId: this._sessionID
        }
        this.sendToProcess(request);
    }

    async selectWorld(inputPath, requestId) {
        // Create the input directory
        let worldInputPath = path.join(this._sessionPath, "input");
        await fs.mkdir(worldInputPath);

        // The inputPath is the path to the uploaded world file
        let pathStat = await fs.stat(inputPath);
        if (pathStat.isFile()) {
            // Extract zip
            try {
                let zipContents = await fs.readFile(inputPath);
                let zip = await jszip.loadAsync(zipContents);

                // Find the level.dat
                let levelDataFiles = zip.file(/level\.dat$/g);
                if (levelDataFiles.length === 0) {
                    this.sendMessage({
                        requestId: requestId,
                        type: "error",
                        error: "Provided file does not contain a Minecraft world."
                    });
                    return;
                }

                let selectedDat = levelDataFiles[0];
                let pathPrefix = selectedDat.name.substring(0, selectedDat.name.lastIndexOf("/") + 1);
                let filesExtracted = 0;
                let totalFiles = Object.keys(zip.files).length;
                let lastProgress = 0;

                // Extract everything below the level.dat
                await Promise.all(Object.keys(zip.files).map(async (filename) => {
                    if (!filename.startsWith(pathPrefix)) return;

                    const file = zip.files[filename];
                    const outputPath = path.join(worldInputPath, filename.substring(pathPrefix.length));

                    // Ignores paths which aren't safe
                    if (!path.normalize(outputPath).startsWith(worldInputPath)) {
                        return;
                    }

                    // Create the directory if it's one otherwise copy the file data
                    if (file.dir) {
                        await fs.mkdir(outputPath, { recursive: true });
                    } else {
                        let outputPathFolder = path.dirname(outputPath);
                        await fs.mkdir(outputPathFolder, { recursive: true });

                        const fileData = await file.async('nodebuffer');
                        await fs.writeFile(outputPath, fileData);
                    }

                    // Update progress
                    filesExtracted++;
                    let progress = filesExtracted / totalFiles;

                    if (progress - lastProgress > 0.01) {
                        this.sendMessage({
                            requestId: requestId,
                            type: "progress",
                            percentage: progress,
                            continue: true
                        });
                        lastProgress = progress;
                    }
                }));
            } catch (e) {
                console.error("Failed to read input zip", e);

                if (e.code === "ERR_FS_FILE_TOO_LARGE") {
                    this.sendMessage({
                        requestId: requestId,
                        type: "error",
                        error: "This zip file is too large to open.",
                        stackTrace: e.stack.toString() + "\n"
                    });
                    return;
                }

                this.sendMessage({
                    requestId: requestId,
                    type: "error",
                    error: "Failed to open selected file.",
                    stackTrace: e.stack.toString() + "\n"
                });
                return;
            }
        } else if (pathStat.isDirectory()) {
            // Copy files to the output path
            let totalFiles = await countFiles(inputPath);
            let filesCopied = 0;
            let lastProgress = 0;
            try {
                await copyRecursive(inputPath, worldInputPath, (file) => {
                    filesCopied++;
                    let progress = filesCopied / totalFiles;

                    if (progress - lastProgress > 0.01) {
                        this.sendMessage({
                            requestId: requestId,
                            type: "progress",
                            percentage: progress,
                            continue: true
                        });
                        lastProgress = progress;
                    }
                });
            } catch (e) {
                console.error("Failed to read input directory", e);

                this.sendMessage({
                    requestId: requestId,
                    type: "error",
                    error: "Failed to open selected folder.",
                    stackTrace: e.stack.toString() + "\n"
                });
                return;
            }
        } else {
            console.error("Failed to find input", inputPath);

            this.sendMessage({
                requestId: requestId,
                type: "error",
                error: "Failed to find input world."
            });
            return;
        }

        // Tell the user that we're detecting the world
        this.sendMessage({
            requestId: requestId,
            type: "progress_state",
            percentage: 0.999,
            animated: true,
            continue: true
        });

        // Create the detect version request
        let request = {
            type: "detect_version",
            requestId: requestId,
            anonymousId: this._sessionID,
            inputPath: worldInputPath
        }

        // Load preloaded data
        let preloaded_settings = {};
        try {
            const preloadedSettingsPath = path.join(worldInputPath, ".chunker", "settings.json");
            if (await fs.pathExists(preloadedSettingsPath)) {
                const preloadedData = await fs.readFile(preloadedSettingsPath);
                preloaded_settings = JSON.parse(preloadedData.toString());
            }
        } catch (e) {
            console.error("Failed to load preloaded settings", e);
        }

        request.preloaded = preloaded_settings;

        // Send the detect version request
        this.sendToProcess(request);
    }

    async generateSettings(requestId) {
        let worldInputPath = path.join(this._sessionPath, "input");
        let settingsOutputPath = path.join(this._sessionPath, "settings");

        await fs.rm(settingsOutputPath, { recursive: true, force: true });
        await fs.mkdir(settingsOutputPath);

        let request = {
            type: "settings",
            requestId: requestId,
            anonymousId: this._sessionID,
            inputPath: worldInputPath,
            outputPath: settingsOutputPath
        }

        this.sendToProcess(request, async (response) => {
            if (response.type !== "response") return response;

            let data = await fs.readFile(path.join(settingsOutputPath, "data.json"));
            Object.assign(response.output, JSON.parse(data.toString()));

            // Sort maps by ID
            response.output.maps.sort((a, b) => a.id - b.id);

            return response;
        });
    }

    async generatePreview(requestId) {
        let worldInputPath = path.join(this._sessionPath, "input");
        let previewOutputPath = path.join(this._sessionPath, "preview");

        await fs.rm(previewOutputPath, { recursive: true, force: true });
        await fs.mkdir(previewOutputPath);

        let request = {
            type: "preview",
            requestId: requestId,
            anonymousId: this._sessionID,
            inputPath: worldInputPath,
            outputPath: previewOutputPath
        }

        this.sendToProcess(request, async (response) => {
            response.output = (await fs.readFile(path.join(previewOutputPath, "map.bin"))).toString("base64");
            return response;
        });
    }

    async convertWorld(outputType, requestId, data) {
        let worldInputPath = path.join(this._sessionPath, "input");
        let worldOutputPath = path.join(this._sessionPath, "output");

        await fs.rm(worldOutputPath, { recursive: true, force: true });
        await fs.mkdir(worldOutputPath);

        let copyNbt = data.hasOwnProperty("keepOriginalNBT") && data["keepOriginalNBT"];

        let request = {
            type: "convert",
            requestId: requestId,
            anonymousId: this._sessionID,
            outputFormat: outputType,
            inputPath: worldInputPath,
            outputPath: worldOutputPath,
            blockMappings: this._blockMappings,
            dimensionMappings: this._dimensionMappings,
            nbtSettings: this._worldSettings,
            pruningList: this._pruningSettings,
            copyNbt: copyNbt,
            skipMaps: data.hasOwnProperty("mapConversion") && !data["mapConversion"],
            skipLootTables: data.hasOwnProperty("lootTableConversion") && !data["lootTableConversion"],
            skipItemConversion: data.hasOwnProperty("itemConversion") && !data["itemConversion"],
            customIdentifiers: !data.hasOwnProperty("customIdentifiers") || data["customIdentifiers"],
            skipBlockConnections: data.hasOwnProperty("blockConnections") && !data["blockConnections"],
            enableCompact: !data.hasOwnProperty("enableCompact") || data["enableCompact"],
            discardEmptyChunks: data.hasOwnProperty("discardEmptyChunks") && data["discardEmptyChunks"],
            preventYBiomeBlending: data.hasOwnProperty("preventYBiomeBlending") && data["preventYBiomeBlending"]
        }

        this.sendToProcess(request, async (response) => {
            if (response.type !== "response") return response;

            // Tell the user that we're zipping the output
            this.sendMessage({
                requestId: requestId,
                type: "progress_state",
                percentage: 0.999,
                animated: true,
                name: "Zipping output",
                continue: true
            });

            try {
                let outputFileName = (this._finalName ?? "output").replaceAll(/[^A-Za-z0-9_\-@]/g, "_");
                outputFileName = outputFileName.replace(/_{2,}/g, '_');

                if (outputFileName.length === 0 || outputFileName.length > 128) {
                    outputFileName = "output";
                }

                const outputZipPath = path.join(this._sessionPath, "output.zip");
                const output = fs.createWriteStream(outputZipPath);
                const archive = archiver('zip', {
                    zlib: { level: 1 }
                });

                output.on('close', () => {
                    console.log('Archive created: ' + archive.pointer() + ' total bytes');
                });

                archive.on('error', (err) => {
                    throw err;
                });

                archive.pipe(output);

                // Add all files from worldOutputPath to the archive
                archive.directory(worldOutputPath, outputFileName);

                await archive.finalize();

                // Update response with download info
                response.output = {
                    downloadUrl: `/download/${this._sessionID}`,
                    filename: outputFileName + ".zip",
                    sessionId: this._sessionID
                };

                return response;
            } catch (e) {
                console.error("Failed to create zip", e);
                return {
                    type: "error",
                    requestId: requestId,
                    error: "Failed to create output archive.",
                    stackTrace: e.stack.toString() + "\n"
                };
            }
        });
    }

    getOutputZipPath() {
        return path.join(this._sessionPath, "output.zip");
    }
}
