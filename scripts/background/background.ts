import { filterToken } from "../tools/token";
import { githubResponse, reportObject, HTMLResources, fallbackResources, imageFilter, failedRequest, feedbackObject } from "../tools/interfaces";
import { messagingMap, browserMessage, Action } from "../tools/messaging";
import SparkMD5 from "spark-md5";
import { v4 as uuidv4 } from "uuid";

//

let reportedImages: imageFilter[] = [];

// Encryption

let publicKey: CryptoKey;

const stringToArrayBuffer = (str: string): ArrayBuffer => {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
};

const clearPEMFormat = (pkPEM: string): string => {
    const removedPEM = /^-----BEGIN PUBLIC KEY-----\n(.*)\n-----END PUBLIC KEY-----/.exec(pkPEM);
    return removedPEM!.at(1)!;
};

let fetchPkCalls: number = 0;
const fetchPkBackoffBase: number = 50;
const fetchPkBackoffCap: number = 15000;
const fetchPublicKey = (): void => {
    fetch("http://localhost:7070/publickey", {
        method: "GET",
    })
        .then(response => response.json())
        .then(async responseJSON => {
            const publicKeyPEM = responseJSON.publicKey;
            const publicKeyRemovedPEM: string = clearPEMFormat(publicKeyPEM);
            const publicKeyArrayBuffer: ArrayBuffer = stringToArrayBuffer(atob(publicKeyRemovedPEM));
            const importedPK: CryptoKey = await crypto.subtle.importKey("spki",
                publicKeyArrayBuffer,
                {
                    name: "RSA-OAEP",
                    hash: { name: "SHA-256" },
                },
                false,
                ["encrypt"]
            );
            publicKey = importedPK;
        })
        .catch(err => {
            console.error(err);
            fetchPkCalls++;
            const backoff = Math.min(fetchPkBackoffCap, fetchPkBackoffBase * (2 ** fetchPkCalls));
            const jitter = Math.random();
            const sleep = backoff * jitter;
            console.log(`Retrying Public Key fetch, sleep: ${sleep}`);
            setTimeout(fetchPublicKey, sleep);
        });
};

const encryptData = (data: string): Promise<ArrayBuffer> => {
    const encodedData: Uint8Array = new TextEncoder().encode(data);
    return crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, encodedData);
};

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

//Local storage setup

let fetchDatabaseCalls: number = 0;
const fetchDatabaseBackoffBase: number = 100;
const fetchDatabaseBackoffCap: number = 20000;
const fetchDatabase = () => {
    browser.storage.sync.get()
        .then((syncStorage) => {
            const userID = syncStorage.userID;
            console.log(`[fetchDatabase] userID: ${userID}`);
            if (!userID) {
                browser.storage.sync.set({ userID: uuidv4() });
            }
            fetch(`http://localhost:7070/getimagefilters?userid=${userID}`, {
                method: "GET",
            })
                .then(response => response.json())
                .then(result => {
                    const databaseImageFilters: imageFilter[] = result.imageFilters.map(({ source, tags, id }: { source: string, tags: string, id: number }) => ({ source, tags, id }));
                    const databaseReportedImages: imageFilter[] = result.reportedImages.map(({ source, tags, id }: { source: string, tags: string, id: number }) => ({ source, tags, id }));
                    reportedImages = databaseReportedImages;
                    browser.storage.local.set({ imageFilters: databaseImageFilters });
                    browser.tabs.query({})
                        .then(tabs => {
                            tabs.forEach(tab => {
                                browser.tabs.sendMessage(tab.id!, { action: Action.update_reported_images, data: { content: { reportedImages: reportedImages } } });
                            });
                        });
                })
                .catch(err => {
                    console.error(err);
                    fetchDatabaseCalls++;
                    const backoff = Math.min(fetchDatabaseBackoffCap, fetchDatabaseBackoffBase * (2 ** fetchDatabaseCalls));
                    const jitter = Math.random();
                    const sleep = backoff * jitter;
                    setTimeout(fetchDatabase, sleep);
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
                blockedAmount: 0,
                documentResources: {
                    gvpReportHTML: fetchedHTMLResources.gvpReportHTML,
                    gvpReportCSS: fetchedHTMLResources.gvpReportCSS,
                    gvpNotificationHTML: fetchedHTMLResources.gvpNotificationHTML,
                    gvpNotificationCSS: fetchedHTMLResources.gvpNotificationCSS,
                    gvpRevealImageHTML: fetchedHTMLResources.gvpRevealImageHTML,
                    gvpRevealImageCSS: fetchedHTMLResources.gvpRevealImageCSS,
                },
                requestQueue: [] as failedRequest[],
                votedImages: [] as number[],
            });
        });
});

//

// IndexedDB filters setup

//

//Messaging system

const sendResources = (message: browserMessage, sender: browser.runtime.MessageSender) => {
    const senderId = sender.tab!.id!;
    browser.storage.local.get()
        .then((result) => {
            const documentResources: HTMLResources = result.documentResources;
            if (!documentResources) { // If the content script tries to fetch the filters before the onInstalled event is completed, this will work as a fallback for that.
                fetchResources(fallbackResources)
                    .then(resources => {
                        browser.tabs.sendMessage(senderId, {
                            action: Action.send_resources,
                            data: {
                                content: {
                                    notificationCSSString: resources.gvpNotificationCSS,
                                    notificationHTMLString: resources.gvpNotificationHTML,
                                    gvpRevealImageHTML: resources.gvpRevealImageHTML,
                                    gvpRevealImageCSS: resources.gvpRevealImageCSS,
                                    imageFilters: result.imageFilters,
                                    votedImages: [],
                                    reportedImages: reportedImages,
                                },
                            },
                        });
                    });
                return;
            }
            browser.tabs.sendMessage(senderId, {
                action: Action.send_resources,
                data: {
                    content: {
                        notificationCSSString: documentResources.gvpNotificationCSS,
                        notificationHTMLString: documentResources.gvpNotificationHTML,
                        gvpRevealImageHTML: documentResources.gvpRevealImageHTML,
                        gvpRevealImageCSS: documentResources.gvpRevealImageCSS,
                        imageFilters: result.imageFilters,
                        votedImages: result.votedImages,
                        reportedImages: reportedImages,
                    },
                },
            });
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

const updateVotedImages = (message: browserMessage): void => {
    browser.storage.local.set({ votedImages: message.data.content.updatedVotedImages });
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
    console.debug(requestData);
    browser.storage.local.get().then((storage) => {
        const requestQueue: failedRequest[] = storage["requestQueue"];
        if (!publicKey) {
            browser.tabs.sendMessage(sender.tab!.id!, { action: Action.make_notification, data: { content: { notificationText: "Missing public key\nFor security, the request will be stored and sent when the extension is able to fetch the public key." } } });
            requestQueue.push({ data: requestData, route: route });
            browser.storage.local.set({ requestQueue: requestQueue });
        }
        encryptData(JSON.stringify(requestData))
            .then(encryptedData => {
                const cipherText = new Uint8Array(encryptedData);
                bufferEncode(cipherText).then(encodedCipher => {
                    console.log(encodedCipher);
                    fetch(`http://localhost:7070/${route}`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
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
};

const sendVotedImages = (message: browserMessage, sender: browser.runtime.MessageSender): void => {
    browser.storage.local.get()
        .then(result => {
            const votedImages: number[] = result["votedImages"];
            const targetImageSrc: string = message.data.content.imageSrc;
            console.log(targetImageSrc);
            const tabId: number = sender.tab!.id!;
            browser.tabs.sendMessage(tabId, { action: Action.reveal_image_prompt, data: { content: { votedImages: votedImages, imageSrc: targetImageSrc, canvasSrc: message.data.content.canvasSrc, recoverID: message.data.content.recoverID } } });
        });
};

const messageMap = new messagingMap([
    [Action.get_resources, sendResources],
    [Action.update_report_queue, updateRequestQueue],
    [Action.update_voted_images, updateVotedImages],
    [Action.make_request, makeRequest],
    [Action.get_voted_images, sendVotedImages],
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
        browser.storage.sync.get()
            .then(syncStorage => {
                const userID = syncStorage.userID;
                console.log(`[Context Menu] userID: ${userID}`);
                if (!userID) {
                    browser.storage.sync.set({ userID: uuidv4() });
                }
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
                                    userID: syncStorage.userID,
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

fetchPublicKey();
fetchDatabase();
