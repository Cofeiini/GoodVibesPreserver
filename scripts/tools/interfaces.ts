export interface urlFilter
{
    pattern: RegExp,
    tags: string[],
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
};

export type fallbackResources = {
    [key: string]: string
    blockedElementHTML: string,
    blockedElementSmallHTML: string,
    gvpNotificationCSS: string,
    gvpNotificationHTML: string,
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
