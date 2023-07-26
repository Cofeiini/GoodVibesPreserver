import _OnBeforeRequestDetails = browser.webRequest._OnBeforeRequestDetails;
import BlockingResponse = browser.webRequest.BlockingResponse;
import _StreamFilterOndataEvent = browser.webRequest._StreamFilterOndataEvent;

interface urlsObject
{
    urls: string[]
}

let urlsData : urlsObject = { urls:['facebook.com','example.org','example.com','twitter.com']};

let db : IDBDatabase;
const dbRequest : IDBOpenDBRequest = window.indexedDB.open("urlDatabase",2);

dbRequest.onupgradeneeded = (event) => {
    const database : IDBDatabase = (event.target as IDBOpenDBRequest).result;
    database.createObjectStore('urlList',{keyPath:'id',autoIncrement: true});
}

dbRequest.onsuccess = (event) => {
    db = (event.target as IDBOpenDBRequest).result;
    storeUrlData();
}

dbRequest.onerror = (event) => {
    console.log((event.target as IDBRequest).error)
}

async function storeUrlData()
{
    const transaction : IDBTransaction = db.transaction(['urlList'],'readwrite');
    const storeObject : IDBObjectStore = transaction.objectStore('urlList');
    const data : string[] = urlsData.urls;
    data.forEach(urlString =>{
        const addDataRequest : IDBRequest = storeObject.add({urlString});
        addDataRequest.onsuccess = (event) =>{
            console.log("Added data to IndexedDB");
        }
    
        addDataRequest.onerror = (event) =>{
            console.log(`Failed to add data to IndexedDB, Error: ${(event.target as IDBRequest).error}`);
        }
    })
}

interface dbUrlObject
{
    urlString: string,
    id: number
}

function blockedUrl(hostname : string) : Promise<boolean>
{
    return new Promise<boolean>((resolve,reject) =>{
        const transaction : IDBTransaction = db.transaction(['urlList'],'readonly')
        const storeObject : IDBObjectStore = transaction.objectStore('urlList')
        const getDataRequest : IDBRequest = storeObject.getAll()
    
        getDataRequest.onsuccess = (event) => {
            const data : dbUrlObject[] = (event.target as IDBRequest).result;
            let urlStringArray : string[] = data.map((data) => data.urlString);
            resolve(urlStringArray.includes(hostname));
        }
    }) 
}

function handleRequest(details: _OnBeforeRequestDetails) : BlockingResponse | Promise<BlockingResponse> | void {
    const filter: browser.webRequest.StreamFilter = browser.webRequest.filterResponseData(details.requestId);
    const decoder: TextDecoder = new TextDecoder("utf-8");
    const encoder: TextEncoder = new TextEncoder();

    filter.ondata = async (event: _StreamFilterOndataEvent) => {
        const str: string = decoder.decode(event.data, { stream: true });
        const url : URL = new URL(details.url)
        const isBlocked : boolean = await blockedUrl(url.hostname);
        if(isBlocked) {
            filter.write(encoder.encode("Blocking test"));
        } else {
            filter.write(encoder.encode(str));
        }
        filter.disconnect();
    };

    return {};
}

browser.webRequest.onBeforeRequest.addListener(handleRequest,{ urls: [ "<all_urls>" ], types: [ "main_frame" ] }, [ "blocking" ]);
