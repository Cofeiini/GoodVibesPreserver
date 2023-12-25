import SparkMD5 from "spark-md5";
import { urlFilter, reportObject, imageFilter, tagCheckboxes, feedbackObject, failedRequest } from "../tools/interfaces";
import { messagingMap, browserMessage, Action } from "../tools/messaging";
import { Optional } from "../tools/optional";

let filters: urlFilter[];

// HTML Resources

let blockedSignString: string;
let blockedSignSmallString: string;
let notificationHTMLString: string;
let notificationStyleString: string;
let revealImageHTMLString: string;
let revealImageStyleString: string;

//

let reportedImages: string[] = []; // Stores hashed sources of images reported by the user
let imageFilters: imageFilter[] = []; // Stores hashed sources of images that will be filtered
let votedImages: number[] = []; // Stores report_ID of images that the user gave feedback.
let maxZIndex: number = 0;

const getMaxZIndex = (): void => {
    maxZIndex = Math.max(...Array.from(document.querySelectorAll("body div, body img, body nav, body section"), (element) => {
        return parseInt(getComputedStyle(element).zIndex);
    }).filter(zIndex => !Number.isNaN(zIndex)));
    maxZIndex++;
    return;
};

// GVP notification

let notificationTimeout: NodeJS.Timeout | null = null;

const makeNotification = (notificationText: string): void => {
    document.getElementById("gvp-notification")?.remove();
    if (notificationTimeout) {
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

const backgroundNotification = (message: browserMessage): void => { // Notifications that are triggered from the background script will call this function
    makeNotification(message.data.content.notificationText);
};

//

// Element filtering

const blockedElementsSet: Set<{ blockedElement: Element, recoverID: number, url: string }> = new Set();
const blockedImagesSet: Set<{ blockedSource: string, recoverID: number, tags: string }> = new Set();
const skippedSources: Set<string> = new Set();
let blockedImagesCounter = 0;
let blockedElementsCounter = 0;

/**
 * @param element represents the element that the function will analyze its dimensions.
 * @returns { boolean } for telling whether the warning sign should be the default or smaller one.
 */

const analyzeElement = (element: Element): string => {
    const elementHTML: HTMLElement = (element as HTMLElement);
    if (elementHTML.offsetWidth <= 134 || elementHTML.offsetHeight <= 52) {
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
    if (measuredWarningSize === blockedSignSmallString) {
        blockedContainer.value().style.width = elementWidth.toString();
        blockedContainer.value().style.height = elementHeight.toString();
    }
    blockedContainer.value().id = `blocked-container-${blockedElementsCounter}`;
    revealButton.value().id = `recover-button-${blockedElementsCounter}`;
    return serializer.serializeToString(newWarningHTML);
};

// Message background script to make requests

const sendData = (requestData: feedbackObject | reportObject, route: string): void => {
    browser.runtime.sendMessage({ action: Action.make_request, data: { content: { requestData: requestData, route: route } } });
};

//

// Report feedback system

const tags: string[] = ["hatespeech", "extremism", "misinformation", "offensivehumor", "sexualcontent", "harassment", "gore", "drugs", "selfharm", "shockingcontent"]; // For object iteration

const sendFeedback = (userVotes: tagCheckboxes, reportID: number): void => {
    const hasVotes: boolean = Object.values(userVotes).some(value => {
        return (value.tagValue !== 0);
    });
    if (hasVotes) {
        votedImages.push(reportID);
        browser.runtime.sendMessage({ action: Action.update_voted_images, data: { content: { updatedVotedImages: votedImages } } });
        const feedbackData: feedbackObject = new feedbackObject();
        feedbackData.reportID = reportID;
        tags.forEach(tag => {
            feedbackData[tag] = userVotes[tag].tagValue;
        });
        sendData(feedbackData, "reportfeedback");
    }
    console.log("Feedback without votes");
};

const revealImage = (event: Event): void => {
    event.preventDefault();
    const targetImageSrc = (event.target as HTMLImageElement).src;
    browser.runtime.sendMessage({ action: Action.get_voted_images, data: { content: { imageSrc: targetImageSrc } } });
};

const revealImagePrompt = (message: browserMessage): void => {
    const targetImage: HTMLElement = document.querySelector(`img[src="${message.data.content.imageSrc}"]`)!;
    votedImages = message.data.content.votedImages;
    if (document.getElementById("gvp-reveal-image")) {
        makeNotification("Cannot reveal multiple images at the same time");
        return;
    }
    const revealImageDiv: HTMLDivElement = document.createElement("div");
    const revealImageStyle: HTMLStyleElement = document.createElement("style");
    revealImageDiv.innerHTML = revealImageHTMLString;
    revealImageStyle.innerHTML = revealImageStyleString;
    const recoverID = Number(targetImage.getAttribute("src-identifier"));
    blockedImagesSet.forEach(image => {
        if (image.recoverID === recoverID) {
            const reportID: number | null = Number(targetImage.getAttribute("gvp-report-id"));
            const imageSource: string = (/^data/.test(image.blockedSource) ? SparkMD5.hash(image.blockedSource) : image.blockedSource);
            const reportedByUser: boolean = reportedImages.includes(imageSource);
            const tagsObject = JSON.parse(image.tags);
            const imageTagArray: string[] = [];
            for (const key of Object.keys(tagsObject)) {
                if (tagsObject[key] > 0) {
                    imageTagArray.push(key);
                }
            }
            const imageTags = imageTagArray.join(", ");
            document.body.appendChild(revealImageDiv);
            document.head.appendChild(revealImageStyle);
            document.getElementById("gvp-reveal-preview")!.addEventListener("click", () => {
                document.getElementById("gvp-image-preview")!.style.filter = "none";
            });
            document.getElementById("gvp-image-preview-tags")!.textContent = `This image contains the next tags: ${imageTags}`;
            document.getElementById("gvp-background")!.style.zIndex = maxZIndex.toString();
            if (reportedByUser || votedImages.includes(reportID)) {
                document.getElementById("gvp-user-feedback")?.remove();
            }
            (document.getElementById("gvp-image-preview") as HTMLImageElement).src = image.blockedSource;
            const positiveCheckboxes: NodeListOf<Element> = document.querySelectorAll(".gvp-positive-checkbox");
            const negativeCheckboxes: NodeListOf<Element> = document.querySelectorAll(".gvp-negative-checkbox");
            const userVotes: tagCheckboxes = new tagCheckboxes();

            positiveCheckboxes.forEach(checkbox => {
                checkbox.addEventListener("click", () => {
                    const tagString: string = checkbox.id.split("-").at(3)!;
                    userVotes[tagString].checkedPositive = !(userVotes[tagString].checkedPositive);
                    (checkbox as HTMLElement).style.backgroundColor = (userVotes[tagString].checkedPositive) ? "green" : "transparent";
                    if (userVotes[tagString].checkedPositive) {
                        userVotes[tagString].checkedNegative = false;
                        document.getElementById(`gvp-negative-checkbox-${tagString}`)!.style.backgroundColor = "transparent";
                    }
                    userVotes[tagString].tagValue = (Number(userVotes[tagString].checkedNegative) ^ Number(userVotes[tagString].checkedPositive)) - (Number(userVotes[tagString].checkedNegative) << 1);
                });
            });
            negativeCheckboxes.forEach(checkbox => {
                checkbox.addEventListener("click", () => {
                    const tagString: string = checkbox.id.split("-").at(3)!;
                    userVotes[tagString].checkedNegative = !(userVotes[tagString].checkedNegative);
                    (checkbox as HTMLElement).style.backgroundColor = (userVotes[tagString].checkedNegative) ? "red" : "transparent";
                    if (userVotes[tagString].checkedNegative) {
                        userVotes[tagString].checkedPositive = false;
                        document.getElementById(`gvp-positive-checkbox-${tagString}`)!.style.backgroundColor = "transparent";
                    }
                    userVotes[tagString].tagValue = (Number(userVotes[tagString].checkedNegative) ^ Number(userVotes[tagString].checkedPositive)) - (Number(userVotes[tagString].checkedNegative) << 1);
                });
            });

            document.getElementById("gvp-noreveal-button")?.addEventListener("click", () => {
                document.getElementById("gvp-background")?.remove();
                if (reportID !== 0 && !reportedByUser) {
                    sendFeedback(userVotes, reportID);
                }
            });
            document.getElementById("gvp-reveal-button")?.addEventListener("click", () => {
                document.querySelectorAll(`img[src="${message.data.content.imageSrc}"]`).forEach(img => {
                    (img as HTMLImageElement).src = image.blockedSource;
                });
                document.getElementById("gvp-background")?.remove();
                skippedSources.add(image.blockedSource);
                targetImage.removeEventListener("click", revealImage);
                if (reportID !== 0 && !reportedByUser) {
                    sendFeedback(userVotes, reportID);
                }
            });
        }
    });
};

//

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
    if (canvasContext) {
        const gradient = canvasContext.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, "rgb(10,10,10)");
        gradient.addColorStop(1, "rgb(55,55,55)");
        canvasContext.fillStyle = gradient;
        canvasContext.fillRect(0, 0, width, height);
    }
    return canvas.toDataURL("image/png");
};

const filterImage = (image: HTMLImageElement): void => {
    if (!image.getAttribute("src-identifier") && image.id !== "gvp-image-preview") {
        const imageWidth = image.naturalWidth;
        const imageHeight = image.naturalHeight;
        const imageSource: string = (/^data/.test(image.src) ? SparkMD5.hash(image.src) : image.src);
        let isInFilters: boolean = false;
        let imageTags: string = "";
        let reportID: number = 0;
        if (imageFilters) {
            isInFilters = imageFilters.some(filter => filter.source === imageSource);
            imageFilters.forEach(img => {
                if (img.source === imageSource) {
                    imageTags = img.tags;
                    reportID = img.id;
                }
            });
        }
        if ((imageWidth > 48 || imageHeight > 48) && !skippedSources.has(image.src) && (reportedImages.includes(imageSource) || isInFilters)) {
            const filteredImage = generateFilteredImage(imageWidth, imageHeight);
            blockedImagesCounter++;
            blockedImagesSet.add({ blockedSource: image.src, recoverID: blockedImagesCounter, tags: imageTags });
            image.setAttribute("src-identifier", `${blockedImagesCounter}`);
            image.setAttribute("gvp-report-id", `${reportID}`);
            image.src = filteredImage;
            image.addEventListener("click", revealImage);
        }
    }
};

const analyzeImages = (images: NodeListOf<Element>): void => {
    images.forEach(image => {
        const imageElement = (image as HTMLImageElement);
        if (imageElement.complete) {
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
        if (elem.recoverID === recoverID) {
            if (blockedContainer) {
                console.log(elem.blockedElement);
                const recoverPrompt: boolean = window.confirm(`Do you want to recover this element? \n The source of the element comes from a blocked URL: ${elem.url}`);
                if (recoverPrompt) {
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
            if (elementUrl) {
                if (filterRegExp.test(elementUrl) && !activeRegEx.test(elementUrl) && !DOMElement.element.hasAttribute("blocked-identifier")) {
                    blockedElementsCounter++;
                    blockedElementsSet.add({ blockedElement: DOMElement.element, recoverID: blockedElementsCounter, url: DOMElement.element.getAttribute("href") || DOMElement.element.getAttribute("src") || "" });
                    DOMElement.element.setAttribute("blocked-identifier", "blocked");
                    const warningSign: DocumentFragment = document.createRange().createContextualFragment(makeWarning(DOMElement.element));
                    DOMElement.element.parentNode?.replaceChild(warningSign, DOMElement.element);
                    document.getElementById(`recover-button-${blockedElementsCounter}`)?.addEventListener("click", recoverElement);
                }
            }
        });
    });
};

//

// Messaging system

const setupStorage = (message: browserMessage) => {
    filters = message.data.content.filters;
    blockedSignString = message.data.content.blockedSign;
    blockedSignSmallString = message.data.content.blockedSignSmall;
    notificationHTMLString = message.data.content.notificationHTMLString;
    notificationStyleString = message.data.content.notificationCSSString;
    revealImageHTMLString = message.data.content.gvpRevealImageHTML;
    revealImageStyleString = message.data.content.gvpRevealImageCSS;
    imageFilters = message.data.content.imageFilters;
    reportedImages = message.data.content.reportedImages;
    votedImages = message.data.content.votedImages;
    // Probably make an object instead of storing in individual variables.
    analyzeDOM(); // Call analyzeDOM() to run the first analysis of the website after filters are fetched. Some websites might not have mutations so this is needed.
};

const fetchStorage = () => {
    browser.runtime.sendMessage({ action: Action.get_filters, data: {} });
    getMaxZIndex();
};

//

// Report system

const checkboxesTagsId: string[] = [
    "gvp-harassment-checkbox",
    "gvp-selfharm-checkbox",
    "gvp-offensivehumor-checkbox",
    "gvp-hatespeech-checkbox",
    "gvp-gore-checkbox",
    "gvp-drugs-checkbox",
    "gvp-sexualcontent-checkbox",
    "gvp-misinformation-checkbox",
    "gvp-shockingcontent-checkbox",
    "gvp-extremism-checkbox",
];

const makeReport = (reportData: reportObject, userReportedImages: string[]): void => {
    const selectedTags: string[] = [];
    userReportedImages.push(reportData.src);
    browser.runtime.sendMessage({ action: Action.update_blocked_images, data: { content: { updatedBlockedImages: userReportedImages } } });
    checkboxesTagsId.forEach(tag => {
        const checkbox: HTMLInputElement = document.getElementById(`${tag}`) as HTMLInputElement;
        if (checkbox.checked) {
            selectedTags.push(tag.split("-").at(1)!);
        }
    });

    reportData.tags = selectedTags;
    sendData(reportData, "report");
    document.getElementById("gvp-alert")?.remove();
};

const reportImage = (message: browserMessage): void => {
    const imageSource: string = message.data.content.base64src;
    const reportedImage: HTMLImageElement | null = document.querySelector(`img[src="${imageSource}"]`);
    reportedImages = message.data.content.reportedImages;
    if (reportedImage?.getAttribute("src-identifier") || reportedImages.includes((/^data/.test(imageSource) ? SparkMD5.hash(imageSource) : imageSource))) {
        makeNotification("This image has been reported already.");
        return;
    }
    if (document.getElementById("gvp-alert") || document.getElementById("gvp-reveal-image")) {
        return;
    }
    const reportDiv: HTMLDivElement = document.createElement("div");
    const reportStyle: HTMLStyleElement = document.createElement("style");
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
    const reportCheckboxes: NodeListOf<Element> = document.querySelectorAll(".gvp-checkbox");
    reportCheckboxes.forEach(checkbox => {
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
    analyzeDOM(); // Call analyzeDOM() to block the image that has been reported.
};

//

// Messaging setup

const messageMap = new messagingMap([
    [Action.send_filters, setupStorage],
    [Action.reporting_image, reportImage],
    [Action.reveal_image_prompt, revealImagePrompt],
    [Action.make_notification, backgroundNotification],
]);

browser.runtime.onMessage.addListener((message: browserMessage, sender: browser.runtime.MessageSender) => {
    const requestedAction = messageMap.get(message.action);
    requestedAction(message, sender);
});

//

// Fetchs filters as soon as the website finishes loading.

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fetchStorage);
} else {
    fetchStorage();
}

// Mutation observer setup.

const mutationObserver = new MutationObserver(analyzeDOM);

const observerConfig = { childList: true, subtree: true, attributes: true, characterData: true };

mutationObserver.observe(document, observerConfig);

//
