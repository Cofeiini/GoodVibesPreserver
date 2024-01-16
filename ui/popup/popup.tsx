import * as React from "react";
import * as ReactDOM from "react-dom";
import { createRoot } from "react-dom/client";
import settingsIcon from "../../assets/settings-icon.svg";
import { Action } from "../../scripts/tools/messaging";

const PowerButton: React.FC = () => {
    const [status, setStatus] = React.useState(true);
    React.useEffect(() => {
        browser.runtime.sendMessage({ action: Action.turnOffOn, data: { content: { status: status } } });
    }, [status]);
    return (
        <>
            <div className="gvp-popup-power-button" style={{ backgroundColor: status ? "white" : "black" }} onClick={ () => {
                setStatus(!status);
            }}>
                <div className="gvp-popup-status-indicator" style={{
                    transform: status ? "translateX(60px)" : "translateX(0px)",
                    background: status ? "black" : "white",
                }}></div>
                <label className="gvp-popup-status-label" style={{
                    left: status ? "20" : "auto",
                    right: status ? "auto" : "20",
                    color: status ? "black" : "white",
                }}>{ status ? "On" : "Off" }</label>
            </div>
        </>
    );
};

const Popup: React.FC = () => {
    return (
        <>
            <main className="gvp-popup-main">
                <img src={ settingsIcon } className="gvp-settings-button" width={ 30 } height={ 30 } onClick={ () => {
                    browser.tabs.create({ url: "../options/options.html" });
                }}></img>
                <PowerButton/>
            </main>
        </>
    );
};

const root = createRoot(document.getElementById("gvp-popup-root")!);
root.render(<Popup/>);
