import * as React from "react";
import * as ReactDOM from "react-dom";
import { createRoot } from "react-dom/client";
import settingsIcon from "../../assets/settings-icon.svg";
import powerIcon from "../../assets/power-icon.svg";
import { Action } from "../../scripts/tools/messaging";

const ReportedImages: React.FC = () => {
    const [reportedImages, setReportedImages] = React.useState(0);
    React.useEffect(() => {
        const getReportedImages = async () => {
            const { reportedImagesAmount } = await browser.storage.local.get();
            setReportedImages(reportedImagesAmount);
        };
        getReportedImages();
    });
    return (
        <div className="gvp-popup-statistics">
            <label className="gvp-popup-amount">{ reportedImages }</label>
            <label className="gvp-popup-label">Reported Images</label>
        </div>
    );
};

const BlockedImages: React.FC = () => {
    const [blockedImages, setBlockedImages] = React.useState(0);
    React.useEffect(() => {
        const getBlockedImages = async () => {
            const { blockedImagesAmount } = await browser.storage.local.get();
            setBlockedImages(blockedImagesAmount);
        };
        getBlockedImages();
    });
    return (
        <div className="gvp-popup-statistics">
            <label className="gvp-popup-amount">{ blockedImages }</label>
            <label className="gvp-popup-label">Blocked Images</label>
        </div>
    );
};

const PowerButton: React.FC = () => {
    const [status, setStatus] = React.useState(true);
    React.useEffect(() => {
        browser.runtime.sendMessage({ action: Action.turn_off_on, data: { content: { status: status } } });
    }, [status]);
    return (
        <div className="gvp-popup-power-button" style={{ backgroundColor: status ? "white" : "rgb(40,40,40)" }} onClick={ () => {
            setStatus(!status);
        }}>
            <img src={ powerIcon } width={28} height={28} className="gvp-popup-status-indicator" style={{
                transform: status ? "translateX(40px)" : "translateX(0px)",
            }}></img>
            <label className="gvp-popup-status-label" style={{
                left: status ? "15" : "auto",
                right: status ? "auto" : "15",
                color: status ? "black" : "white",
            }}>{ status ? "On" : "Off" }</label>
        </div>
    );
};

const Popup: React.FC = () => {
    return (
        <>
            <main className="gvp-popup-main">
                <img className="gvp-popup-logo" src="data:image/png;base64,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"></img>
                <img src={ settingsIcon } className="gvp-settings-button" width={ 30 } height={ 30 } onClick={ () => {
                    browser.tabs.create({ url: "../options/options.html" });
                }}></img>
                <ReportedImages/>
                <BlockedImages/>
                <PowerButton/>
            </main>
        </>
    );
};

const root = createRoot(document.getElementById("gvp-popup-root")!);
root.render(<Popup/>);
