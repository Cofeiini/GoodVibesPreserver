import * as React from "react";
import * as ReactDOM from "react-dom";
import { createRoot } from "react-dom/client";

const Popup: React.FC = () => {
    return (
        <>
            <div style={ { width: "200px", height: "450px", backgroundColor: "red" } }>
                <button onClick={ () => {
                    browser.tabs.create({ url: "../options/options.html" });
                } }>Options Page</button>
            </div>
        </>
    );
};

const root = createRoot(document.getElementById("gvp-popup-root")!);
root.render(<Popup/>);
