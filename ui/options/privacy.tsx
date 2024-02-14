import * as React from "react";

const PrivacySection = () => {
    return (
        <div className="privacy-section">
            <label className="privacy-title">Privacy Policy</label>
            <div className="privacy-sub-section">
                <label className="privacy-sub-title">User Data</label>
                <p>
                    Good Vibes Preserver does not collect any personal data from users. However, certain non-personal data such as user agent and display data are utilized to ensure the proper functioning of the extension. Each user is assigned a random UUID for identification purposes.
                </p>
            </div>
            <div className="privacy-sub-section">
                <label className="privacy-sub-title">3rd Party Services</label>
                <p>
                    Good Vibes Preserver utilizes the Web Storage API (including Local Storage, Session Storage, and Sync Storage) to store user preferences, whitelisted elements, settings, statistics, and UI resources.
                </p>
            </div>
            <div className="privacy-sub-section">
                <label className="privacy-sub-title">Good Vibes Preserver Server</label>
                <p>
                    Actions performed by users within the extension, such as reports and votes, are stored in our secure database. These data help improve the extension's functionality and user experience. Additionally, image filters are fetched from the same database.
                </p>
                <p>
                    Each time you report an image, a request with the source of the image and your user ID is sent to the server.
                </p>
                <p>
                    When you vote on a reported image, almost the same procedure is taken. A request with the vote values, the image source and your user ID is sent to the server.
                </p>
                <p>
                    Every request is hashed with asymmetric encryption and using SHA-256 as algorithm.
                </p>
            </div>
        </div>
    );
};

export default PrivacySection;
