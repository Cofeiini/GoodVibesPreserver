export interface urlFilter
{
    pattern: RegExp,
    tags: string[],
}

export type imageFilter = {
    source: string,
    tags: string,
    id: number,
};

export class feedbackObject {
    [key: string]: number;
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

export class tagInnerStructure{
    checkedNegative = false;
    checkedPositive = false;
    tagValue = 0;
}

export class tagCheckboxes{
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
    blockedSiteHTML: string,
    blockedElementHTML: string,
    blockedElementSmallHTML: string,
    gvpReportHTML: string,
    gvpReportCSS: string,
    gvpNotificationHTML: string,
    gvpNotificationCSS: string,
    gvpRevealImageHTML: string,
    gvpRevealImageCSS: string,
};

export type fallbackResources = {
    [key: string]: string
    blockedElementHTML: string,
    blockedElementSmallHTML: string,
    gvpNotificationCSS: string,
    gvpNotificationHTML: string,
    gvpRevealImageHTML: string,
    gvpRevealImageCSS: string,
};

export interface filterResults
{
    url: URL,
    sitename: string,
    tags: string[],
    blocked: boolean,
}

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

export type reportObject = {
    src: string,
    userID: string,
    tags: string[],
    timeStamp: string,
};
