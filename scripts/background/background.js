var blockedUrls = ["facebook.com", "example.org"];
browser.runtime.onInstalled.addListener(function (details) {
    browser.storage.local.set({
        blockedUrls: blockedUrls
    });
});
browser.storage.local.get(function (data) {
    if (data.blockedUrls) {
        blockedUrls = data.blockedUrls;
    }
});
browser.storage.onChanged.addListener(function (changedData) {
    blockedUrls = changedData.blockedUrls.newValue;
});

browser.webRequest.onBeforeRequest.addListener(handleRequest, { urls: ["<all_urls>"] });
function handleRequest(requestInfo) {
    var url = new URL(requestInfo.url);
    if (blockedUrls.includes(url.hostname)) {
        return { type: "http", host: "127.0.0.1", port: 8080 };
    }
    return { type: "direct" };
}
