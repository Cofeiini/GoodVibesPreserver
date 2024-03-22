import * as React from "react";
import { whitelistedImage } from "../../src/tools/interfaces";
import { Action } from "../../src/tools/messaging";
import { tagsDisplayText } from "../../src/content/tags";

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

const TagCheckbox = ({ tagName }: { tagName: string }) => {
    const [isChecked, setIsChecked] = React.useState(false);
    React.useEffect(() => {
        const getSettingStatus = async () => {
            const { [tagName]: value } = await browser.storage.local.get();
            setIsChecked(!value);
        };
        getSettingStatus();
    }, []);
    return (
        <div className="custom-checkbox" style={{ backgroundColor: isChecked ? "rgb(210,210,210)" : "rgb(40,40,40)" }} onClick={() => {
            browser.runtime.sendMessage({ action: Action.setting_tag, data: { content: { tag: tagName } } });
            setIsChecked(!isChecked);
        }}>
            <div className="checkbox-indicator" style={{
                transform: isChecked ? "translateX(40px)" : "translateX(0)",
            }}>
            </div>
        </div>
    );
};

const Tag = ({ tagName }: { tagName: string }) => {
    return (
        <>
            <hr/>
            <div className="tag">
                <label className="setting-text">{ tagsDisplayText.get(tagName) }</label>
                <TagCheckbox tagName={ tagName }/>
            </div>
        </>
    );
};

const CustomizeSection = () => {
    const [whitelistedImages, setWhitelistedImages] = React.useState([]);
    React.useEffect(() => {
        browser.storage.local.get()
            .then(localStorage => {
                setWhitelistedImages(localStorage.whitelistedImages);
            });
    }, []);
    return (
        <div className="customize-section">
            <label className="title">Customize</label>
            <div className="select-tags">
                <div className="tags">
                    <label className="sub-title">Whitelist Tags</label>
                    {
                        [...tagsDisplayText.keys()].map(tag => <Tag tagName={ tag } key={ tag }/>)
                    }
                </div>
            </div>
            { whitelistedImages.length > 0 &&
                <div className="whitelist-elements">
                    <label className="sub-title">Whitelisted Images</label>
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
export default CustomizeSection;
