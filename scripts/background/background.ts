import _OnBeforeRequestDetails = browser.webRequest._OnBeforeRequestDetails;
import BlockingResponse = browser.webRequest.BlockingResponse;
import _StreamFilterOndataEvent = browser.webRequest._StreamFilterOndataEvent;
const filtersUrl : string = "https://api.github.com/repos/Cofeiini/GoodVibesPreserver/contents/filters.json?ref=main";
import { filterToken } from "../tools/interfaces";
import { urlFilter, githubResponse, filterResults } from "../tools/interfaces";
//Extension status

let extensionOn : boolean = true;

browser.runtime.onMessage.addListener((message : any) =>{
    if(message.data.action === "redirect")
    {
        console.log("Proceed called");
        let targetId : number = Number(message.data.id);
        let targetUrl : string = message.data.url;
        skippingTabs.add(targetId);
        browser.tabs.update(targetId, {url: targetUrl});
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

const isBlockedUrl = async (hostname: string, url: URL, ignoringFilter : boolean) : Promise<filterResults> => {
    let isWhitelisted : boolean = false;
    const whitelistStorage = await browser.storage.local.get("whitelist");
    const whitelist : string[] = whitelistStorage.whitelist;

    const matches : RegExpMatchArray | null = url.toString().match(/(?:www\.)?([\w\-.]+\.\w{2,})/);
    const address : string | undefined = matches?.[0];
    if(address) { isWhitelisted = whitelist.includes(address) }

    if( isWhitelisted || ignoringFilter)
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

let blockedContentTabs : Set<number> = new Set();
let skippingTabs : Set<number> = new Set();

const handleRequest = (details: _OnBeforeRequestDetails) : BlockingResponse | Promise<BlockingResponse> | void => {
    if(skippingTabs.has(details.tabId)) { skippingTabs.delete(details.tabId); return; }
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
        const ignoringFilter : boolean = url.searchParams.get("skipfilter") !== null;
        console.log(ignoringFilter); //debug

        isBlockedUrl(url.hostname, url, ignoringFilter)
            .then((filteredURL: filterResults) => {
                console.log(filteredURL); //debug
                if(filteredURL.blocked) {
                    filteredURL.url.searchParams.set("skipfilter", "true");
                    blockedContentTabs.add(details.tabId);
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

const messageTab = (tabId : number) =>{
    if(blockedContentTabs.has(tabId))
    {
        browser.tabs.sendMessage(tabId,{action: "add_listener", id: tabId})
        .then(() => blockedContentTabs.delete(tabId));
    }
}

browser.tabs.onUpdated.addListener(messageTab);


browser.webRequest.onBeforeRequest.addListener(handleRequest,{ urls: [ "<all_urls>" ], types: [ "main_frame" ] }, [ "blocking" ]);