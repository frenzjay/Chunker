// Web-compatible preload script that mimics Electron's chunker object
(function() {
    'use strict';

    // File upload state
    let uploadedFiles = new Map();

    window.chunker = {
        version: "1.12.0",
        gitVersion: "web",
        platform: "web",
        
        // For web, we handle file uploads differently
        getPathForFile: (file) => {
            // Store the file and return an identifier
            const fileId = crypto.randomUUID();
            uploadedFiles.set(fileId, file);
            return fileId;
        },

        // Get the actual file from the identifier
        getFileById: (fileId) => {
            return uploadedFiles.get(fileId);
        },

        // Upload file to server
        uploadFile: async (file) => {
            const formData = new FormData();
            formData.append('world', file);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to upload file');
            }

            const data = await response.json();
            return data.path; // Return server path
        },

        // Connect to WebSocket server
        connect: (handlers) => {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const ws = new WebSocket(`${protocol}//${window.location.host}`);

            ws.onopen = () => {
                console.log('WebSocket connected');
                if (handlers.onopen) {
                    handlers.onopen();
                }
            };

            ws.onclose = (event) => {
                console.log('WebSocket disconnected', event.code);
                if (handlers.onclose) {
                    handlers.onclose({ code: event.code });
                }
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                
                // Handle special messages
                if (data.type === 'open') {
                    if (handlers.onopen) {
                        handlers.onopen();
                    }
                    return;
                }
                
                if (data.type === 'close') {
                    if (handlers.onclose) {
                        handlers.onclose({ code: data.code });
                    }
                    return;
                }
                
                if (data.type === 'message') {
                    if (handlers.onmessage) {
                        handlers.onmessage({ data: data.data });
                    }
                    return;
                }
                
                // Forward other messages
                if (handlers.onmessage) {
                    handlers.onmessage({ data: JSON.stringify(data) });
                }
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            // Return connection object that mimics Electron IPC
            return {
                send: (data) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(data);
                    } else {
                        console.error('WebSocket is not open');
                    }
                },
                close: (code, reason) => {
                    ws.close(code || 1000, reason);
                }
            };
        }
    };
})();
