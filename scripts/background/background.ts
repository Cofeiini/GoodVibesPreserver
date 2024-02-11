import { filterToken } from "../tools/token";
import { githubResponse, reportObject, HTMLResources, fallbackResources, imageFilter, failedRequest, feedbackObject, whitelistedImage, backoffObject } from "../tools/interfaces";
import { messagingMap, browserMessage, Action } from "../tools/messaging";
import SparkMD5 from "spark-md5";
import { stringToArrayBuffer, clearPEMFormat, encryptData } from "./encryption";
import { v4 as uuidv4 } from "uuid";
import makeThumbnail from "./makethumbnail";

//

const HTMLResourcesUrls: HTMLResources = {
    gvpReportHTML: "https://api.github.com/repos/Cofeiini/GoodVibesPreserver/contents/htmlresources/gvp-report.html?ref=main",
    gvpReportCSS: "https://api.github.com/repos/Cofeiini/GoodVibesPreserver/contents/htmlresources/gvp-report.css?ref=main",
    gvpNotificationHTML: "https://api.github.com/repos/Cofeiini/GoodVibesPreserver/contents/htmlresources/gvp-notification.html?ref=main",
    gvpNotificationCSS: "https://api.github.com/repos/Cofeiini/GoodVibesPreserver/contents/htmlresources/gvp-notification.css?ref=main",
    gvpRevealImageHTML: "https://api.github.com/repos/Cofeiini/GoodVibesPreserver/contents/htmlresources/gvp-revealimage.html?ref=main",
    gvpRevealImageCSS: "https://api.github.com/repos/Cofeiini/GoodVibesPreserver/contents/htmlresources/gvp-revealimage.css?ref=main",
};

const fallbackResources: fallbackResources = {
    gvpNotificationCSS: "https://api.github.com/repos/Cofeiini/GoodVibesPreserver/contents/htmlresources/gvp-notification.css?ref=main",
    gvpNotificationHTML: "https://api.github.com/repos/Cofeiini/GoodVibesPreserver/contents/htmlresources/gvp-notification.html?ref=main",
    gvpRevealImageHTML: "https://api.github.com/repos/Cofeiini/GoodVibesPreserver/contents/htmlresources/gvp-revealimage.html?ref=main",
    gvpRevealImageCSS: "https://api.github.com/repos/Cofeiini/GoodVibesPreserver/contents/htmlresources/gvp-revealimage.css?ref=main",
};

//

//

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
    return Promise.resolve(userID);
};

const accessTokenBackoff: backoffObject = {
    calls: 0,
    base: 50,
    cap: 10000,
};

const getAccessToken = async (): Promise<void> => {
    try {
        const userID = await getUserID();
        const serverResponse = await fetch("http://localhost:7070/globalToken", {
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
    return Promise.resolve();
};

const getRequestToken = async (): Promise<string> => {
    const userID = await getUserID();
    const authResponse = await fetch("http://localhost:7070/requestToken", {
        method: "GET",
        headers: {
            userid: userID,
            auth: accessToken,
        },
    });
    const authResponseJSON = await authResponse.json();
    const requestToken = authResponseJSON.requestToken;
    return Promise.resolve(requestToken);
};

const publicKeyBackoff: backoffObject = {
    calls: 0,
    base: 50,
    cap: 15000,
};
const fetchPublicKey = (): void => {
    getRequestToken()
        .then(requestToken => {
            getUserID()
                .then(userID => {
                    fetch("http://localhost:7070/publickey", {
                        method: "GET",
                        headers: {
                            userid: userID,
                            auth: requestToken,
                        },
                    })
                        .then(response => response.json())
                        .then(async responseJSON => {
                            const publicKeyArrayBuffer: ArrayBuffer = stringToArrayBuffer(atob(clearPEMFormat(responseJSON.publicKey)));
                            publicKey = await crypto.subtle.importKey("spki",
                                publicKeyArrayBuffer,
                                {
                                    name: "RSA-OAEP",
                                    hash: { name: "SHA-256" },
                                },
                                false,
                                ["encrypt"]
                            );
                        })
                        .catch(err => {
                            console.error(err);
                            publicKeyBackoff.calls++;
                            const backoff = Math.min(publicKeyBackoff.cap, publicKeyBackoff.base * (2 ** publicKeyBackoff.calls));
                            const jitter = Math.random();
                            const sleep = backoff * jitter;
                            console.log(`Retrying Public Key fetch, sleep: ${sleep}`);
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
    getRequestToken()
        .then(requestToken => {
            getUserID()
                .then(userID => {
                    fetch("http://localhost:7070/getimagefilters", {
                        method: "GET",
                        headers: {
                            userid: userID,
                            auth: requestToken,
                        },
                    })
                        .then(response => response.json())
                        .then(result => {
                            imageFilters = result.imageFilters.map(({ source, tags, id }: { source: string, tags: string, id: number }) => ({ source, tags, id }));
                            reportedImages = result.reportedImages.map(({ source, tags, id }: { source: string, tags: string, id: number }) => ({ source, tags, id }));
                            votedImages = result.userVotes;
                            browser.storage.local.set({ reportedImagesAmount: reportedImages.length });
                            browser.tabs.query({})
                                .then(tabs => {
                                    console.log(tabs);
                                    tabs.forEach(tab => {
                                        browser.tabs.sendMessage(tab.id!, { action: Action.update_reported_images, data: { content: { reportedImages: reportedImages, votedImages: votedImages, imageFilters: imageFilters } } });
                                    });
                                });
                        })
                        .catch(err => {
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

const fetchResources = async (resources: HTMLResources | fallbackResources): Promise<HTMLResources | fallbackResources> => {
    const fetchedResources: HTMLResources | fallbackResources = resources;
    for (const [key, value] of Object.entries(resources)) {
        const response = await fetch(value, {
            headers: {
                Authorization: `${filterToken}`,
            },
        });
        const responseJSON: githubResponse = await response.json();
        fetchedResources[key] = atob(responseJSON.content);
    }
    return Promise.resolve(fetchedResources);
};

browser.runtime.onInstalled.addListener(() => {
    browser.storage.sync.get()
        .then(syncStorage => {
            if (!syncStorage.userID) {
                browser.storage.sync.set({ userID: uuidv4() });
            }
        });
    fetchResources(HTMLResourcesUrls)
        .then((fetchedHTMLResources: HTMLResources | fallbackResources) => {
            browser.storage.local.set({
                whitelist: [] as string[],
                whitelistedImages: [] as whitelistedImage[],
                extensionOn: true,
                votingEnabled: true,
                blockedImagesAmount: 0,
                documentResources: {
                    gvpReportHTML: fetchedHTMLResources.gvpReportHTML,
                    gvpReportCSS: fetchedHTMLResources.gvpReportCSS,
                    gvpNotificationHTML: fetchedHTMLResources.gvpNotificationHTML,
                    gvpNotificationCSS: fetchedHTMLResources.gvpNotificationCSS,
                    gvpRevealImageHTML: fetchedHTMLResources.gvpRevealImageHTML,
                    gvpRevealImageCSS: fetchedHTMLResources.gvpRevealImageCSS,
                },
                requestQueue: [] as failedRequest[],
            });
        });
});

//

//

//Messaging system

const sendResources = async (message: browserMessage, sender: browser.runtime.MessageSender) => {
    const senderId = sender.tab!.id!;
    const localStorage = await browser.storage.local.get();
    const { sessionWhitelistedImages } = await browser.storage.session.get();
    if (!localStorage.documentResources) {
        const resources = await fetchResources(fallbackResources);
        browser.tabs.sendMessage(senderId, {
            action: Action.send_resources,
            data: {
                content: {
                    notificationCSSString: resources.gvpNotificationCSS,
                    notificationHTMLString: resources.gvpNotificationHTML,
                    gvpRevealImageHTML: resources.gvpRevealImageHTML,
                    gvpRevealImageCSS: resources.gvpRevealImageCSS,
                    imageFilters: imageFilters,
                    votedImages: votedImages,
                    reportedImages: reportedImages,
                    extensionOn: localStorage.extensionOn,
                    votingEnabled: localStorage.votingEnabled,
                    localWhitelist: localStorage.whitelistedImages,
                    sessionWhitelist: sessionWhitelistedImages,
                },
            },
        });
        return;
    }

    browser.tabs.sendMessage(senderId, {
        action: Action.send_resources,
        data: {
            content: {
                notificationCSSString: localStorage.documentResources.gvpNotificationCSS,
                notificationHTMLString: localStorage.documentResources.gvpNotificationHTML,
                gvpRevealImageHTML: localStorage.documentResources.gvpRevealImageHTML,
                gvpRevealImageCSS: localStorage.documentResources.gvpRevealImageCSS,
                imageFilters: imageFilters,
                votedImages: votedImages,
                reportedImages: reportedImages,
                extensionOn: localStorage.extensionOn,
                votingEnabled: localStorage.votingEnabled,
                localWhitelist: localStorage.whitelistedImages,
                sessionWhitelist: sessionWhitelistedImages,
            },
        },
    });

};

const updateRequestQueue = async (message: browserMessage): Promise<void> => {
    const storageQueue = await browser.storage.local.get("requestQueue");
    const requestQueue = storageQueue["requestQueue"];
    const tabQueue: failedRequest[] = message.data.content.requestQueue;
    tabQueue.forEach(request => {
        requestQueue.push(request);
    });
    browser.storage.local.set({ requestQueue: requestQueue });
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
    getUserID()
        .then(userID => {
            requestData.userID = userID;
        })
        .then(() => getRequestToken())
        .then((requestToken) => {
            browser.storage.local.get()
                .then((localStorage) => {
                    const requestQueue: failedRequest[] = localStorage["requestQueue"];
                    if (!publicKey) {
                        browser.tabs.sendMessage(sender.tab!.id!, { action: Action.make_notification, data: { content: { notificationText: "Missing public key\nFor security, the request will be stored and sent when the extension is able to fetch the public key." } } });
                        requestQueue.push({ data: requestData, route: route });
                        browser.storage.local.set({ requestQueue: requestQueue });
                    }
                    encryptData(JSON.stringify(requestData), publicKey)
                        .then(encryptedData => {
                            const cipherText = new Uint8Array(encryptedData);
                            bufferEncode(cipherText)
                                .then(encodedCipher => {
                                    fetch(`http://localhost:7070/${route}`, {
                                        method: "POST",
                                        headers: {
                                            "Content-Type": "application/json",
                                            "auth": requestToken,
                                        },
                                        body: JSON.stringify({ data: encodedCipher }),
                                    }).then(response => {
                                        console.log(`Request status: ${response.status}`);
                                        fetchDatabase();
                                    }).catch((error) => {
                                        console.error(error);
                                        browser.tabs.sendMessage(sender.tab!.id!, { action: Action.make_notification, data: { content: { notificationText: "Failed to communicate with server\nAdded request into failed requests queue." } } });
                                        requestQueue.push({ data: requestData, route: route });
                                        browser.storage.local.set({ requestQueue: requestQueue });
                                    });
                                });
                        }).catch(error => console.error(`Encryption error: ${error}`));
                });
        });
};

const handleSetting = async (message: browserMessage) => {
    const { [message.data.content.setting]: value } = await browser.storage.local.get();

    const { extensionOn } = await browser.storage.local.get();
    browser.contextMenus.update("gvp-report-image", {
        enabled: (message.data.content.setting === "extensionOn") ? !extensionOn : extensionOn,
    });

    browser.storage.local.set({ [message.data.content.setting]: !value });
    browser.tabs.query({})
        .then(tabs => {
            tabs.forEach(tab => {
                browser.tabs.sendMessage(tab!.id!, { action: Action.update_settings, data: { content: { [message.data.content.setting]: !value } } });
            });
        });
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
    [Action.update_report_queue, updateRequestQueue],
    [Action.make_request, makeRequest],
    [Action.setting, handleSetting],
    [Action.update_blocked_images, updateBlockedImages],
    [Action.revealed_image, updateRevealedImages],
]);

browser.runtime.onMessage.addListener((message: browserMessage, sender: browser.runtime.MessageSender) => {
    console.log(`Requested Action: ${message.action}`);
    const requestedAction = messageMap.get(message.action);
    requestedAction(message, sender);
});

//

// Report system

browser.contextMenus.create({
    id: "gvp-report-image",
    title: "Report Image",
    contexts: ["image"],
});

browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "gvp-report-image") {
        getUserID()
            .then(userID => {
                browser.storage.local.get()
                    .then(localStorage => {
                        if (info.srcUrl) {
                            const resources: HTMLResources = localStorage.documentResources;
                            console.log(localStorage);
                            const tabId = tab!.id!;
                            const reportedSrc = (/^data/.test(info.srcUrl) ? SparkMD5.hash(info.srcUrl) : info.srcUrl);
                            browser.tabs.sendMessage(tabId, { action: Action.reporting_image, data: {
                                content: {
                                    reportedImages: reportedImages,
                                    src: reportedSrc,
                                    userID: userID,
                                    reportCSS: resources.gvpReportCSS,
                                    reportHTML: resources.gvpReportHTML,
                                    base64src: info.srcUrl,
                                },
                            } });
                        }
                    });
            });
    }
});
//

getAccessToken()
    .then(() => {
        browser.storage.session.set({ sessionWhitelistedImages: [] as string[] });
        fetchPublicKey();
        fetchDatabase();
    });
