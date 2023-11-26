import _OnBeforeRequestDetails = browser.webRequest._OnBeforeRequestDetails;
import BlockingResponse = browser.webRequest.BlockingResponse;
import _StreamFilterOndataEvent = browser.webRequest._StreamFilterOndataEvent;
import { filterToken } from "../tools/token";
import { urlFilter, githubResponse, filterResults } from "../tools/interfaces";
import { Optional } from "../tools/optional";
import { messagingMap, message, Action } from "../tools/messaging";
const filtersUrl : string = "https://api.github.com/repos/Cofeiini/GoodVibesPreserver/contents/filters.json?ref=main";
const HTMLResourcesUrls : string[] = [
    "https://api.github.com/repos/Cofeiini/GoodVibesPreserver/contents/htmlresources/blockedsite.html?ref=main",
    "https://api.github.com/repos/Cofeiini/GoodVibesPreserver/contents/htmlresources/blockedelement.html?ref=main",
    "https://api.github.com/repos/Cofeiini/GoodVibesPreserver/contents/htmlresources/blockedelementsmall.html?ref=main"
]

// Session whitelist 

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
    }

    if(!whitelistArray.includes(url))
    {
        whitelistArray.push(url);
    }

    window.sessionStorage.setItem("whitelist",JSON.stringify({ whitelist: whitelistArray }));
}

//


//Local storage setup

const getHTMLResources = async () : Promise<string[]> =>{
    var fetchedResources : string[] = [];
    for(const resourceUrl of HTMLResourcesUrls)
    {
        const response = await fetch(resourceUrl, { 
            headers: {  
                Authorization: `${filterToken}`  
            } 
        });
        const responseJSON : githubResponse = await response.json()
        fetchedResources.push(atob(responseJSON.content))
    }
    return Promise.resolve(fetchedResources);
}

browser.runtime.onInstalled.addListener(() =>{
    getHTMLResources()
    .then((fetchedHTMLResources : string[]) =>{
        browser.storage.local.set({
            whitelist: [],
            blockedAmount: 0,
            blockedSiteHTML: fetchedHTMLResources[0],
            blockedElementHTML: fetchedHTMLResources[1],
            blockedElementSmallHTML: fetchedHTMLResources[2],
        })
    })
})

//


// IndexedDB filters setup

let filters_database : IDBDatabase;
const dbRequest : IDBOpenDBRequest = window.indexedDB.open("filterDatabase",2);

dbRequest.onupgradeneeded = (event) => {
    const database : IDBDatabase = (event.target as IDBOpenDBRequest).result;
    database.createObjectStore('filterList', { keyPath:'id', autoIncrement: true });
}

dbRequest.onsuccess = (event) => {
    filters_database = (event.target as IDBOpenDBRequest).result;
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
        const transaction : IDBTransaction = filters_database.transaction(['filterList'],'readwrite');
        const storeObject : IDBObjectStore = transaction.objectStore('filterList');
        IDBFilters.forEach((filter: urlFilter) => {
            storeObject.add(filter);
        });
    })
}

//


//Messaging system

const sendFilters = (message : message, sender : browser.runtime.MessageSender) =>{
    const senderId = sender.tab?.id || 0;
    const transaction: IDBTransaction = filters_database.transaction(['filterList'], 'readonly');
    const storeObject: IDBObjectStore = transaction.objectStore('filterList');
    const getDataRequest: IDBRequest = storeObject.getAll();
    getDataRequest.onsuccess = (event: Event) => {
        const data : urlFilter[] = (event.target as IDBRequest).result;
        console.log("Asked for filters.")
        browser.storage.local.get()
        .then((result) =>{
            const blockedSign : string = result["blockedElementHTML"];
            const blockedSignSmall : string = result["blockedElementSmallHTML"];
            browser.tabs.sendMessage(senderId,{ 
                action: Action.send_filters, 
                data: {
                    content: {  
                        filters: data, 
                        blockedSign: blockedSign, 
                        blockedSignSmall: blockedSignSmall 
                    }   
                } 
            })
        })
    }
}   

const redirectTab = (message: message, sender: browser.runtime.MessageSender) =>{
    if(sender.tab?.id)
    {
        let targetUrl : string = message.data.content.url;
        console.log(targetUrl);
        const urlParts = targetUrl.split('/');
        updateWhitelist(urlParts[2]); // Updates session storage whitelist so the user doesn't has to keep skipping the filter warning.
        browser.tabs.update(sender.tab.id, {url: targetUrl});
    }
}

browser.runtime.onMessage.addListener((message : message, sender : browser.runtime.MessageSender) =>{
    console.log(`Requested Action: ${message.action}`);
    const requestedAction = messageMap.get(message.action);
    requestedAction(message,sender)
})

const messageMap = new messagingMap([
    [Action.redirect,redirectTab],
    [Action.get_filters,sendFilters],
])

//


// URL blocking

/**
 * 
 * @param hostname Hostname of the URL (The string between https:// and the third /).
 * 
 * @param url Complete URL of the request.
 * 
 * @returns { Promise<filterResults> } Object containing the data of the analysis of the URL after using filters.
 * 
 */

var blockedSiteHTMLString : string;

const isBlockedUrl = async (hostname: string, url: URL) : Promise<filterResults> => {
    let { blockedSiteHTML } = await browser.storage.local.get("blockedSiteHTML");
    blockedSiteHTMLString = blockedSiteHTML;
    let isLocallyWhitelisted, isTemporarilyWhitelisted  = false;
    const sessionWhitelistString = window.sessionStorage.getItem("whitelist");
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
    console.log(`Session whitelist: ${sessionWhitelistString}`);
    console.log(`Temporarily whitelisted: ${isTemporarilyWhitelisted}`);

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

    const transaction: IDBTransaction = filters_database.transaction(['filterList'], 'readonly');
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

/**
 * 
 * @param details Details of the request that the browser is doing.
 * 
 * @returns { BlockingResponse | Promise<BlockingResponse> } Object that decides whether the request is being blocked or not.
 * 
 */

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
        console.log(`On data buffer; ${buffer}`);
    }

    filter.onstop = () => {
        isBlockedUrl(url.hostname, url)
            .then((filteredURL: filterResults) => {
                console.log(filteredURL); //debug
                if(filteredURL.blocked) {
                    browser.tabs.executeScript(details.tabId,{code: `
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
                    })`}); // This script needs to be injected due the browser engine sometimes executing the content script too late and a message to the content script will never be received.
                    
                    const parser = new DOMParser();
                    const serializer = new XMLSerializer();
                    const blockedSiteDOM : Document = parser.parseFromString(blockedSiteHTMLString,'text/html');

                    const urlSpan = new Optional<HTMLElement>(blockedSiteDOM.getElementById("blockedUrl"));
                    const tagsSpan = new Optional<HTMLElement>(blockedSiteDOM.getElementById("blockedUrlTags"));

                    urlSpan.value().textContent = filteredURL.sitename;
                    tagsSpan.value().textContent = filteredURL.tags.join(', ')

                    let decodedHTML : string = serializer.serializeToString(blockedSiteDOM);
                    
                    filter.write(encoder.encode(decodedHTML)); 
                    
                } else {
                    filter.write(buffer);
                }
                filter.close();
            });
    };
    return { cancel: false };
}

browser.webRequest.onBeforeRequest.addListener(handleRequest,{ urls: [ "<all_urls>" ], types: [ "main_frame" ] }, [ "blocking" ]);