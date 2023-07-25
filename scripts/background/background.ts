let blockedUrls : string[] = ["facebook.com","example.org"]

browser.runtime.onInstalled.addListener(details => {
    browser.storage.local.set({
        blockedUrls: blockedUrls
    })
})

browser.storage.local.get(data =>{
    if(data.blockedUrls)
    {
        blockedUrls = data.blockedUrls;
    }
})

browser.storage.onChanged.addListener(changedData =>{
    blockedUrls = changedData.blockedUrls.newValue;
})

browser.webRequest.onBeforeRequest.addListener(handleRequest,{urls: ["<all_urls>"]});

function handleRequest(requestInfo : browser.webRequest._OnBeforeRequestDetails) : Object
{
    const url : URL = new URL(requestInfo.url)
    if(blockedUrls.includes(url.hostname))
    {
        return {type:"http",host:"127.0.0.1",port:8080};
    }

    return {type: "direct"}
}
