import React from "react";
import {BaseScreen} from "../baseScreen";
import {ModeScreen} from "../mode/modeScreen";
import api from "../../../api";
import {Round2DP} from "../../progress";

let jokes = [
    "How does Steve stay in shape? He runs around the block.",
    "How does Steve measure his shoe size? In square feet.",
    "What is a Creeper's favourite food? SSssSalad.",
    "Did you hear about the Creeper's party? It was a blast!",
    "Did you hear about the Minecraft movie? It's gonna be a blockbuster."
];

export class SelectWorldScreenWeb extends BaseScreen {
    state = {
        version: undefined,
        detecting: false,
        progress: 0,
        animated: false,
        selected: undefined,
        filePath: undefined,
        filePathDirectory: undefined,
        processing: false,
        processingPercentage: 0,
        uploading: false,
        uploadProgress: 0,
        dragging: false,
        draggingOverBox: false
    };
    fileInput = undefined;
    target = null;

    constructor(props) {
        super(props);

        let self = this;
        // Setup fileInput
        this.fileInput = document.createElement("input");
        this.fileInput.type = "file";
        this.fileInput.accept = ".zip,.mcworld";
        this.fileInput.value = null;
        this.fileInput.onclick = () => {
            self.fileInput.value = null;
        };
        this.fileInput.onchange = () => this.handleFile(self.fileInput.files[0]);

        // Pick random joke
        this.joke = jokes[Math.floor(Math.random() * jokes.length)];
    }

    handleFile = async (file) => {
        if (!file) return;

        let self = this;

        try {
            this.setState({
                selected: file.name,
                uploading: true,
                uploadProgress: 0
            });

            // Upload file to server
            const formData = new FormData();
            formData.append('world', file);

            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total);
                    self.setState({ uploadProgress: percentComplete });
                }
            });

            xhr.addEventListener('load', async () => {
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    self.setState({ 
                        uploading: false, 
                        filePath: response.path, 
                        filePathDirectory: false 
                    });
                } else {
                    throw new Error('Upload failed');
                }
            });

            xhr.addEventListener('error', () => {
                self.app.showError("Upload Failed", "Failed to upload world file to server. Please try again.", null, undefined, true);
                self.setState({ selected: false, detecting: false, uploading: false });
            });

            xhr.open('POST', '/api/upload');
            xhr.send(formData);

        } catch (error) {
            console.error("Upload error:", error);
            this.app.showError("Upload Failed", "Failed to upload world file. Please try again.", null, undefined, true);
            this.setState({ selected: false, detecting: false, uploading: false });
        }
    };

    handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();

        this.setState({ dragging: false, draggingOverBox: false });

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            this.handleFile(e.dataTransfer.files[0]);
        }
    };

    handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setState({ dragging: true, draggingOverBox: true });
    };

    handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setState({ dragging: false, draggingOverBox: false });
    };

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (this.state.filePath && this.state.filePath !== prevState.filePath) {
            this.selectWorld();
        }
    }

    selectWorld = () => {
        let self = this;
        this.setState({ detecting: true });

        api.send({
            type: "flow",
            method: "select_world",
            path: this.state.filePath
        }, function (message) {
            if (message.type === "error") {
                self.app.showError("Invalid World", message.error, message.errorId, message.stackTrace, true);
                self.setState({ selected: false, detecting: false });
            } else if (message.type === "progress") {
                self.setState({ progress: message.percentage });
            } else if (message.type === "progress_state") {
                self.setState({ progress: message.percentage, animated: message.animated });
            } else {
                self.app.setState({ inputType: message.output });
                self.app.setStage(ModeScreen);
            }
        });
    };

    render() {
        return (
            <div className="maincol">
                <div className="topbar">
                    <h1>Select Your World</h1>
                    <h2>Choose a Minecraft world to convert (ZIP or .mcworld file)</h2>
                </div>
                <div className="main_content main_content_input">
                    {!this.state.detecting && !this.state.uploading && (
                        <div
                            className={"card" + (this.state.draggingOverBox ? " drag-over" : "")}
                            onDrop={this.handleDrop}
                            onDragOver={this.handleDragOver}
                            onDragEnter={this.handleDragEnter}
                            onDragLeave={this.handleDragLeave}
                        >
                            <div className="card-body">
                                <h5 className="card-title">Upload World File</h5>
                                <p className="card-text">
                                    Drag and drop a world file here, or click the button below to select a file.
                                </p>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => this.fileInput.click()}
                                >
                                    Choose File
                                </button>
                            </div>
                        </div>
                    )}
                    {this.state.uploading && (
                        <div className="detecting">
                            <h3>Uploading World...</h3>
                            <div className="progress-container">
                                <div className="progress-bar" style={{ width: (this.state.uploadProgress * 100) + "%" }}></div>
                            </div>
                            <p>{Round2DP(this.state.uploadProgress * 100)}% uploaded</p>
                        </div>
                    )}
                    {this.state.detecting && (
                        <div className="detecting">
                            <h3>Detecting World Version...</h3>
                            {!this.state.animated && (
                                <div className="progress-container">
                                    <div className="progress-bar" style={{ width: (this.state.progress * 100) + "%" }}></div>
                                </div>
                            )}
                            {this.state.animated && (
                                <div className="progress-container">
                                    <div className="progress-bar progress-bar-animated"></div>
                                </div>
                            )}
                            {!this.state.animated && <p>{Round2DP(this.state.progress * 100)}% complete</p>}
                            <p className="joke">{this.joke}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }
}
