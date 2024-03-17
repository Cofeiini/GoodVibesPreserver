import SparkMD5 from "spark-md5";
import { feedbackObject, imageFilter, reportObject, tagCheckboxes, whitelistedImage } from "../tools/interfaces";
import { Action, browserMessage, messagingMap } from "../tools/messaging";
import { generateFilteredImage } from "./filtercanvas";
import { checkboxesTagsId, tagsDisplayText, tagsLookup } from "./tags";
import { getMaxZIndex, maxZIndex } from "./maxzindex";

// HTML Resources
let notificationHTMLString: string;
let notificationStyleString: string;
let revealImageHTMLString: string;
let revealImageStyleString: string;

let reportedImages: imageFilter[] = []; // Stores image filters of images reported by the user
let imageFilters: imageFilter[] = []; // Stores image filters from the database
let votedImages: string[] = []; // Stores report_ID of images that the user gave feedback.
let extensionOn = true;
let votingEnabled = true;
let imageWhitelist: string[] = [];
let ignoredTags: string[] = [];
const canvasSources: string[] = [];

// GVP notification
let notificationTimeout: NodeJS.Timeout | null = null;

const makeNotification = (notificationText: string) => {
    document.getElementById("gvp-notification-shadow-root")?.remove();
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
    }

    const notificationDiv = document.createElement("div");
    notificationDiv.innerHTML = notificationHTMLString;
    const notificationStyle = document.createElement("style");
    notificationStyle.innerHTML = notificationStyleString;
    const shadowRoot = document.createElement("div");
    shadowRoot.id = "gvp-notification-shadow-root";
    document.body.appendChild(shadowRoot);

    const shadowDOM = (shadowRoot as HTMLElement).attachShadow({ mode: "open" });
    shadowDOM.appendChild(notificationStyle);
    shadowDOM.appendChild(notificationDiv);
    shadowDOM.getElementById("gvp-notification")!.style.zIndex = maxZIndex.toString();
    shadowDOM.getElementById("gvp-notification-text")!.innerText = notificationText;
    shadowDOM.getElementById("gvp-close-notification")?.addEventListener("click", () => {
        shadowRoot.remove();
    });

    notificationTimeout = setTimeout(() => {
        shadowRoot.remove();
    }, 8000);
};

// Notifications that are triggered from the background script will call this function
const backgroundNotification = (message: browserMessage) => {
    makeNotification(message.data.content.notificationText);
};

// Element filtering
const blockedImagesSet: Set<{ blockedSource: string, recoverID: number, tags: string }> = new Set();
const skippedSources: Set<string> = new Set();
let blockedImagesCounter = 0;

// Message background script to make requests
const sendData = (requestData: feedbackObject | reportObject, route: string): void => {
    browser.runtime.sendMessage({ action: Action.make_request, data: { content: { requestData: requestData, route: route } } });
};

// Report feedback system
const sendFeedback = (userVotes: tagCheckboxes, reportID: number): void => {
    const hasVotes = Object.values(userVotes).some(value => value.tagValue !== 0);
    if (!hasVotes) {
        return;
    }

    const feedbackData = new feedbackObject();
    feedbackData.reportID = reportID;
    tagsLookup.forEach(tag => {
        feedbackData[tag] = userVotes[tag].tagValue;
    });
    sendData(feedbackData, "reportfeedback");
};

const revealImage = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    if (document.getElementById("gvp-reveal-image")) {
        return;
    }

    const canvasSrc = (event.target as HTMLImageElement).src;
    const recoverID = (event.target as HTMLImageElement).getAttribute("src-identifier");
    let targetImage: Element | null = null;
    for (const image of document.querySelectorAll(`img[src="${canvasSrc}"]`)) {
        if (image.getAttribute("src-identifier") === recoverID) {
            targetImage = image;
            break;
        }
    }
    if (!targetImage) {
        console.error(`Revealing image with identifier ${recoverID} failed. No matching identifier found in images.`);
        return;
    }

    const revealImageDiv = document.createElement("div");
    revealImageDiv.innerHTML = revealImageHTMLString;
    const revealImageStyle = document.createElement("style");
    revealImageStyle.innerHTML = revealImageStyleString;
    const shadowRoot = document.createElement("div");
    shadowRoot.id = "gvp-shadow-root";

    blockedImagesSet.forEach(image => {
        if (image.recoverID !== Number(recoverID)) {
            return;
        }

        document.body.appendChild(shadowRoot);

        const tagsObject = JSON.parse(image.tags);
        const imageTagArray = Object.keys(tagsObject).filter(key => tagsObject[key] > 0).map(key => tagsDisplayText.get(key)!);
        const imageTags = imageTagArray.join(", ");
        const shadowDOM = (shadowRoot as HTMLElement).attachShadow({ mode: "open" });
        shadowDOM.append(revealImageDiv);
        shadowDOM.append(revealImageStyle);
        shadowDOM.getElementById("gvp-image-preview-tags")!.textContent = `${imageTags}`;
        shadowDOM.getElementById("gvp-background")!.style.zIndex = maxZIndex.toString();
        (shadowDOM.getElementById("gvp-image-preview") as HTMLImageElement).src = image.blockedSource;

        const imageSource = SparkMD5.hash(image.blockedSource);
        const reportedByUser = reportedImages.some(report => report.source === imageSource);
        if (!votingEnabled || reportedByUser || votedImages.includes(imageSource)) {
            shadowDOM.getElementById("gvp-user-feedback")?.remove();
        }

        const userVotes = new tagCheckboxes();

        shadowDOM.querySelectorAll(".gvp-positive-checkbox").forEach(checkbox => {
            const tag = checkbox.id.split("-").at(3)!;
            checkbox.addEventListener("click", () => {
                userVotes[tag].checkedPositive = !(userVotes[tag].checkedPositive);
                (checkbox as HTMLElement).style.backgroundColor = (userVotes[tag].checkedPositive) ? "rgb(12, 145, 0)" : "";
                if (userVotes[tag].checkedPositive) {
                    userVotes[tag].checkedNegative = false;
                    shadowDOM.getElementById(`gvp-negative-checkbox-${tag}`)!.style.backgroundColor = "";
                }
                userVotes[tag].tagValue = (Number(userVotes[tag].checkedNegative) ^ Number(userVotes[tag].checkedPositive)) - (Number(userVotes[tag].checkedNegative) << 1);
            });
        });

        shadowDOM.querySelectorAll(".gvp-negative-checkbox").forEach(checkbox => {
            const tag = checkbox.id.split("-").at(3)!;
            if (!imageTags.includes(tagsDisplayText.get(tag)!)) {
                (checkbox as HTMLElement).style.cursor = "not-allowed";
                return;
            }

            checkbox.addEventListener("click", () => {
                userVotes[tag].checkedNegative = !(userVotes[tag].checkedNegative);
                (checkbox as HTMLElement).style.backgroundColor = (userVotes[tag].checkedNegative) ? "rgb(179, 0, 0)" : "";
                if (userVotes[tag].checkedNegative) {
                    userVotes[tag].checkedPositive = false;
                    shadowDOM.getElementById(`gvp-positive-checkbox-${tag}`)!.style.backgroundColor = "";
                }
                userVotes[tag].tagValue = (Number(userVotes[tag].checkedNegative) ^ Number(userVotes[tag].checkedPositive)) - (Number(userVotes[tag].checkedNegative) << 1);
            });
        });

        const reportID = Number(targetImage!.getAttribute("gvp-report-id"));
        shadowDOM.getElementById("gvp-noreveal-button")?.addEventListener("click", () => {
            if (reportID !== 0 && !reportedByUser) {
                sendFeedback(userVotes, reportID);
            }

            shadowRoot.remove();
        });
        shadowDOM.getElementById("gvp-reveal-button")?.addEventListener("click", () => {
            (targetImage as HTMLImageElement).src = image.blockedSource;
            skippedSources.add(image.blockedSource);
            targetImage!.removeEventListener("click", revealImage);
            if (reportID !== 0 && !reportedByUser) {
                sendFeedback(userVotes, reportID);
            }

            const whitelistCheckbox = (shadowDOM.getElementById("gvp-whitelist-checkbox")! as HTMLInputElement);
            browser.runtime.sendMessage({ action: Action.revealed_image, data: { content: { whitelist: whitelistCheckbox.checked, source: imageSource, base64src: image.blockedSource } } });

            shadowRoot.remove();
        });
        shadowDOM.getElementById("gvp-reveal-preview")!.addEventListener("click", () => {
            shadowDOM.getElementById("gvp-image-preview")!.style.filter = "none";
        });
        shadowDOM.getElementById("gvp-close-reveal")?.addEventListener("click", () => {
            shadowRoot.remove();
        });
    });
};

const filterImage = (image: HTMLImageElement) => {
    if (!image.complete) {
        return;
    }

    if (image.getAttribute("src-identifier") || image.id === "gvp-image-preview") {
        return;
    }

    const imageWidth = image.naturalWidth;
    const imageHeight = image.naturalHeight;
    if ((imageWidth <= 48) || (imageHeight <= 48)) {
        return;
    }
    let imageData = image.src;

    const canvas = document.createElement("canvas");
    canvas.width = imageWidth;
    canvas.height = imageHeight;
    const context = canvas.getContext("2d");
    if (context) {
        context.drawImage(image, 0, 0);
        imageData = canvas.toDataURL("image/png");
    }
    const imageSource = SparkMD5.hash(imageData);

    let isInFilters = false;
    let imageTags = "";
    let reportID = 0;
    if (imageFilters) {
        const matchImage = imageFilters.find(img => img.source === imageSource);
        if (matchImage) {
            imageTags = matchImage.tags;
            if (!Object.values(JSON.parse(imageTags)).some(tagValue => tagValue === 1)) {
                return;
            }
            isInFilters = true;
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

    if (imageTags) {
        const tagsObject = JSON.parse(imageTags);
        const imageTagArray = Object.keys(tagsObject).filter(key => tagsObject[key] > 0).map(key => key);
        if (imageTagArray.every(tag => ignoredTags.includes(tag))) {
            return;
        }
    }

    const isReported = reportedImages.some(report => report.source === imageSource);
    if (!skippedSources.has(imageSource) && (isReported || isInFilters) && !imageWhitelist.includes(imageSource)) {
        const filteredImage = generateFilteredImage(imageWidth, imageHeight);
        canvasSources.push(SparkMD5.hash(filteredImage));

        blockedImagesCounter++;
        blockedImagesSet.add({ blockedSource: image.src, recoverID: blockedImagesCounter, tags: imageTags });

        image.setAttribute("src-identifier", `${blockedImagesCounter}`);
        image.setAttribute("gvp-report-id", `${reportID}`);
        image.src = filteredImage;
        image.addEventListener("click", revealImage);

        browser.runtime.sendMessage({ action: Action.update_blocked_images, data: { content: {} } });
    }
};

const analyzeDOM = () => {
    if (!extensionOn) {
        return;
    }

    document.querySelectorAll("img").forEach(image => {
        if (image.complete) {
            filterImage(image);
            return;
        }

        image.addEventListener("load", () => {
            filterImage(image);
        });
    });
};

const analyzeMutation = (records: MutationRecord[], _observer: MutationObserver | null = null) => {
    if (!extensionOn) {
        return;
    }

    const nodeList: Node[] = [];
    const parseChildNodes = (rootNode: Node) => {
        if (!rootNode.hasChildNodes()) {
            if (rootNode.nodeName.toLowerCase() === "img") {
                nodeList.push(rootNode);
            }
            return;
        }

        for (const childNode of rootNode.childNodes) {
            parseChildNodes(childNode);
        }
    };

    for (const record of records) {
        for (const addedNode of record.addedNodes) {
            parseChildNodes(addedNode);
        }
    }

    nodeList.forEach(node => {
        const img = node as HTMLImageElement;
        if (img.complete) {
            filterImage(img);
            return;
        }

        img.addEventListener("load", () => {
            filterImage(img);
        });
    });
};

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
    votingEnabled = message.data.content.votingEnabled;
    ignoredTags = message.data.content.tagSettings;

    let localWhitelist = message.data.content.localWhitelist;
    if (localWhitelist) {
        localWhitelist = (localWhitelist as whitelistedImage[]).map(image => image.source);
    }
    imageWhitelist = message.data.content.sessionWhitelist.concat(localWhitelist);

    analyzeDOM(); // Call analyzeDOM() to run the first analysis of the website after filters are fetched. Some websites might not have mutations so this is needed.
};

const fetchStorage = () => {
    browser.runtime.sendMessage({ action: Action.get_resources, data: {} });
    getMaxZIndex();
};

// Report system
const reportImage = (message: browserMessage) => {
    if (document.getElementById("gvp-alert") || document.getElementById("gvp-reveal-image")) {
        return;
    }

    const imageSource: string = message.data.content.src;
    if (canvasSources.includes(imageSource)) {
        makeNotification("Cannot report that.");
        return;
    }

    const isVoted = votedImages.includes(imageSource);
    if (isVoted) {
        makeNotification("Cannot report image that you have voted on.");
        return;
    }

    let isRecyclable = false;
    if (imageFilters) {
        const targetImage = imageFilters.find(img => img.source === imageSource);
        if (targetImage) {
            isRecyclable = !Object.values(JSON.parse(targetImage.tags)).some(tagValue => tagValue === 1);
        }
    }

    const isReported = imageFilters.some(report => report.source === imageSource);
    const imageSourceBase64: string = message.data.content.base64src;
    const reportedImage = document.querySelector(`img[src="${imageSourceBase64}"]`);
    if (!isRecyclable && (isReported || reportedImage?.getAttribute("src-identifier") || imageWhitelist.includes(imageSource))) {
        makeNotification("This image has been reported already.");
        return;
    }

    const reportDiv = document.createElement("div");
    reportDiv.innerHTML = message.data.content.reportHTML;
    const reportStyle = document.createElement("style");
    reportStyle.innerHTML = message.data.content.reportCSS;
    const shadowRoot = document.createElement("div");
    shadowRoot.id = "gvp-shadow-root";
    document.body.appendChild(shadowRoot);

    const shadowDOM = (shadowRoot as HTMLElement).attachShadow({ mode: "open" });
    shadowDOM.appendChild(reportDiv);
    shadowDOM.appendChild(reportStyle);
    shadowDOM.getElementById("gvp-background")!.style.zIndex = maxZIndex.toString();
    (shadowDOM.getElementById("gvp-report-preview-image") as HTMLImageElement)!.src = imageSourceBase64;
    (shadowDOM.getElementById("gvp-submit-button") as HTMLButtonElement).disabled = true;

    let checkboxCounter = 0;
    const reportCheckboxes = shadowDOM.querySelectorAll(".gvp-checkbox");
    reportCheckboxes.forEach(checkbox => {
        checkbox.addEventListener("change", (event) => {
            const checkBoxValue = (event.target as HTMLInputElement).checked ? 1 : -1;
            checkboxCounter += checkBoxValue;
            (shadowDOM.getElementById("gvp-submit-button") as HTMLButtonElement).disabled = checkboxCounter < 1;
        });
    });

    shadowDOM.getElementById("gvp-close-report")?.addEventListener("click", () => {
        shadowRoot.remove();
    });
    shadowDOM.getElementById("gvp-cancel-report")?.addEventListener("click", () => {
        shadowRoot.remove();
    });
    shadowDOM.getElementById("gvp-submit-button")?.addEventListener("click", () => {
        const selectedTags: string[] = [];
        checkboxesTagsId.forEach(tag => {
            const checkbox = shadowDOM.getElementById(`${tag}`) as HTMLInputElement;
            if (checkbox.checked) {
                selectedTags.push(tag.split("-").at(1)!);
            }
        });
        sendData({
            src: imageSource,
            userID: "",
            tags: selectedTags,
            timeStamp: new Date().toISOString(),
        }, "report");

        shadowRoot.remove();
    });
};

const updateReportedImages = (message: browserMessage) => {
    reportedImages = message.data.content.reportedImages;
    votedImages = message.data.content.votedImages;
    imageFilters = message.data.content.imageFilters;
    analyzeDOM();
};

const updateSettings = (message: browserMessage) => {
    extensionOn = message.data.content.extensionOn ?? extensionOn;
    votingEnabled = message.data.content.votingEnabled ?? votingEnabled;
    analyzeDOM();
};

// Messaging setup
const messageMap = new messagingMap([
    [Action.send_resources, setupStorage],
    [Action.reporting_image, reportImage],
    [Action.make_notification, backgroundNotification],
    [Action.update_reported_images, updateReportedImages],
    [Action.update_settings, updateSettings],
]);

browser.runtime.onMessage.addListener((message: browserMessage, sender: browser.runtime.MessageSender) => {
    const requestedAction = messageMap.get(message.action);
    requestedAction(message, sender);
});

// Fetches filters as soon as the website finishes loading.
document.addEventListener("DOMContentLoaded", fetchStorage);

// Mutation observer setup.
const mutationObserver = new MutationObserver(analyzeMutation);
mutationObserver.observe(document, { childList: true, subtree: true, attributes: true, characterData: true });
