import _OnBeforeRequestDetails = browser.webRequest._OnBeforeRequestDetails;
import BlockingResponse = browser.webRequest.BlockingResponse;
import _StreamFilterOndataEvent = browser.webRequest._StreamFilterOndataEvent;
const filtersUrl : string = "https://api.github.com/repos/Cofeiini/GoodVibesPreserver/contents/filters.json?ref=test";

// IndexedDB filters setup

interface urlFilter
{
    pattern: RegExp,
    tags:string[],
}

interface filterResults
{
    url: URL,
    sitename: string,
    tags : string | string[],
    blocked: boolean,
}

interface githubResponse {
    "type": string,
    "size": number,
    "name": string,
    "path": string,
    "content": string,
    "sha": string,
    "url": string,
    "git_url": string | null,
    "html_url": string | null,
    "download_url": string | null,
    "_links": {
        "git": string,
        "html": string,
        "self": string
    }
}

let db : IDBDatabase;
const dbRequest : IDBOpenDBRequest = window.indexedDB.open("filterDatabase",2);

dbRequest.onupgradeneeded = (event) => {
    const database : IDBDatabase = (event.target as IDBOpenDBRequest).result;
    database.createObjectStore('filterList',{keyPath:'id',autoIncrement: true});
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
            Authorization:`<(￣︶￣)↗ token here`
        }
    }).then(response => response.json())
        .then((responseJSON: githubResponse) => {
            const filtersBase64 : string = responseJSON.content;
            const filtersString : string = atob(filtersBase64);
            const IDBFilters : urlFilter[] = JSON.parse(filtersString);
            const transaction : IDBTransaction = db.transaction(['filterList'],'readwrite');
            const storeObject : IDBObjectStore = transaction.objectStore('filterList');
            IDBFilters.forEach((filter: urlFilter) => {
                storeObject.add(filter);
            });
        });
}

// URL blocking
const isBlockedUrl = async (hostname: string, url: URL) : Promise<filterResults> => {
    const transaction: IDBTransaction = db.transaction(['filterList'], 'readonly')
    const storeObject: IDBObjectStore = transaction.objectStore('filterList')
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

    return await promise.then((results: filterResults) => {
        return results;
    });
}

const handleRequest = (details: _OnBeforeRequestDetails) : BlockingResponse | Promise<BlockingResponse> | void => {
    const filter: browser.webRequest.StreamFilter = browser.webRequest.filterResponseData(details.requestId);
    const encoder: TextEncoder = new TextEncoder();

    const url : URL = new URL(details.url);
    console.log(url);

    let buffer : Uint8Array = new Uint8Array();
    filter.ondata = (event: _StreamFilterOndataEvent) => {
        const temp: Uint8Array = new Uint8Array(buffer.byteLength + event.data.byteLength);
        temp.set(buffer);
        temp.set(new Uint8Array(event.data), buffer.byteLength);
        buffer = temp;
    }

    filter.onstop = () => {
        const ignoringFilter : boolean = url.searchParams.get("skipfilter") !== null;
        console.log(ignoringFilter);

        isBlockedUrl(url.hostname, url)
            .then((filteredURL: filterResults) => {
                console.log(filteredURL);
                if(filteredURL.blocked && !ignoringFilter) {
                    filteredURL.url.searchParams.set("skipfilter", "true");
                    filter.write(encoder.encode(
                        `
                        <body style="background-color: rgb(145,26,26)">
                        <div style="text-align: center">
                        <h1>The site ${filteredURL.sitename} is considered a dangerous website.</h1>
                        <h2>It is considered a site that contains: ${filteredURL.tags}</h2>
                        <a href="${filteredURL.url.href}" style="text-decoration: none; background-color: rgb(80,10,10); border-radius: 5px; color: black; padding: 5px">Proceed anyways</a>
                        </div>
                        </body>
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



