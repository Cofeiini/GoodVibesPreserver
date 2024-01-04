import SparkMD5 from "spark-md5";
import { reportObject, imageFilter, tagCheckboxes, feedbackObject } from "../tools/interfaces";
import { messagingMap, browserMessage, Action } from "../tools/messaging";

// HTML Resources

let notificationHTMLString: string;
let notificationStyleString: string;
let revealImageHTMLString: string;
let revealImageStyleString: string;

//

let reportedImages: imageFilter[] = []; // Stores image filters of images reported by the user
let imageFilters: imageFilter[] = []; // Stores image filtersa from the database
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

const blockedImagesSet: Set<{ blockedSource: string, recoverID: number, tags: string }> = new Set();
const skippedSources: Set<string> = new Set();
let blockedImagesCounter = 0;

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
    browser.runtime.sendMessage({ action: Action.get_voted_images, data: { content: { imageSrc: targetImageSrc, canvasSrc: canvasSrc, recoverID: targetImageIdentifier } } });
};

const revealImagePrompt = (message: browserMessage): void => {
    if (document.getElementById("gvp-reveal-image")) {
        return;
    }
    console.log(`Image SRC : ${message.data.content.imageSrc}`);
    const recoverID = message.data.content.recoverID;
    let targetImage: Element;
    for (const image of document.querySelectorAll(`img[src="${message.data.content.canvasSrc}"]`)) {
        if (image.getAttribute("src-identifier") === recoverID) {
            targetImage = image;
            break;
        }
    }
    votedImages = message.data.content.votedImages;
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
        isInFilters = imageFilters.some(filter => filter.source === imageSource);
        for (const img of imageFilters) {
            if (img.source === imageSource) {
                imageTags = img.tags;
                console.log(`[filterImage] filters imageTags: ${imageTags}`);
                reportID = img.id;
                break;
            }
        }
    }
    if (imageTags === "") {
        for (const img of reportedImages) {
            if (img.source === imageSource) {
                imageTags = img.tags;
                console.log(`[filterImage] reported imageTags: ${imageTags}`);
                reportID = img.id;
                break;
            }
        }
    }

    if ((imageWidth > 48 || imageHeight > 48) && !skippedSources.has(image.src) && (isReported || isInFilters)) {
        console.log(imageSource);
        const filteredImage = generateFilteredImage(imageWidth, imageHeight);
        blockedImagesCounter++;
        blockedImagesSet.add({ blockedSource: image.src, recoverID: blockedImagesCounter, tags: imageTags });
        image.setAttribute("src-identifier", `${blockedImagesCounter}`);
        image.setAttribute("gvp-report-id", `${reportID}`);
        image.src = filteredImage;
        image.addEventListener("click", revealImage);
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

const analyzeDOM = (): void => {
    const imgElements: NodeListOf<Element> = document.querySelectorAll("img");
    analyzeImages(imgElements);
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
    // Probably make an object instead of storing in individual variables.
    analyzeDOM(); // Call analyzeDOM() to run the first analysis of the website after filters are fetched. Some websites might not have mutations so this is needed.
};

const fetchStorage = () => {
    browser.runtime.sendMessage({ action: Action.get_resources, data: {} });
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
    const imageSource: string = message.data.content.base64src;
    const reportedImage: HTMLImageElement | null = document.querySelector(`img[src="${imageSource}"]`);
    reportedImages = message.data.content.reportedImages;
    const isReported = reportedImages.some(report => report.source === imageSource);
    if (reportedImage?.getAttribute("src-identifier") || isReported) {
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
    analyzeDOM();
};

//

// Messaging setup

const messageMap = new messagingMap([
    [Action.send_resources, setupStorage],
    [Action.reporting_image, reportImage],
    [Action.reveal_image_prompt, revealImagePrompt],
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
