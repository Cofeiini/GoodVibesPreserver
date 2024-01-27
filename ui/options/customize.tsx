import * as React from "react";
import * as ReactDOM from "react-dom";
import { whitelistedImage } from "../../scripts/tools/interfaces";

const WhitelistElement = ({ thumbnail, source, setWhitelistedImages }: { thumbnail: string, source: string, setWhitelistedImages: CallableFunction }) => {
    return (
        <div className="whitelist-thumbnail">
            <img src={ thumbnail }></img>
            <button className="whitelist-button" onClick={() => {
                browser.storage.local.get()
                    .then(localStorage => {
                        let { whitelistedImages } = localStorage;
                        whitelistedImages = (whitelistedImages as whitelistedImage[]).filter(image => image.source !== source);
                        setWhitelistedImages((whitelistedImages as whitelistedImage[]).filter(image => image.source !== source));
                        browser.storage.local.set({ whitelistedImages: whitelistedImages });
                    });
            }}>Remove</button>
        </div>
    );
};

export const CustomizeSection = () => {
    const [whitelistedImages, setWhitelistedImages] = React.useState([]);
    React.useEffect(() => {
        browser.storage.local.get()
            .then(localStorage => {
                setWhitelistedImages(localStorage.whitelistedImages);
            });
    }, []);
    return (
        <div className="customize-section">
            { whitelistedImages.length > 0 &&
                <div className="whitelist-elements">
                    <label className="whitelist-title">Whitelist</label>
                    {
                        (whitelistedImages as whitelistedImage[]).map((image: whitelistedImage) => (
                            <WhitelistElement thumbnail={ image.thumbnail } source={ image.source } setWhitelistedImages={ setWhitelistedImages }/>
                        ))
                    }
                </div>
            }
        </div>
    );
};
