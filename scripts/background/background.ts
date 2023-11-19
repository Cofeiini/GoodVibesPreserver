import _OnBeforeRequestDetails = browser.webRequest._OnBeforeRequestDetails;
import BlockingResponse = browser.webRequest.BlockingResponse;
import _StreamFilterOndataEvent = browser.webRequest._StreamFilterOndataEvent;
import { filterToken } from "../tools/token";
import { urlFilter, githubResponse, filterResults } from "../tools/interfaces";
import { messagingMap, message, Action } from "../tools/messaging";
const filtersUrl : string = "https://api.github.com/repos/Cofeiini/GoodVibesPreserver/contents/filters.json?ref=main";

type whitelist = {
    whitelist: string[]
}


const updateWhitelist = (url : string) : void =>{
    var whitelistString = window.sessionStorage.getItem("whitelist");
    var whitelistArray : string[] = [];
    if(whitelistString) // Checks for URLs already temporarily stored, if not it just creates a new whitelist with the current URL being whitelisted.
    {
        var whitelistObject : whitelist = JSON.parse(whitelistString);
        whitelistArray = whitelistObject.whitelist;
        whitelistArray.push(url);
        const updatedWhitelist : whitelist = {
            whitelist: whitelistArray
        }
        const updatedWhitelistString = JSON.stringify(updatedWhitelist);
        window.sessionStorage.setItem("whitelist",updatedWhitelistString);
        return;
    }

    whitelistArray.push(url);
    const newWhitelist : whitelist = {
        whitelist: whitelistArray
    }
    const newWhitelistString = JSON.stringify(newWhitelist);
    window.sessionStorage.setItem("whitelist",newWhitelistString);
}



//Messaging system

const messageTab = (tabId: number) =>{
    const tabMessage : message = {
        action: Action.add_listener,
        data: {
            content: {
                id: tabId
            }
        }
    }
    browser.tabs.sendMessage(tabId,tabMessage);
}

const redirectTab = (message: message) =>{
    let targetId : number = Number(message.data.content.id);
    let targetUrl : string = message.data.content.url;
    updateWhitelist(targetUrl); // Updates session storage whitelist so the user doesn't has to keep skipping the filter warning.
    browser.tabs.update(targetId, {url: targetUrl});
}

browser.runtime.onMessage.addListener((message : message) =>{
    const requestedAction = messageMap.get(message.action);
    requestedAction(message)
})

const messageMap = new messagingMap([
    [Action.redirect,redirectTab]
])


browser.tabs.onUpdated.addListener((tabId,changeInfo,tab) =>{
    if(changeInfo.status === 'complete')
    {
        messageTab(tabId);
    }
})

//Local storage setup

browser.runtime.onInstalled.addListener(() =>{
    browser.storage.local.set({
        whitelist: [],
        blockedAmount: 0,
    })
    .then(() =>{
        console.log("Local storage created successfully.");
        return;
    })
    .catch(() =>{
        console.log("Failed to create local storage.");
        return;
    })
})

// IndexedDB filters setup

let db : IDBDatabase;
const dbRequest : IDBOpenDBRequest = window.indexedDB.open("filterDatabase",2);

dbRequest.onupgradeneeded = (event) => {
    const database : IDBDatabase = (event.target as IDBOpenDBRequest).result;
    database.createObjectStore('filterList', { keyPath:'id', autoIncrement: true });
}

dbRequest.onsuccess = (event) => {
    db = (event.target as IDBOpenDBRequest).result;
    storeUrlData();
}

dbRequest.onerror = (event) => {
    console.log((event.target as IDBRequest).error)
}

const storeUrlData = () => {
    fetch(filtersUrl,{
        headers: {
            Authorization:`${filterToken}`
        }
    }).then(response => response.json())
    .then((responseJSON: githubResponse) => {
        const filtersString : string = atob(responseJSON.content);
        const IDBFilters : urlFilter[] = JSON.parse(filtersString);
        const transaction : IDBTransaction = db.transaction(['filterList'],'readwrite');
        const storeObject : IDBObjectStore = transaction.objectStore('filterList');
        IDBFilters.forEach((filter: urlFilter) => {
            storeObject.add(filter);
        });
    })
}


// URL blocking

const isBlockedUrl = async (hostname: string, url: URL) : Promise<filterResults> => {
    let isLocallyWhitelisted, isTemporarilyWhitelisted  = false;
    const sessionWhitelistString = window.localStorage.getItem("whitelist");
    let sessionWhitelist : string[] = [];
    if(sessionWhitelistString)
    {
        const sessionWhitelistObject : whitelist = JSON.parse(sessionWhitelistString);
        sessionWhitelist = sessionWhitelistObject.whitelist;
    }
    const localWhitelistStorage = await browser.storage.local.get("whitelist");
    const localWhitelist : string[] = localWhitelistStorage.whitelist;

    const matches : RegExpMatchArray | null = url.toString().match(/(?:www\.)?([\w\-.]+\.\w{2,})/);
    const address : string | undefined = matches?.[0];
    if(address) {
        console.log(address); 
        isLocallyWhitelisted = localWhitelist.includes(address);
        isTemporarilyWhitelisted = sessionWhitelist.includes(address);
    }

    if(isLocallyWhitelisted || isTemporarilyWhitelisted)
    {
        return new Promise((resolve,_) => {
            resolve({
                "sitename": hostname,
                "tags": [],
                "blocked": false,
                "url": url
            });
        })
    }

    const blockedAmountStorage = await browser.storage.local.get("blockedAmount");
    let blockedAmount : number = blockedAmountStorage.blockedAmount;

    const transaction: IDBTransaction = db.transaction(['filterList'], 'readonly');
    const storeObject: IDBObjectStore = transaction.objectStore('filterList');

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
                        "url": url
                    });
                }
            });

            resolve({
                "sitename": "",
                "tags": [""],
                "blocked": false,
                "url": url
            });
        }
    });

    return promise.then((results: filterResults) => {
        return results;
    });
}

const handleRequest = (details: _OnBeforeRequestDetails) : BlockingResponse | Promise<BlockingResponse> | void => {
    console.log(details.tabId);
    const filter: browser.webRequest.StreamFilter = browser.webRequest.filterResponseData(details.requestId);
    const encoder: TextEncoder = new TextEncoder();
    const url : URL = new URL(details.url);
    let buffer : Uint8Array = new Uint8Array();
    filter.ondata = (event: _StreamFilterOndataEvent) => {
        const temp: Uint8Array = new Uint8Array(buffer.byteLength + event.data.byteLength);
        temp.set(buffer);
        temp.set(new Uint8Array(event.data), buffer.byteLength);
        buffer = temp;
    }

    filter.onstop = () => {
        isBlockedUrl(url.hostname, url)
            .then((filteredURL: filterResults) => {
                console.log(filteredURL); //debug
                if(filteredURL.blocked) {
                    filter.write(encoder.encode(
                    `
                        <html>
                            <body>
                                <div class="main-container">
                                    <div class="website-warning">
                                        <h1>The site: <span class="url">${filteredURL.sitename}</span> has been blocked</h1>
                                        <label>It is considered a site that contains: <span class="tags">${filteredURL.tags}</span>. Visiting this site could risk your device or show unpleasant content.<br>
                                        We recommend to avoid this site, if you are sure you can proceed under your own risk, please proceed with caution.</label>
                                    </div>
                                    <div class="proceed-section">
                                        <button id="proceedanyways">Proceed Anyways</button>
                                    </div>
                                </div>
                            </body>
                        </html>
                        <style>
                        h1, h2, label
                        {
                            color: white;
                        }
                        body{
                            background-color: rgb(63, 0, 0);
                            display: flex;
                            justify-content: center;
                        }
                        *
                        {
                            font-family:Arial, Helvetica, sans-serif;
                        }
                        .main-container
                        {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            gap: 10px;
                            background-color: rgb(29, 29, 29);
                            box-shadow: 2px 2px 2px rgba(0, 0, 0, 0.377);
                            border-radius: 5px;
                            width: fit-content;
                        }
                        .website-warning
                        {
                            padding: 20px;
                            border-radius: 5px;
                        }
                        .proceed-section
                        {
                            display: flex;
                            padding: 20px;
                            border-radius: 5px;
                        }
                        #proceedanyways
                        {
                            border: none;
                            color: white;
                            background-color: rgba(0,0,0,0);
                            text-decoration: underline;
                            cursor: pointer;
                        }
                        #proceedanyways:hover
                        {
                            color: grey;
                        }
                        .url, .tags
                        {
                            color: crimson;
                        }
                    </style>
                    `
                    ));
                } else {
                    filter.write(buffer);
                }
                filter.close();
            });
    };
    return { cancel: false };
}

browser.webRequest.onBeforeRequest.addListener(handleRequest,{ urls: [ "<all_urls>" ], types: [ "main_frame" ] }, [ "blocking" ]);