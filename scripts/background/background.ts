import _OnBeforeRequestDetails = browser.webRequest._OnBeforeRequestDetails;
import BlockingResponse = browser.webRequest.BlockingResponse;
import _StreamFilterOndataEvent = browser.webRequest._StreamFilterOndataEvent;
import { filterToken } from "../tools/token";
import { urlFilter, githubResponse, filterResults, reportObject, HTMLResources, fallbackResources, imageFilter, failedRequest, feedbackObject } from "../tools/interfaces";
import { Optional } from "../tools/optional";
import { messagingMap, browserMessage, Action } from "../tools/messaging";
import SparkMD5 from "spark-md5";
import { v4 as uuidv4 } from "uuid";

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

const getPublicKey = (): void => {
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
        });
};

getPublicKey();

const encryptData = (data: string): Promise<ArrayBuffer> => {
    return crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, new TextEncoder().encode(data));
};

//

const filtersUrl: string = "https://api.github.com/repos/Cofeiini/GoodVibesPreserver/contents/filters.json?ref=main";

const HTMLResourcesUrls: HTMLResources = {
    blockedSiteHTML: "https://api.github.com/repos/Cofeiini/GoodVibesPreserver/contents/htmlresources/blockedsite.html?ref=main",
    blockedElementHTML: "https://api.github.com/repos/Cofeiini/GoodVibesPreserver/contents/htmlresources/blockedelement.html?ref=main",
    blockedElementSmallHTML: "https://api.github.com/repos/Cofeiini/GoodVibesPreserver/contents/htmlresources/blockedelementsmall.html?ref=main",
    gvpReportHTML: "https://api.github.com/repos/Cofeiini/GoodVibesPreserver/contents/htmlresources/gvp-report.html?ref=main",
    gvpReportCSS: "https://api.github.com/repos/Cofeiini/GoodVibesPreserver/contents/htmlresources/gvp-report.css?ref=main",
    gvpNotificationHTML: "https://api.github.com/repos/Cofeiini/GoodVibesPreserver/contents/htmlresources/gvp-notification.html?ref=main",
    gvpNotificationCSS: "https://api.github.com/repos/Cofeiini/GoodVibesPreserver/contents/htmlresources/gvp-notification.css?ref=main",
    gvpRevealImageHTML: "https://api.github.com/repos/Cofeiini/GoodVibesPreserver/contents/htmlresources/gvp-revealimage.html?ref=main",
    gvpRevealImageCSS: "https://api.github.com/repos/Cofeiini/GoodVibesPreserver/contents/htmlresources/gvp-revealimage.css?ref=main",
};

const fallbackResources: fallbackResources = {
    blockedElementHTML: "https://api.github.com/repos/Cofeiini/GoodVibesPreserver/contents/htmlresources/blockedelement.html?ref=main",
    blockedElementSmallHTML: "https://api.github.com/repos/Cofeiini/GoodVibesPreserver/contents/htmlresources/blockedelementsmall.html?ref=main",
    gvpNotificationCSS: "https://api.github.com/repos/Cofeiini/GoodVibesPreserver/contents/htmlresources/gvp-notification.css?ref=main",
    gvpNotificationHTML: "https://api.github.com/repos/Cofeiini/GoodVibesPreserver/contents/htmlresources/gvp-notification.html?ref=main",
    gvpRevealImageHTML: "https://api.github.com/repos/Cofeiini/GoodVibesPreserver/contents/htmlresources/gvp-revealimage.html?ref=main",
    gvpRevealImageCSS: "https://api.github.com/repos/Cofeiini/GoodVibesPreserver/contents/htmlresources/gvp-revealimage.css?ref=main",
};

// Session whitelist

type whitelist = {
    whitelist: string[]
};

const updateWhitelist = (url: string): void => {
    const whitelistString = window.sessionStorage.getItem("whitelist");
    let whitelistArray: string[] = [];
    if (whitelistString) { // Checks for URLs already temporarily stored, if not it just creates a new whitelist with the current URL being whitelisted.
        const whitelistObject: whitelist = JSON.parse(whitelistString);
        whitelistArray = whitelistObject.whitelist;
    }

    if (!whitelistArray.includes(url)) {
        whitelistArray.push(url);
    }

    window.sessionStorage.setItem("whitelist", JSON.stringify({ whitelist: whitelistArray }));
};

//

//Local storage setup

const fetchDatabase = () => {
    browser.storage.local.get()
        .then((storage) => {
            let userID = storage.userID;
            if (!userID) {
                userID = uuidv4();
                browser.storage.local.set({ userID: userID });
                console.log(`User ID getfilters; ${userID}`);
            }
            fetch(`http://localhost:7070/getimagefilters?userid=${userID}`, {
                method: "GET",
            })
                .then(response => response.json())
                .then(result => {
                    const imageFilters: imageFilter[] = [];
                    for (let i = 0; i < result.reports.length; i++) {
                        imageFilters.push({
                            source: result.reports[i].source,
                            tags: result.reports[i].tags,
                            id: result.reports[i].id,
                        });
                    }
                    browser.storage.local.set({ imageFilters: imageFilters });
                })
                .catch(err => console.error(err));
        });
};

fetchDatabase();

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
    fetchResources(HTMLResourcesUrls)
        .then((fetchedHTMLResources: HTMLResources | fallbackResources) => {
            browser.storage.local.set({
                whitelist: [] as string[],
                blockedAmount: 0,
                documentResources: {
                    gvpReportHTML: fetchedHTMLResources.gvpReportHTML,
                    gvpReportCSS: fetchedHTMLResources.gvpReportCSS,
                    blockedSiteHTML: fetchedHTMLResources.blockedSiteHTML,
                    blockedElementHTML: fetchedHTMLResources.blockedElementHTML,
                    blockedElementSmallHTML: fetchedHTMLResources.blockedElementSmallHTML,
                    gvpNotificationHTML: fetchedHTMLResources.gvpNotificationHTML,
                    gvpNotificationCSS: fetchedHTMLResources.gvpNotificationCSS,
                    gvpRevealImageHTML: fetchedHTMLResources.gvpRevealImageHTML,
                    gvpRevealImageCSS: fetchedHTMLResources.gvpRevealImageCSS,
                },
                reportedImages: [] as string[],
                requestQueue: [] as failedRequest[],
                votedImages: [] as number[],
            });
            browser.storage.local.get("userID")
                .then(result => {
                    if (!result.userID) {
                        browser.storage.local.set({ userID: uuidv4() });
                    }
                });
        });
});

//

// IndexedDB filters setup

let filters_database: IDBDatabase;
const dbRequest: IDBOpenDBRequest = window.indexedDB.open("filterDatabase", 2);

dbRequest.onupgradeneeded = (event) => {
    const database: IDBDatabase = (event.target as IDBOpenDBRequest).result;
    database.createObjectStore("filterList", { keyPath: "id", autoIncrement: true });
};

const storeUrlData = () => {
    fetch(filtersUrl, {
        headers: {
            Authorization: `${filterToken}`,
        },
    }).then(response => response.json())
        .then((responseJSON: githubResponse) => {
            const filtersString: string = atob(responseJSON.content);
            const IDBFilters: urlFilter[] = JSON.parse(filtersString);
            const transaction: IDBTransaction = filters_database.transaction(["filterList"], "readwrite");
            const storeObject: IDBObjectStore = transaction.objectStore("filterList");
            IDBFilters.forEach((filter: urlFilter) => {
                storeObject.add(filter);
            });
        });
};

dbRequest.onsuccess = (event) => {
    filters_database = (event.target as IDBOpenDBRequest).result;
    storeUrlData();
};

dbRequest.onerror = (event) => {
    console.log((event.target as IDBRequest).error);
};

//

//Messaging system

const sendFilters = (message: browserMessage, sender: browser.runtime.MessageSender) => {
    const senderId = sender.tab?.id || 0;
    const transaction: IDBTransaction = filters_database.transaction(["filterList"], "readonly");
    const storeObject: IDBObjectStore = transaction.objectStore("filterList");
    const getDataRequest: IDBRequest = storeObject.getAll();
    getDataRequest.onsuccess = (event: Event) => {
        const data: urlFilter[] = (event.target as IDBRequest).result;
        console.log("Asked for filters.");
        browser.storage.local.get()
            .then((result) => {
                const documentResources: HTMLResources = result.documentResources;
                if (!documentResources) { // If the content script tries to fetch the filters before the onInstalled event is completed, this will work as a fallback for that.
                    console.log("Resources are undefined");
                    fetchResources(fallbackResources)
                        .then(resources => {
                            console.log(resources);
                            browser.tabs.sendMessage(senderId, {
                                action: Action.send_filters,
                                data: {
                                    content: {
                                        filters: data,
                                        blockedSign: resources.blockedElementHTML,
                                        blockedSignSmall: resources.blockedElementSmallHTML,
                                        notificationCSSString: resources.gvpNotificationCSS,
                                        notificationHTMLString: resources.gvpNotificationHTML,
                                        gvpRevealImageHTML: resources.gvpRevealImageHTML,
                                        gvpRevealImageCSS: resources.gvpRevealImageCSS,
                                        imageFilters: result.imageFilters,
                                        votedImages: [],
                                        reportedImages: [],
                                    },
                                },
                            });
                        });
                    return;
                }
                browser.tabs.sendMessage(senderId, {
                    action: Action.send_filters,
                    data: {
                        content: {
                            filters: data,
                            blockedSign: documentResources.blockedElementHTML,
                            blockedSignSmall: documentResources.blockedElementSmallHTML,
                            notificationCSSString: documentResources.gvpNotificationCSS,
                            notificationHTMLString: documentResources.gvpNotificationHTML,
                            gvpRevealImageHTML: documentResources.gvpRevealImageHTML,
                            gvpRevealImageCSS: documentResources.gvpRevealImageCSS,
                            imageFilters: result.imageFilters,
                            votedImages: result.votedImages,
                            reportedImages: result.reportedImages,
                        },
                    },
                });
            });
    };
};

const redirectTab = (message: browserMessage, sender: browser.runtime.MessageSender) => {
    if (sender.tab?.id) {
        const targetUrl: string = message.data.content.url;
        console.log(targetUrl);
        const urlParts = targetUrl.split("/");
        updateWhitelist(urlParts[2]); // Updates session storage whitelist so the user doesn't has to keep skipping the filter warning.
        browser.tabs.update(sender.tab.id, { url: targetUrl });
    }
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

const updateBlockedImages = (message: browserMessage): void => {
    browser.storage.local.set({ reportedImages: message.data.content.updatedBlockedImages });
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
        encryptData(JSON.stringify(requestData)).then(encryptedData => {
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
                }).catch((error) => {
                    console.error(error);
                    browser.tabs.sendMessage(sender.tab!.id!, { action: Action.make_notification, data: { content: { notificationText: "Failed to communicate with server\nAdded request into failed requests queue." } } });
                    requestQueue.push({ data: requestData, route: route });
                    browser.storage.local.set({ requestQueue: requestQueue });
                });
            });
        }).catch(error => console.error(error));
    });
};

const sendVotedImages = (message: browserMessage, sender: browser.runtime.MessageSender): void => {
    browser.storage.local.get()
        .then(result => {
            const votedImages: number[] = result["votedImages"];
            const targetImageSrc: string = message.data.content.imageSrc;
            const tabId: number = sender.tab!.id!;
            browser.tabs.sendMessage(tabId, { action: Action.reveal_image_prompt, data: { content: { votedImages: votedImages, imageSrc: targetImageSrc } } });
        });
};

const messageMap = new messagingMap([
    [Action.redirect, redirectTab],
    [Action.get_filters, sendFilters],
    [Action.update_blocked_images, updateBlockedImages],
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
    title: "Report & Block Image",
    contexts: ["image"],
});

browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "gvp-report-image") {
        browser.storage.local.get()
            .then((result) => {
                if (info.srcUrl) {
                    const resources: HTMLResources = result.documentResources;
                    console.log(result);
                    const tabId = tab!.id!;
                    const reportedSrc = (/^data/.test(info.srcUrl) ? SparkMD5.hash(info.srcUrl) : info.srcUrl);
                    browser.tabs.sendMessage(tabId, { action: Action.reporting_image, data: {
                        content: {
                            reportedImages: result.reportedImages,
                            src: reportedSrc,
                            userID: result.userID,
                            reportCSS: resources.gvpReportCSS,
                            reportHTML: resources.gvpReportHTML,
                            base64src: info.srcUrl,
                        },
                    } });
                }
            });
    }
});
//

// URL blocking

/**
 * @param hostname Hostname of the URL (The string between https:// and the third /).
 * @param url Complete URL of the request.
 * @returns { Promise<filterResults> } Object containing the data of the analysis of the URL after using filters.
 */

let blockedSiteHTMLString: string;

const isBlockedUrl = async (hostname: string, url: URL): Promise<filterResults> => {
    const localStorage = await browser.storage.local.get();
    const resources: HTMLResources = localStorage.documentResources;
    if (!resources) {
        const fallbackResponse = await fetch("https://api.github.com/repos/Cofeiini/GoodVibesPreserver/contents/htmlresources/blockedsite.html?ref=main", {
            headers: {
                Authorization: `${filterToken}`,
            },
        });
        const fallbackJSON: githubResponse = await fallbackResponse.json();
        blockedSiteHTMLString = atob(fallbackJSON.content);
    } else {
        blockedSiteHTMLString = resources.blockedSiteHTML;
    }
    let isTemporarilyWhitelisted = false;
    const sessionWhitelistString = window.sessionStorage.getItem("whitelist");
    let sessionWhitelist: string[] = [];
    if (sessionWhitelistString) {
        const sessionWhitelistObject: whitelist = JSON.parse(sessionWhitelistString);
        sessionWhitelist = sessionWhitelistObject.whitelist;
    }
    const matches: RegExpMatchArray | null = url.toString().match(/(?:www\.)?([\w\-.]+\.\w{2,})/);
    const address: string | undefined = matches?.[0];
    if (address) {
        console.log(address);
        isTemporarilyWhitelisted = sessionWhitelist.includes(address);
    }
    console.log(`Session whitelist: ${sessionWhitelistString}`);
    console.log(`Temporarily whitelisted: ${isTemporarilyWhitelisted}`);

    if (isTemporarilyWhitelisted) {
        return new Promise((resolve, _) => {
            resolve({
                "sitename": hostname,
                "tags": [],
                "blocked": false,
                "url": url,
            });
        });
    }

    const transaction: IDBTransaction = filters_database.transaction(["filterList"], "readonly");
    const storeObject: IDBObjectStore = transaction.objectStore("filterList");
    const promise: Promise<filterResults> = new Promise((resolve, _) => {
        const getDataRequest: IDBRequest = storeObject.getAll();
        getDataRequest.onsuccess = (event: Event) => {
            const data: urlFilter[] = (event.target as IDBRequest).result;
            data.forEach((filter: urlFilter) => {
                if (hostname.match(filter.pattern)) {
                    resolve({
                        "sitename": hostname,
                        "tags": filter.tags,
                        "blocked": true,
                        "url": url,
                    });
                }
            });

            resolve({
                "sitename": "",
                "tags": [""],
                "blocked": false,
                "url": url,
            });
        };
    });

    return promise.then((results: filterResults) => {
        return results;
    });
};

/**
 * @param details Details of the request that the browser is doing.
 * @returns { BlockingResponse | Promise<BlockingResponse> } Object that decides whether the request is being blocked or not.
 */

const handleRequest = (details: _OnBeforeRequestDetails): BlockingResponse | Promise<BlockingResponse> | void => {
    console.log(details.tabId);
    const filter: browser.webRequest.StreamFilter = browser.webRequest.filterResponseData(details.requestId);
    const encoder: TextEncoder = new TextEncoder();
    const url: URL = new URL(details.url);
    let buffer: Uint8Array = new Uint8Array();
    filter.ondata = (event: _StreamFilterOndataEvent) => {
        const temp: Uint8Array = new Uint8Array(buffer.byteLength + event.data.byteLength);
        temp.set(buffer);
        temp.set(new Uint8Array(event.data), buffer.byteLength);
        buffer = temp;
        // Careful with debugging stuff here, this gets called an absurd amount of times when making a navigation request.
    };

    filter.onstop = () => {
        isBlockedUrl(url.hostname, url)
            .then((filteredURL: filterResults) => {
                console.log(filteredURL); //debug
                if (filteredURL.blocked) {
                    browser.tabs.executeScript(details.tabId, { code: `
                    document.getElementById("proceedanyways")?.addEventListener('click', () =>{
                        console.log("Proceed button pressed");
                        let selfUrl = window.location.href;
                        const redirectMessage = {
                            action: Action.redirect,
                            data:{
                                content:{
                                    url: selfUrl,
                                }
                            }
                        }
                        browser.runtime.sendMessage(redirectMessage)
                    })` }); // This script needs to be injected due the browser engine sometimes executing the content script too late and a message to the content script will never be received.
                    const parser = new DOMParser();
                    const serializer = new XMLSerializer();
                    const blockedSiteDOM: Document = parser.parseFromString(blockedSiteHTMLString, "text/html");

                    const urlSpan = new Optional<HTMLElement>(blockedSiteDOM.getElementById("blockedUrl"));
                    const tagsSpan = new Optional<HTMLElement>(blockedSiteDOM.getElementById("blockedUrlTags"));

                    urlSpan.value().textContent = filteredURL.sitename;
                    tagsSpan.value().textContent = filteredURL.tags.join(", ");

                    const decodedHTML: string = serializer.serializeToString(blockedSiteDOM);
                    filter.write(encoder.encode(decodedHTML));
                } else {
                    filter.write(buffer);
                }
                filter.close();
            });
    };
    return { cancel: false };
};

browser.webRequest.onBeforeRequest.addListener(handleRequest, { urls: ["<all_urls>"], types: ["main_frame"] }, ["blocking"]);
