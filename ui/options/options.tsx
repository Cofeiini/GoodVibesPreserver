import * as React from "react";
import * as ReactDOM from "react-dom";
import { createRoot } from "react-dom/client";

const OptionsPage: React.FC = () => {
    return (
        <>
            <div style={{ position: "fixed", width: "20%", height: "100%", backgroundColor: "red", left: "0", top: "0" }}>
            </div>
            <main style={{ position: "fixed", width: "60%", height: "100%", backgroundColor: "blue", right: "10%", top: "0" }}>

            </main>
        </>
    );
};

const root = createRoot(document.getElementById("root")!);
root.render(<OptionsPage/>);

