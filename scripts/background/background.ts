import _OnBeforeRequestDetails = browser.webRequest._OnBeforeRequestDetails;
import BlockingResponse = browser.webRequest.BlockingResponse;
import _StreamFilterOndataEvent = browser.webRequest._StreamFilterOndataEvent;
const filtersUrl : string = "https://api.github.com/repos/Cofeiini/GoodVibesPreserver/contents/filters.json?ref=test";
import { urlFilter, githubResponse, filterResults } from "../tools/interfaces";

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
            Authorization:`token `
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

const handleRequest = (details: _OnBeforeRequestDetails) : BlockingResponse | Promise<BlockingResponse> | void => {
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
                                        <button class="proceed-button">Proceed Anyways</button>
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
                        .proceed-button
                        {
                            border: none;
                            color: white;
                            background-color: rgba(0,0,0,0);
                            text-decoration: underline;
                            cursor: pointer;
                        }
                        .proceed-button:hover
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