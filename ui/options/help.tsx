import * as React from "react";

const HelpSection = () => {
    return (
        <div className="help-section">
            <label className="title">Help</label>
            <div className="help-content">
                <label className="sub-title">How to use the Good Vibes Preserver</label>
                <div className="help-items">
                    <hr/>
                    <div className="help-reporting">
                        <label className="help-item-title">How to Report:</label>
                        <div>
                            <label className="help-item-text">
                                First, you have to right click the image you want to report and select the "Report Image" item of the context menu.
                            </label>
                            <img src="../../assets/report1.png" className="help-item-image"/>
                        </div>
                        <div>
                            <label className="help-item-text">
                                The report pop-up will show up. You will have to choose the tags that you think that the image has by clicking the checkboxes.
                            </label>
                            <img src="../../assets/report2.png" className="help-item-image"/>
                        </div>
                        <div>
                            <label className="help-item-text">
                                The last step is clicking the "Submit Report" button and sending the report to the server.
                            </label>
                            <img src="../../assets/report3.png" className="help-item-image"/>
                        </div>
                        <div>
                            <label className="help-item-text">
                            After that the image will be part of the server image filters and it will be blocked.
                            </label>
                            <img src="../../assets/report4.png" className="help-item-image"/>
                        </div>
                        <div>
                            <label className="help-item-text">
                                However, you can still reveal or whitelist the image by clicking the blocked image.
                            </label>
                            <img src="../../assets/report5.png" className="help-item-image"/>
                        </div>
                    </div>
                    <hr/>
                    <div className="help-voting">
                        <label className="help-item-title">How to Vote:</label>
                        <div>
                            <label className="help-item-text">
                                <p>
                                    You can vote on images that have been reported by other users.
                                </p>
                                <p>
                                    You have to click on the blocked image and you will see a box with the all the tags and a button for voting negative or positive on it if you
                                    think that the tags do not match the image or there are other tags that match the image.
                                </p>
                                <p>
                                    This is optional and you can just reveal/whitelist the image without having to give us feedback.
                                </p>
                            </label>
                            <img src="../../assets/voting.png" className="help-item-image"/>
                        </div>
                    </div>
                    <hr/>
                    <div className="help-whitelisting">
                        <label className="help-item-title">Whitelisting Images:</label>
                        <div>
                            <label className="help-item-text">
                                The difference between revealing and whitelisting is that whitelisting an image will make that the extension won't
                                block that image anymore unless you remove it from the whitelist section under "Customize".
                            </label>
                            <img src="../../assets/whitelisting.png" className="help-item-image"/>
                        </div>
                    </div>
                    <hr/>
                </div>
            </div>
        </div>
    );
};
export default HelpSection;
