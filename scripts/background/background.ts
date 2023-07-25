import _OnBeforeRequestDetails = browser.webRequest._OnBeforeRequestDetails;
import BlockingResponse = browser.webRequest.BlockingResponse;
import _StreamFilterOndataEvent = browser.webRequest._StreamFilterOndataEvent;

let blockedUrls : string[] = [ "facebook.com", "example.com", "example.org" ];

function handleRequest(details: _OnBeforeRequestDetails) : BlockingResponse | Promise<BlockingResponse> | void {
    const filter: browser.webRequest.StreamFilter = browser.webRequest.filterResponseData(details.requestId);
    const decoder: TextDecoder = new TextDecoder("utf-8");
    const encoder: TextEncoder = new TextEncoder();

    filter.ondata = (event: _StreamFilterOndataEvent) => {
        const str: string = decoder.decode(event.data, { stream: true });

        const url : URL = new URL(details.url)
        if(blockedUrls.includes(url.hostname)) {
            filter.write(encoder.encode("Blocking test"));
        } else {
            filter.write(encoder.encode(str));
        }

        filter.disconnect();
    };

    return {};
}

browser.webRequest.onBeforeRequest.addListener(handleRequest,{ urls: [ "<all_urls>" ], types: [ "main_frame" ] }, [ "blocking" ]);
