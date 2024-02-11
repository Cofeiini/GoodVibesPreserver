export type imageFilter = {
    source: string,
    tags: string,
    id: number,
};

export class tagInnerStructure {
    checkedNegative = false;
    checkedPositive = false;
    tagValue = 0;
}

export type backoffObject = {
    calls: number,
    base: number,
    cap: number,
};

export class tagCheckboxes {
    [key: string]: tagInnerStructure;
    hatespeech = new tagInnerStructure();
    extremism = new tagInnerStructure();
    misinformation = new tagInnerStructure();
    offensivehumor = new tagInnerStructure();
    sexualcontent = new tagInnerStructure();
    harassment = new tagInnerStructure();
    gore = new tagInnerStructure();
    drugs = new tagInnerStructure();
    selfharm = new tagInnerStructure();
    shockingcontent = new tagInnerStructure();
}

export type HTMLResources = {
    [key: string]: string
    gvpReportHTML: string,
    gvpReportCSS: string,
    gvpNotificationHTML: string,
    gvpNotificationCSS: string,
    gvpRevealImageHTML: string,
    gvpRevealImageCSS: string,
};

export type fallbackResources = {
    [key: string]: string
    gvpNotificationCSS: string,
    gvpNotificationHTML: string,
    gvpRevealImageHTML: string,
    gvpRevealImageCSS: string,
};

export interface githubResponse {
    "type": string,
    "size": number,
    "name": string,
    "path": string,
    "content": string,
    "sha": string,
    "url": string,
    "git_url": string | null,
    "html_url": string | null,
    "download_url": string | null,
    "_links": {
        "git": string,
        "html": string,
        "self": string
    }
}

export class feedbackObject {
    [key: string]: number | string;
    userID = "";
    reportID = 0;
    hatespeech = 0;
    extremism = 0;
    misinformation = 0;
    offensivehumor = 0;
    sexualcontent = 0;
    harassment = 0;
    gore = 0;
    drugs = 0;
    selfharm = 0;
    shockingcontent = 0;
}

export type reportObject = {
    src: string,
    userID: string,
    tags: string[],
    timeStamp: string,
};

export type whitelistedImage = {
    source: string,
    thumbnail: string,
};

export type failedRequest = {
    data: feedbackObject | reportObject,
    route: string,
};
