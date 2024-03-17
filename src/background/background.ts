import { backoffObject, feedbackObject, imageFilter, reportObject, whitelistedImage } from "../tools/interfaces";
import { Action, browserMessage, messagingMap } from "../tools/messaging";
import SparkMD5 from "spark-md5";
import { clearPEMFormat, encryptData, stringToArrayBuffer } from "./encryption";
import { tagsLookup } from "../content/tags";
import { v4 as uuidv4 } from "uuid";
import makeThumbnail from "./makethumbnail";
import gvpReportHTML from "../../htmlresources/gvp-report.txt";
import gvpReportCSS from "../../htmlresources/gvp-report-style.txt";
import gvpNotificationHTML from "../../htmlresources/gvp-notification.txt";
import gvpNotificationCSS from "../../htmlresources/gvp-notification-style.txt";
import gvpRevealImageHTML from "../../htmlresources/gvp-revealimage.txt";
import gvpRevealImageCSS from "../../htmlresources/gvp-revealimage-style.txt";

let imageFilters: imageFilter[] = [];
let reportedImages: imageFilter[] = [];
let votedImages: string[] = [];
let accessToken: string = "";
let publicKey: CryptoKey;

// Encryption
const getUserID = async (): Promise<string> => {
    let { userID } = await browser.storage.sync.get();
    if (!userID) {
        userID = uuidv4();
        browser.storage.sync.set({ userID: userID });
    }
    return userID;
};

const accessTokenBackoff: backoffObject = {
    calls: 0,
    base: 50,
    cap: 10000,
};
const getAccessToken = async (): Promise<void> => {
    try {
        const userID = await getUserID();
        const serverResponse = await fetch("https://goodvibespreserver-2acc4db954fc.herokuapp.com/globalToken", {
            method: "GET",
            headers: {
                userid: userID,
            },
        });
        const serverResponseJSON = await serverResponse.json();
        setTimeout(getAccessToken, 295000);
        accessToken = serverResponseJSON.accessToken;
    } catch (err) {
        accessTokenBackoff.calls++;
        const backoff = Math.min(accessTokenBackoff.cap, accessTokenBackoff.base * (2 ** accessTokenBackoff.calls));
        const jitter = Math.random();
        const sleep = backoff * jitter;
        setTimeout(getAccessToken, sleep);
    }
};

const getRequestToken = async (): Promise<string> => {
    const userID = await getUserID();
    const authResponse = await fetch("https://goodvibespreserver-2acc4db954fc.herokuapp.com/requestToken", {
        method: "GET",
        headers: {
            userid: userID,
            auth: accessToken,
        },
    });
    const authResponseJSON = await authResponse.json();
    return authResponseJSON.requestToken;
};

const publicKeyBackoff: backoffObject = {
    calls: 0,
    base: 50,
    cap: 15000,
};
const fetchPublicKey = () => {
    getRequestToken().then(requestToken => {
        getUserID().then(userID => {
            fetch("https://goodvibespreserver-2acc4db954fc.herokuapp.com/publickey", {
                method: "GET",
                headers: {
                    userid: userID,
                    auth: requestToken,
                },
            }).then(response => response.json()).then(async responseJSON => {
                const publicKeyArrayBuffer = stringToArrayBuffer(atob(clearPEMFormat(responseJSON.publicKey)));
                publicKey = await crypto.subtle.importKey("spki",
                    publicKeyArrayBuffer,
                    {
                        name: "RSA-OAEP",
                        hash: { name: "SHA-256" },
                    },
                    false,
                    ["encrypt"]
                );
            }).catch(err => {
                console.error(err);
                publicKeyBackoff.calls++;
                const backoff = Math.min(publicKeyBackoff.cap, publicKeyBackoff.base * (2 ** publicKeyBackoff.calls));
                const jitter = Math.random();
                const sleep = backoff * jitter;
                setTimeout(fetchPublicKey, sleep);
            });
        });
    });
};

const databaseBackoff: backoffObject = {
    calls: 0,
    base: 50,
    cap: 15000,
};
const fetchDatabase = () => {
    getRequestToken().then(requestToken => {
        getUserID().then(userID => {
            fetch("https://goodvibespreserver-2acc4db954fc.herokuapp.com/getimagefilters", {
                method: "GET",
                headers: {
                    userid: userID,
                    auth: requestToken,
                },
            }).then(response => response.json()).then(result => {
                reportedImages = result.reportedImages.map(({ source, tags, id }: { source: string, tags: string, id: number }) => ({ source, tags, id }));
                browser.storage.local.set({ reportedImagesAmount: reportedImages.length });

                votedImages = result.userVotes;
                imageFilters = result.imageFilters.map(({ source, tags, id }: { source: string, tags: string, id: number }) => ({ source, tags, id }));
                browser.tabs.query({}).then(tabs => {
                    tabs.forEach(tab => {
                        if (tab.url?.startsWith("about:")) {
                            return;
                        }

                        browser.tabs.sendMessage(tab.id!, { action: Action.update_reported_images, data: { content: { reportedImages: reportedImages, votedImages: votedImages, imageFilters: imageFilters } } });
                    });
                });
            }).catch(err => {
                console.error(err);
                databaseBackoff.calls++;
                const backoff = Math.min(databaseBackoff.cap, databaseBackoff.base * (2 ** databaseBackoff.calls));
                const jitter = Math.random();
                const sleep = backoff * jitter;
                setTimeout(fetchDatabase, sleep);
            });
        });
    });
};

browser.runtime.onInstalled.addListener(() => {
    browser.storage.sync.get().then(syncStorage => {
        if (!syncStorage.userID) {
            browser.storage.sync.set({ userID: uuidv4() });
        }
    });

    browser.storage.local.set({
        whitelist: [] as string[],
        whitelistedImages: [] as whitelistedImage[],
        extensionOn: true,
        votingEnabled: true,
        blockedImagesAmount: 0,
        hatespeech: true,
        extremism: true,
        misinformation: true,
        offensivehumor: true,
        sexualcontent: true,
        harassment: true,
        gore: true,
        drugs: true,
        selfharm: true,
        shockingcontent: true,
    });
});

//Messaging system
const sendResources = async (_message: browserMessage, sender: browser.runtime.MessageSender) => {
    const { sessionWhitelistedImages } = await browser.storage.session.get();
    const localStorage = await browser.storage.local.get();
    const tagSettings = tagsLookup.filter(tag => !localStorage[tag]);

    const senderId = sender.tab!.id!;
    browser.tabs.sendMessage(senderId, {
        action: Action.send_resources,
        data: {
            content: {
                notificationCSSString: gvpNotificationCSS,
                notificationHTMLString: gvpNotificationHTML,
                gvpRevealImageHTML: gvpRevealImageHTML,
                gvpRevealImageCSS: gvpRevealImageCSS,
                imageFilters: imageFilters,
                votedImages: votedImages,
                reportedImages: reportedImages,
                extensionOn: localStorage.extensionOn,
                votingEnabled: localStorage.votingEnabled,
                localWhitelist: localStorage.whitelistedImages,
                sessionWhitelist: sessionWhitelistedImages,
                tagSettings: tagSettings,
            },
        },
    });
};

const bufferEncode = async (buffer: Uint8Array) => {
    let base64url: string | ArrayBuffer | null = await new Promise(executor => {
        const reader = new FileReader();
        reader.onload = () => executor(reader.result);
        reader.readAsDataURL(new Blob([buffer]));
    });

    if (!base64url) {
        return "";
    }

    if (base64url instanceof ArrayBuffer) {
        base64url = new TextDecoder("utf-8").decode(base64url);
    }

    return base64url.slice(base64url.indexOf(",") + 1);
};

const makeRequest = (message: browserMessage, sender: browser.runtime.MessageSender): void => {
    const route: string = message.data.content.route;
    const requestData: reportObject | feedbackObject = message.data.content.requestData;
    getUserID().then(userID => {
        requestData.userID = userID;
        return getRequestToken();
    }).then(requestToken => {
        if (!publicKey) {
            browser.tabs.sendMessage(sender.tab!.id!, { action: Action.make_notification, data: { content: { notificationText: "Error, please try again later.\n" } } });
        }

        encryptData(JSON.stringify(requestData), publicKey).then(encryptedData => {
            const cipherText = new Uint8Array(encryptedData);
            bufferEncode(cipherText).then(encodedCipher => {
                fetch(`https://goodvibespreserver-2acc4db954fc.herokuapp.com/${route}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "auth": requestToken,
                    },
                    body: JSON.stringify({ data: encodedCipher }),
                }).then(() => {
                    fetchDatabase();
                }).catch((error) => {
                    console.error(error);
                    browser.tabs.sendMessage(sender.tab!.id!, { action: Action.make_notification, data: { content: { notificationText: "Failed to communicate with server.\n" } } });
                });
            });
        }).catch(error => console.error(`Encryption error: ${error}`));
    });
};

const handleSetting = async (message: browserMessage) => {
    const { extensionOn } = await browser.storage.local.get();
    browser.contextMenus.update("gvp-report-image", {
        enabled: (message.data.content.setting === "extensionOn") ? !extensionOn : extensionOn,
    });

    const { [message.data.content.setting]: value } = await browser.storage.local.get();
    browser.storage.local.set({ [message.data.content.setting]: !value });

    browser.tabs.query({}).then(tabs => {
        tabs.forEach(tab => {
            browser.tabs.sendMessage(tab!.id!, { action: Action.update_settings, data: { content: { [message.data.content.setting]: !value } } });
        });
    });
};

const handleTagSetting = async (message: browserMessage) => {
    const targetTag: string = message.data.content.tag;
    const { [targetTag]: currentValue } = await browser.storage.local.get();
    browser.storage.local.set({ [targetTag]: !currentValue });
};

const updateBlockedImages = async () => {
    const { blockedImagesAmount } = await browser.storage.local.get();
    browser.storage.local.set({ blockedImagesAmount: blockedImagesAmount + 1 });
};

const updateRevealedImages = async (message: browserMessage) => {
    if (message.data.content.whitelist) {
        const { whitelistedImages } = await browser.storage.local.get();
        const thumbnail = await makeThumbnail(message.data.content.base64src);
        whitelistedImages.push({ source: message.data.content.source, thumbnail: thumbnail });
        browser.storage.local.set({ whitelistedImages: whitelistedImages });
    } else {
        const { sessionWhitelistedImages } = await browser.storage.session.get();
        sessionWhitelistedImages.push(message.data.content.source);
        browser.storage.session.set({ sessionWhitelistedImages: sessionWhitelistedImages });
    }
};

const messageMap = new messagingMap([
    [Action.get_resources, sendResources],
    [Action.make_request, makeRequest],
    [Action.setting, handleSetting],
    [Action.update_blocked_images, updateBlockedImages],
    [Action.revealed_image, updateRevealedImages],
    [Action.setting_tag, handleTagSetting],
]);

browser.runtime.onMessage.addListener((message: browserMessage, sender: browser.runtime.MessageSender) => {
    const requestedAction = messageMap.get(message.action);
    requestedAction(message, sender);
});

// Report system
browser.contextMenus.create({
    id: "gvp-report-image",
    title: "Report Image",
    contexts: ["image"],
});

browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== "gvp-report-image") {
        return;
    }

    getUserID().then(userID => {
        const srcUrl = info.srcUrl;
        if (!srcUrl) {
            return;
        }

        const img = new Image();
        img.setAttribute("crossOrigin", "anonymous");
        img.onload = () => {
            const imageWidth = img.naturalWidth;
            const imageHeight = img.naturalHeight;
            let imageData = srcUrl;

            const canvas = document.createElement("canvas");
            canvas.width = imageWidth;
            canvas.height = imageHeight;
            const context = canvas.getContext("2d");
            if (context) {
                context.drawImage(img, 0, 0);
                imageData = canvas.toDataURL("image/png")!;
            }

            const tabId = tab!.id!;
            const reportSrc = SparkMD5.hash(imageData);
            browser.tabs.sendMessage(tabId, {
                action: Action.reporting_image, data: {
                    content: {
                        src: reportSrc,
                        userID: userID,
                        reportCSS: gvpReportCSS,
                        reportHTML: gvpReportHTML,
                        base64src: srcUrl,
                    },
                },
            });
        };
        img.src = srcUrl;
    });
});

getAccessToken().then(() => {
    browser.storage.session.set({ sessionWhitelistedImages: [] as string[] });
    fetchPublicKey();
    fetchDatabase();
});
