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
            Authorization:`<(￣︶￣)↗ token here`
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

// URL blocking

function isBlockedUrl(hostname : string,url : URL) : Promise<filterResults>
{
    return new Promise<filterResults>((resolve,reject) =>{
        const transaction : IDBTransaction = db.transaction(['filterList'],'readonly')
        const storeObject : IDBObjectStore = transaction.objectStore('filterList')
        const getDataRequest : IDBRequest = storeObject.getAll()
    
        getDataRequest.onsuccess = (event) => {
            const data : urlFilter[] = (event.target as IDBRequest).result;
            data.forEach(filter => {
                if(hostname.match(filter.pattern)) { resolve({"sitename":hostname,"tags":filter.tags,"blocked":true,"url":url}) }
            })
            resolve({"sitename":"","tags":"","blocked":false,"url":url});
        }
    }) 
}

let isFiltered : boolean;

function handleRequest(details: _OnBeforeRequestDetails) : BlockingResponse | Promise<BlockingResponse> | void {
    const filter: browser.webRequest.StreamFilter = browser.webRequest.filterResponseData(details.requestId);
    const decoder: TextDecoder = new TextDecoder("utf-8");
    const encoder: TextEncoder = new TextEncoder();

    filter.ondata = async(event: _StreamFilterOndataEvent) => {
        const str: string = decoder.decode(event.data, { stream: true });
        const url : URL = new URL(details.url)
        console.log(url);
        const ignoringFilter : boolean =  url.searchParams.get("skipfilter") ? true : false
        console.log(ignoringFilter);
        const isBlocked : filterResults = await isBlockedUrl(url.hostname,url);
        if(isBlocked.blocked && !ignoringFilter) {
            isBlocked.url.searchParams.set("skipfilter","true");
            filter.write(encoder.encode(
                `
                <body style="background-color: rgb(145,26,26)">
                <center>
                <h1>The site ${isBlocked.sitename} is considered a dangerous website.</h1>
                <h2>It is considered a site that contains: ${isBlocked.tags}</h2>
                <a href="${isBlocked.url.href}" style="text-decoration: none; background-color: rgb(80,10,10); border-radius: 5px; color: black; padding: 5px">Proceed anyways</a>
                </center>
                </body>
                `
            ));
            isFiltered = true;
            return {};
        } else {
            filter.write(encoder.encode(str));
        }
        filter.disconnect();
    }

    return {cancel : isFiltered};
}

browser.webRequest.onBeforeRequest.addListener(handleRequest,{ urls: [ "<all_urls>" ], types: [ "main_frame" ] }, [ "blocking" ]);



