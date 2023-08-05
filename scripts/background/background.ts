import _OnBeforeRequestDetails = browser.webRequest._OnBeforeRequestDetails;
import BlockingResponse = browser.webRequest.BlockingResponse;
import _StreamFilterOndataEvent = browser.webRequest._StreamFilterOndataEvent;
import * as dotenv from "dotenv"

dotenv.config({path: `.../.env`})

const token = process.env.TOKEN;

interface urlFilter
{
    url: RegExp,
    tags:string[],
}

let urlsData : urlFilter[] = [{url:/^facebook\.[a-z]{2,}$/,tags:["sus"]},{url:/^xvideos\.[a-z]{2,}$/,tags:["sus"]},{url:/^example\.[a-z]{2,}$/,tags:["sus"]}];

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

function storeUrlData()
{
    const transaction : IDBTransaction = db.transaction(['filterList'],'readwrite');
    const storeObject : IDBObjectStore = transaction.objectStore('filterList');
    const data : urlFilter[] = urlsData;
    data.forEach(filter =>{
        const addDataRequest : IDBRequest = storeObject.add(filter);
        addDataRequest.onsuccess = (event) => {
            console.log("Added data to IndexedDB");
        }
    
        addDataRequest.onerror = (event) => {
            console.log(`Failed to add data to IndexedDB, Error: ${(event.target as IDBRequest).error}`);
        }
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
