import React from "react";
import {BaseScreen} from "../baseScreen";
import api from "../../../api";
import {Round2DP} from "../../progress";
import {getVersionName} from "../mode/modeOption";

export class SaveScreenWeb extends BaseScreen {
    state = {
        modalShown: false,
        saving: false,
        saved: false,
        percentage: 0,
        downloadUrl: null
    };

    getStage = () => {
        return 4;
    };

    componentDidMount() {
        // In web mode, the download URL is provided directly
        if (this.app.state.convertResult.download) {
            this.setState({
                downloadUrl: this.app.state.convertResult.download,
                saved: true
            });
        }
    }

    onClick = (e) => {
        // For web mode, we just trigger the download
        // The download URL is already set by the server
        if (this.state.downloadUrl) {
            // Download is handled by the browser via the href
            this.setState({
                saved: true
            });
        }
    };

    openModal = () => this.setState({modalShown: true});

    closeModal = () => this.setState({modalShown: false});

    render() {
        // Version info
        let version = getVersionName(this.app.state.outputType.id);
        let java = this.app.state.outputType.id.startsWith("JAVA_");

        // Error IDs
        let errorIds = this.app.state.convertResult.anonymousId !== "" ? this.app.state.convertResult.anonymousId : undefined;

        // Convert to nice identifiers
        let missingIdentifiers = "The following identifiers couldn't be mapped:\n" + this.app.state.convertResult.missingIdentifiers.map(a => {
            return a.identifier + (a.states ? "[" + a.states.states.map(s => s.item1 + "=" + s.item2.value).join(",") + "]" : "")
        }).join("\n");

        const downloadFilename = this.app.state.convertResult.filename || "converted-world.zip";

        return (
            <div className="maincol">
                <div className="topbar">
                    <h1>Save World</h1>
                    <h2>Your {java ? "Java Edition" : "Bedrock Edition"} {version} world is ready to be saved.</h2>
                </div>
                <div className="main_content main_content_progress">
                    {!this.state.saved && !this.state.saving && <h3>Ready To Save</h3>}
                    {this.state.saving && <React.Fragment>
                        <h3>Preparing download... {Round2DP(this.state.percentage)}%</h3>
                        <div className="progress_bar">
                            <div className="progress_fill" style={{width: this.state.percentage + "%"}}/>
                        </div>
                    </React.Fragment>}
                    {this.state.saved && <h3>Ready to Download</h3>}
                    {this.state.saved && <p>Your world has been converted and is ready to download</p>}
                    {!this.state.saved && <p>Your world has been converted and can now be downloaded</p>}
                    {errorIds && (
                        <div>
                            <h1>Errors</h1>
                            <p>We ran into a few errors converting your world, however, we were still able to continue,
                                for help contact support with the following ids: <span
                                    className="world_name">{errorIds}</span>
                            </p>
                        </div>
                    )}
                    {this.app.state.convertResult.missingIdentifiers.length > 0 &&
                        <div>
                            <button className="button blue" onClick={this.openModal}>Show Output Log</button>
                        </div>
                    }
                </div>
                {this.state.modalShown && <div className="modal_overlay">
                    <div className="modal">
                        <h3>Output Log</h3>
                        <textarea className="output-log" readOnly={true} value={missingIdentifiers}/>
                        <br/>
                        <p>
                            <button className="button green" onClick={this.closeModal}>Close</button>
                        </p>
                    </div>
                </div>}
                <div className="bottombar">
                    <button onClick={() => window.location.reload()} type="submit" className="button red">Restart
                    </button>
                    {this.state.downloadUrl && (
                        <a 
                            download={downloadFilename}
                            rel="noopener noreferrer" 
                            href={this.state.downloadUrl}
                            onClick={this.onClick} 
                            className="button green"
                        >
                            Download
                        </a>
                    )}
                </div>
            </div>
        );
    }
}
