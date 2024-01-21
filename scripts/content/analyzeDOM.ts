import SparkMD5 from "spark-md5";
import { reportObject, imageFilter, tagCheckboxes, feedbackObject } from "../tools/interfaces";
import { messagingMap, browserMessage, Action } from "../tools/messaging";
import { generateFilteredImage } from "./filtercanvas";
import { checkboxesTagsId, tagsLookup } from "./tags";
import { maxZIndex, getMaxZIndex } from "./maxzindex";

// HTML Resources

let notificationHTMLString: string;
let notificationStyleString: string;
let revealImageHTMLString: string;
let revealImageStyleString: string;

//

let reportedImages: imageFilter[] = []; // Stores image filters of images reported by the user
let imageFilters: imageFilter[] = []; // Stores image filtersa from the database
let votedImages: string[] = []; // Stores report_ID of images that the user gave feedback.
let extensionOn: boolean = true;

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

const blockedImagesSet: Set<{ blockedSource: string, recoverID: number, tags: string }> = new Set();
const skippedSources: Set<string> = new Set();
let blockedImagesCounter = 0;

// Message background script to make requests

const sendData = (requestData: feedbackObject | reportObject, route: string): void => {
    browser.runtime.sendMessage({ action: Action.make_request, data: { content: { requestData: requestData, route: route } } });
};

//

// Report feedback system

const sendFeedback = (userVotes: tagCheckboxes, reportID: number): void => {
    const hasVotes: boolean = Object.values(userVotes).some(value => value.tagValue !== 0);
    if (!hasVotes) {
        return;
    }
    browser.runtime.sendMessage({ action: Action.update_voted_images, data: { content: { updatedVotedImages: votedImages } } });
    const feedbackData: feedbackObject = new feedbackObject();
    feedbackData.reportID = reportID;
    tagsLookup.forEach(tag => {
        feedbackData[tag] = userVotes[tag].tagValue;
    });
    sendData(feedbackData, "reportfeedback");
};

const revealImage = (event: Event): void => {
    event.preventDefault();
    const targetImageIdentifier = (event.target as HTMLImageElement).getAttribute("src-identifier");
    const canvasSrc = (event.target as HTMLImageElement).src;
    let targetImageSrc: string = "";
    for (const image of blockedImagesSet) {
        if (image.recoverID === Number(targetImageIdentifier)) {
            targetImageSrc = image.blockedSource;
            break;
        }
    }
    if (document.getElementById("gvp-reveal-image")) {
        return;
    }
    console.log(`Image SRC : ${targetImageSrc}`);
    const recoverID = targetImageIdentifier;
    let targetImage: Element;
    for (const image of document.querySelectorAll(`img[src="${canvasSrc}"]`)) {
        if (image.getAttribute("src-identifier") === recoverID) {
            targetImage = image;
            break;
        }
    }
    console.log(votedImages);
    const revealImageDiv: HTMLDivElement = document.createElement("div");
    const revealImageStyle: HTMLStyleElement = document.createElement("style");
    revealImageDiv.innerHTML = revealImageHTMLString;
    revealImageStyle.innerHTML = revealImageStyleString;
    blockedImagesSet.forEach(image => {
        if (image.recoverID === Number(recoverID)) {
            const reportID: number = Number(targetImage.getAttribute("gvp-report-id"));
            const imageSource: string = (/^data/.test(image.blockedSource) ? SparkMD5.hash(image.blockedSource) : image.blockedSource);
            const reportedByUser: boolean = reportedImages.some(report => report.source === imageSource);
            const tagsObject = JSON.parse(image.tags);
            const imageTagArray: string[] = Object.keys(tagsObject).filter(key => tagsObject[key] > 0).map(key => key);
            const imageTags = imageTagArray.join(", ");
            document.body.appendChild(revealImageDiv);
            document.head.appendChild(revealImageStyle);
            document.getElementById("gvp-image-preview-tags")!.textContent = `${imageTags}`;
            document.getElementById("gvp-background")!.style.zIndex = maxZIndex.toString();
            if (reportedByUser || votedImages.includes(imageSource)) {
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
                const tag = checkbox.id.split("-").at(3)!;
                if (imageTags.includes(tag)) {
                    checkbox.addEventListener("click", () => {
                        userVotes[tag].checkedNegative = !(userVotes[tag].checkedNegative);
                        (checkbox as HTMLElement).style.backgroundColor = (userVotes[tag].checkedNegative) ? "red" : "transparent";
                        if (userVotes[tag].checkedNegative) {
                            userVotes[tag].checkedPositive = false;
                            document.getElementById(`gvp-positive-checkbox-${tag}`)!.style.backgroundColor = "transparent";
                        }
                        userVotes[tag].tagValue = (Number(userVotes[tag].checkedNegative) ^ Number(userVotes[tag].checkedPositive)) - (Number(userVotes[tag].checkedNegative) << 1);
                    });
                    return;
                }
                (checkbox as HTMLElement).style.cursor = "not-allowed";
            });

            document.getElementById("gvp-noreveal-button")?.addEventListener("click", () => {
                document.getElementById("gvp-background")?.remove();
                if (reportID !== 0 && !reportedByUser) {
                    sendFeedback(userVotes, reportID);
                }
            });
            document.getElementById("gvp-reveal-button")?.addEventListener("click", () => {
                (targetImage as HTMLImageElement).src = image.blockedSource;
                document.getElementById("gvp-background")?.remove();
                skippedSources.add(image.blockedSource);
                targetImage.removeEventListener("click", revealImage);
                if (reportID !== 0 && !reportedByUser) {
                    sendFeedback(userVotes, reportID);
                }
            });
            document.getElementById("gvp-reveal-preview")!.addEventListener("click", () => {
                document.getElementById("gvp-image-preview")!.style.filter = "none";
            });
            document.getElementById("gvp-close-reveal")?.addEventListener("click", () => {
                document.getElementById("gvp-background")?.remove();
            });
        }
    });
};

//

const filterImage = (image: HTMLImageElement): void => {
    if (image.getAttribute("src-identifier") || image.id === "gvp-image-preview") {
        return;
    }
    const imageWidth = image.naturalWidth;
    const imageHeight = image.naturalHeight;
    const imageSource: string = (/^data/.test(image.src) ? SparkMD5.hash(image.src) : image.src);
    let isInFilters: boolean = false;
    const isReported = reportedImages.some(report => report.source === imageSource);
    let imageTags: string = "";
    let reportID: number = 0;
    if (imageFilters) {
        const matchImage = imageFilters.find(img => img.source === imageSource);
        if (matchImage) {
            isInFilters = true;
            imageTags = matchImage.tags;
            if (!Object.values(JSON.parse(imageTags)).some(tagValue => tagValue === 1)) {
                return;
            }
            reportID = matchImage.id;
        }
    }
    if (imageTags === "") {
        const matchImage = reportedImages.find(img => img.source === imageSource);
        if (matchImage) {
            imageTags = matchImage.tags;
            reportID = matchImage.id;
        }
    }
    if ((imageWidth > 48 || imageHeight > 48) && !skippedSources.has(image.src) && (isReported || isInFilters)) {
        const filteredImage = generateFilteredImage(imageWidth, imageHeight);
        blockedImagesCounter++;
        blockedImagesSet.add({ blockedSource: image.src, recoverID: blockedImagesCounter, tags: imageTags });
        image.setAttribute("src-identifier", `${blockedImagesCounter}`);
        image.setAttribute("gvp-report-id", `${reportID}`);
        browser.runtime.sendMessage({ action: Action.update_blocked_images, data: { content: {} } });
        image.src = filteredImage;
        image.addEventListener("click", revealImage);
    }
};

const analyzeDOM = (): void => {
    if (extensionOn) {
        const imgElements: NodeListOf<Element> = document.querySelectorAll("img");
        imgElements.forEach(image => {
            const imageElement = (image as HTMLImageElement);
            if (imageElement.complete) {
                filterImage(imageElement);
                return;
            }
            image.addEventListener("load", () => {
                filterImage(imageElement);
            });
        });
    }
};

//

// Messaging system

const setupStorage = (message: browserMessage) => {
    notificationHTMLString = message.data.content.notificationHTMLString;
    notificationStyleString = message.data.content.notificationCSSString;
    revealImageHTMLString = message.data.content.gvpRevealImageHTML;
    revealImageStyleString = message.data.content.gvpRevealImageCSS;
    imageFilters = message.data.content.imageFilters;
    reportedImages = message.data.content.reportedImages;
    votedImages = message.data.content.votedImages;
    extensionOn = message.data.content.extensionOn;
    // Probably make an object instead of storing in individual variables.
    analyzeDOM(); // Call analyzeDOM() to run the first analysis of the website after filters are fetched. Some websites might not have mutations so this is needed.
};

const fetchStorage = () => {
    browser.runtime.sendMessage({ action: Action.get_resources, data: {} });
    getMaxZIndex();
};

//

// Report system

const makeReport = (reportData: reportObject): void => {
    const selectedTags: string[] = [];
    checkboxesTagsId.forEach(tag => {
        const checkbox: HTMLInputElement = document.getElementById(`${tag}`) as HTMLInputElement;
        if (checkbox.checked) {
            selectedTags.push(tag.split("-").at(1)!);
        }
    });
    reportData.tags = selectedTags;
    sendData(reportData, "report");
    document.getElementById("gvp-background")?.remove();
};

const reportImage = (message: browserMessage): void => {
    const imageSourceBase64: string = message.data.content.base64src;
    const imageSource: string = (/^data/.test(imageSourceBase64) ? SparkMD5.hash(imageSourceBase64) : imageSourceBase64);
    const reportedImage: HTMLImageElement | null = document.querySelector(`img[src="${imageSourceBase64}"]`);
    reportedImages = message.data.content.reportedImages;
    const isReported = reportedImages.some(report => report.source === imageSource);
    const isVoted = votedImages.includes(imageSource);
    if (reportedImage?.getAttribute("src-identifier") || isReported || isVoted) {
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
    document.getElementById("gvp-background")!.style.zIndex = maxZIndex.toString();
    (document.getElementById("gvp-report-preview-image") as HTMLImageElement)!.src = imageSource;
    const reportData: reportObject = {
        src: message.data.content.src,
        userID: "",
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
        document.getElementById("gvp-background")?.remove();
    });
    document.getElementById("gvp-cancel-report")?.addEventListener("click", () => {
        document.getElementById("gvp-background")?.remove();
    });
    document.getElementById("gvp-submit-button")?.addEventListener("click", () => {
        makeReport(reportData);
    });
};

const updateReportedImages = (message: browserMessage) => {
    reportedImages = message.data.content.reportedImages;
    votedImages = message.data.content.votedImages;
    imageFilters = message.data.content.imageFilters;
    analyzeDOM();
};

//

// Messaging setup

const messageMap = new messagingMap([
    [Action.send_resources, setupStorage],
    [Action.reporting_image, reportImage],
    [Action.make_notification, backgroundNotification],
    [Action.update_reported_images, updateReportedImages],
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
