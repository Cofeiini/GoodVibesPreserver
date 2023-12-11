import SparkMD5 from "spark-md5";
import { urlFilter, reportObject } from "../tools/interfaces";
import { messagingMap, browserMessage, Action } from "../tools/messaging";
import { Optional } from "../tools/optional";

let filters: urlFilter[];
let blockedSignString: string;
let blockedSignSmallString: string;
let notificationHTMLString: string;
let notificationStyleString: string;
let reportedImages: string[] = [];
let reportQueue: reportObject[] = [];
let maxZIndex: number = 0;

const getMaxZIndex = (): void => {
    maxZIndex = Math.max(...Array.from(document.querySelectorAll("body div, body img, body nav, body section"), (element) => {
        return parseInt(getComputedStyle(element).zIndex);
    }).filter(zIndex => !Number.isNaN(zIndex)));
    maxZIndex++;
    return;
};

// Element filtering

const blockedElementsSet: Set<{ blockedElement: Element, recoverID: number, url: string }> = new Set();
const blockedImagesSet: Set<{ blockedSource: string, recoverID: number }> = new Set();
const skippedSources: Set<string> = new Set();
let blockedImagesCounter = 0;
let blockedElementsCounter = 0;

/**
 * @param element represents the element that the function will analyze its dimensions.
 * @returns { boolean } for telling whether the warning sign should be the default or smaller one.
 */
const analyzeElement = (element: Element): string => {
    const elementHTML: HTMLElement = (element as HTMLElement);
    if (elementHTML.offsetWidth <= 134 || elementHTML.offsetHeight <= 52){
        return blockedSignSmallString;// 134 pixels of width and 52 pixels of height is the minimum dimensions for the warning sign to look correctly.
    }
    return blockedSignString;
};

/**
 * @param blockedElement Element that is being blocked.
 * @returns { string } representing the HTML of the proper warning sign that replaces the element.
 */

const makeWarning = (blockedElement: Element): string => {
    const parser = new DOMParser();
    const serializer = new XMLSerializer();
    const elementHeight = (blockedElement as HTMLElement).offsetHeight;
    const elementWidth = (blockedElement as HTMLElement).offsetWidth;
    const measuredWarningSize: string = analyzeElement(blockedElement); // analyzeElement returns the proper HTML string depending the parameter element dimensions.
    const newWarningHTML: Document = parser.parseFromString(measuredWarningSize, "text/html");
    const blockedContainer = new Optional<HTMLElement>(newWarningHTML.getElementById("blocked-container-?"));
    const revealButton = new Optional<HTMLElement>(newWarningHTML.getElementById("recover-button-?"));
    if (measuredWarningSize === blockedSignSmallString){
        blockedContainer.value().style.width = elementWidth.toString();
        blockedContainer.value().style.height = elementHeight.toString();
    }
    blockedContainer.value().id = `blocked-container-${blockedElementsCounter}`;
    revealButton.value().id = `recover-button-${blockedElementsCounter}`;
    return serializer.serializeToString(newWarningHTML);
};

const recoverImage = (event: Event): void => {
    event.preventDefault();
    const revealPrompt = window.confirm("Do you want to reveal this image? \nIt could contain unpleasant content.");
    if (revealPrompt){
        const recoverID = Number((event.target as HTMLElement).getAttribute("src-identifier"));
        blockedImagesSet.forEach(element => {
            if (element.recoverID === recoverID){
                (event.target as HTMLImageElement).src = element.blockedSource;
                skippedSources.add(element.blockedSource);
                event.target?.removeEventListener("click", recoverImage);
            }
        });
    }
};

/**
 * @param width Width in pixels of the image that is getting filtered.
 * @param height Height in pixels of the image that is getting filtered.
 * @returns { String } Canvas element that will cover the filtered image.
 */

const generateFilteredImage = (width: number, height: number): string => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const canvasContext = canvas.getContext("2d");
    if (canvasContext){
        const gradient = canvasContext.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, "rgb(10,10,10)");
        gradient.addColorStop(1, "rgb(55,55,55)");
        canvasContext.fillStyle = gradient;
        canvasContext.fillRect(0, 0, width, height);
    }
    console.trace(canvas);
    return canvas.toDataURL("image/png");
};

const filterImage = (image: HTMLImageElement): void => {
    if (!image.getAttribute("src-identifier")){
        const imageWidth = image.naturalWidth;
        const imageHeight = image.naturalHeight;
        const imageSource: string = (/^data/.test(image.src) ? SparkMD5.hash(image.src) : image.src);
        if ((imageWidth > 48 || imageHeight > 48) && !skippedSources.has(image.src) && reportedImages.includes(imageSource)){
            const filteredImage = generateFilteredImage(imageWidth, imageHeight);
            blockedImagesCounter++;
            blockedImagesSet.add({ blockedSource: image.src, recoverID: blockedImagesCounter });
            image.setAttribute("src-identifier", `${blockedImagesCounter}`);
            image.src = filteredImage;
            image.addEventListener("click", recoverImage);
        }
    }
};

const analyzeImages = (images: NodeListOf<Element>): void => {
    images.forEach(image => {
        const imageElement = (image as HTMLImageElement);
        if (imageElement.complete){
            filterImage(imageElement);
            return;
        }

        image.addEventListener("load", () => {
            filterImage(imageElement);
        });
    });
};

const recoverElement = (event: Event): void => {
    console.log("Recover element called");
    const recoverButtonElement: HTMLElement = event.target as HTMLElement;
    const regexID: RegExpExecArray | null = /recover-button-(\d+)/.exec(recoverButtonElement.getAttribute("id") || ""); // Gets the id of the blocked element since we give the same id to the recover button when blocking.
    const recoverID: number = Number(regexID?.at(1));
    const blockedContainer: HTMLElement | null = document.getElementById(`blocked-container-${recoverID}`); // Gets the proper container that represents the blocked element tied to the button.
    blockedElementsSet.forEach(elem => {
        if (elem.recoverID === recoverID){
            if (blockedContainer){
                console.log(elem.blockedElement);
                const recoverPrompt: boolean = window.confirm(`Do you want to recover this element? \n The source of the element comes from a blocked URL: ${elem.url}`);
                if (recoverPrompt){
                    blockedContainer.parentNode?.replaceChild(elem.blockedElement, blockedContainer);// Replaces the blocked element warning sign with the original element.
                }
                return;
            }
        }
    });
};

const analyzeDOM = (): void => {
    const hrefElements: NodeListOf<Element> = document.querySelectorAll("[href]");
    const srcElements: NodeListOf<Element> = document.querySelectorAll("[src]");
    const imgElements: NodeListOf<Element> = document.querySelectorAll("img");
    analyzeImages(imgElements);
    const elementSet: Set<{ element: Element, url: string | null }> = new Set();
    const activeRegEx: RegExp = new RegExp(`${window.location.hostname}`);

    hrefElements.forEach(element => {
        elementSet.add({
            element: element,
            url: element.getAttribute("href"),
        });
    });
    srcElements.forEach(element => {
        elementSet.add({
            element: element,
            url: element.getAttribute("src"),
        });
    });

    filters.forEach(filter => {
        const filterRegExp = new RegExp(filter.pattern);
        elementSet.forEach(DOMElement => {
            const elementUrl = DOMElement.url?.split("/")[2]; // TODO: rework filters, probably add a '^' on the beginning of the pattern because this line is needed to avoid matching URLs with other URLs in the URL parameters.
            if (elementUrl){
                if (filterRegExp.test(elementUrl) && !activeRegEx.test(elementUrl) && !DOMElement.element.hasAttribute("blocked-identifier")){
                    console.log(`Removed element: ${DOMElement.url, DOMElement.element}`);
                    blockedElementsCounter++;
                    blockedElementsSet.add({ blockedElement: DOMElement.element, recoverID: blockedElementsCounter, url: DOMElement.element.getAttribute("href") || DOMElement.element.getAttribute("src") || "" });
                    DOMElement.element.setAttribute("blocked-identifier", "blocked");
                    const warningSign: DocumentFragment = document.createRange().createContextualFragment(makeWarning(DOMElement.element));
                    DOMElement.element.parentNode?.replaceChild(warningSign, DOMElement.element);
                    document.getElementById(`recover-button-${blockedElementsCounter}`)?.addEventListener("click", recoverElement);
                    console.log("Blocked content.");
                }
            }
        });
    });
};

//

// Messaging system

const setupFilters = (message: browserMessage) => {
    console.log(message);
    filters = message.data.content.filters;
    blockedSignString = message.data.content.blockedSign;
    blockedSignSmallString = message.data.content.blockedSignSmall;
    notificationHTMLString = message.data.content.notificationHTMLString;
    notificationStyleString = message.data.content.notificationCSSString;
    reportedImages = message.data.content.reportedImages;
    analyzeDOM(); // Call analyzeDOM() to run the first analysis of the website after filters are fetched. Some websites might not have mutations so this is needed.
};

const fetchFilters = () => {
    console.log("Fetch filters called.");
    browser.runtime.sendMessage({ action: Action.get_filters, data: {} });
    getMaxZIndex();
};

//

// GVP notification

let notificationTimeout: NodeJS.Timeout | null = null;

const makeNotification = (notificationText: string): void => {
    console.log("Make notification called");
    console.log(notificationHTMLString);
    document.getElementById("gvp-notification")?.remove();
    if (notificationTimeout){
        clearTimeout(notificationTimeout);
    }
    const notificationDiv: HTMLDivElement = document.createElement("div");
    const notificationStyle: HTMLStyleElement = document.createElement("style");
    notificationDiv.innerHTML = notificationHTMLString;
    notificationStyle.innerHTML = notificationStyleString;
    document.head.appendChild(notificationStyle);
    document.body.appendChild(notificationDiv);
    document.getElementById("gvp-notification")!.style.zIndex = maxZIndex.toString();
    document.getElementById("gvp-notification-text")!.innerText = notificationText;
    document.getElementById("gvp-close-notification")?.addEventListener("click", () => {
        document.getElementById("gvp-notification")?.remove();
    });

    notificationTimeout = setTimeout(() => {
        document.getElementById("gvp-notification")?.remove();
    }, 8000);
};

//

// Report system

const tagsId: string[] = [
    "gvp-harassment-checkbox",
    "gvp-selfharm-checkbox",
    "gvp-offensivehumor-checkbox",
    "gvp-hatespeech-checkbox",
    "gvp-gore-checkbox",
    "gvp-drugs-checkbox",
    "gvp-sexualcontent-checkbox",
    "gvp-misinformation-checkbox",
];

const sendReport = (reportData: reportObject): void => {
    fetch("http://localhost:7070/report", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(reportData),
    })
        .then(response => {
            console.log(response.status);
            document.getElementById("gvp-alert")?.remove();
            if (reportQueue.length){
                const temp: reportObject = reportQueue[0];
                reportQueue.shift();
                browser.runtime.sendMessage({ action: Action.update_report_queue, data: { content: { reportQueue: reportQueue } } });
                sendReport(temp);
            }
        })
        .catch((response) => {
            console.log(response.status);
            makeNotification("Failed to communicate with the server.\nThe report has been added to the queue of failed reports.");
            reportQueue.push(reportData);
            browser.runtime.sendMessage({ action: Action.update_report_queue, data: { content: { reportQueue: reportQueue } } });
            document.getElementById("gvp-alert")?.remove();
        });
};

const makeReport = function(reportData: reportObject, userReportedImages: string[]) {
    const selectedTags: string[] = [];
    userReportedImages.push(reportData.src);
    browser.runtime.sendMessage({ action: Action.update_blocked_images, data: { content: { updatedBlockedImages: userReportedImages } } });
    tagsId.forEach(tag => {
        const checkbox: HTMLInputElement = document.getElementById(`${tag}`) as HTMLInputElement;
        if (checkbox.checked){
            selectedTags.push(tag.split("-").at(1)!);
        }
    });

    reportData.tags = selectedTags;
    sendReport(reportData);
};

const reportImage = (message: browserMessage): void => {
    const reportedImage: HTMLImageElement | null = document.querySelector(`img[src="${message.data.content.base64src}"]`);
    if (reportedImage?.getAttribute("src-identifier")){
        makeNotification("This image has been reported already.");
        return;
    }
    if (document.getElementById("gvp-alert")){
        makeNotification("Cannot make multiple reports at the same time.");
        return;
    }
    reportedImages = message.data.content.reportedImages;
    reportQueue = message.data.content.reportQueue;
    const reportDiv: HTMLDivElement = document.createElement("div");
    const reportStyle: HTMLStyleElement = document.createElement("style");
    console.log(message.data.content.reportCSS);
    reportStyle.innerHTML = message.data.content.reportCSS;
    reportDiv.innerHTML = message.data.content.reportHTML;
    document.head.appendChild(reportStyle);
    document.body.appendChild(reportDiv);
    document.getElementById("gvp-alert")!.style.zIndex = maxZIndex.toString();
    const reportData: reportObject = {
        src: message.data.content.src,
        userID: message.data.content.userID,
        tags: [],
        timeStamp: new Date().toISOString(),
    };
    let checkboxCounter: number = 0;
    (document.getElementById("gvp-submit-button") as HTMLButtonElement).disabled = true;
    const tagCheckboxes: NodeListOf<Element> = document.querySelectorAll(".gvp-checkbox");
    tagCheckboxes.forEach(checkbox => {
        checkbox.addEventListener("change", (event) => {
            const checkBoxValue = ((event.target as HTMLInputElement).checked ? 1 : -1);
            checkboxCounter += checkBoxValue;
            (document.getElementById("gvp-submit-button") as HTMLButtonElement).disabled = checkboxCounter < 1;
        });
    });
    document.getElementById("gvp-close-report")?.addEventListener("click", () => {
        document.getElementById("gvp-alert")?.remove();
    });
    document.getElementById("gvp-submit-button")?.addEventListener("click", () => {
        makeReport(reportData, reportedImages);
    });
    console.log(`User Blocked Images: ${reportedImages}`);
    analyzeDOM(); // Call analyzeDOM() to block the image that has been reported.
};

//

// Messaging setup

const messageMap = new messagingMap([
    [Action.send_filters, setupFilters],
    [Action.reporting_image, reportImage],
]);

browser.runtime.onMessage.addListener((message: browserMessage, sender: browser.runtime.MessageSender) => {
    console.log(message.action);
    const requestedAction = messageMap.get(message.action);
    requestedAction(message, sender);
});

//

// Fetchs filters as soon as the website finishes loading.

if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", fetchFilters);
} else {
    fetchFilters();
}

// Mutation observer setup.

const mutationObserver = new MutationObserver(() => {
    analyzeDOM();
});

const observerConfig = { childList: true, subtree: true, attributes: true, characterData: true };

mutationObserver.observe(document, observerConfig);

//
