import _OnBeforeRequestDetails = browser.webRequest._OnBeforeRequestDetails;
import BlockingResponse = browser.webRequest.BlockingResponse;
import _StreamFilterOndataEvent = browser.webRequest._StreamFilterOndataEvent;
const filtersUrl : string = "https://api.github.com/repos/Cofeiini/GoodVibesPreserver/contents/filters.json?ref=test";

interface urlFilter
{
    url: RegExp,
    tags:string[],
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

async function storeUrlData()
{

    const response = await fetch(filtersUrl,{
        headers:{
            Authorization:`token (TOKEN)`
        }
    })
    const responseJSON = await response.json();
    const filtersBase64 : string = responseJSON.content;
    const filtersString : string = atob(filtersBase64);
    const IDBFilters : urlFilter[] = JSON.parse(filtersString);
    const transaction : IDBTransaction = db.transaction(['filterList'],'readwrite');
    const storeObject : IDBObjectStore = transaction.objectStore('filterList');
    IDBFilters.forEach(filter =>{
        storeObject.add(filter);
    })
}


function isBlockedUrl(hostname : string) : Promise<boolean>
{
    return new Promise<boolean>((resolve,reject) =>{
        const transaction : IDBTransaction = db.transaction(['filterList'],'readonly')
        const storeObject : IDBObjectStore = transaction.objectStore('filterList')
        const getDataRequest : IDBRequest = storeObject.getAll()
    
        getDataRequest.onsuccess = (event) => {
            const data : urlFilter[] = (event.target as IDBRequest).result;
            data.forEach(filter => {
                if(hostname.match(filter.url)) { resolve(true) }
            })
            resolve(false);
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
        const isBlocked : boolean = await isBlockedUrl(url.hostname);
        if(isBlocked) {
            filter.write(encoder.encode("Blocking test"));
        } else {
            filter.write(encoder.encode(str));
        }
        filter.disconnect();
    }

    return {};
}

browser.webRequest.onBeforeRequest.addListener(handleRequest,{ urls: [ "<all_urls>" ], types: [ "main_frame" ] }, [ "blocking" ]);
