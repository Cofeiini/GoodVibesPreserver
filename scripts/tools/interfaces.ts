export interface urlFilter
{
    pattern: RegExp,
    tags:string[],
}


export interface filterResults
{
    url: URL,
    sitename: string,
    tags : string | string[],
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

const getHostname = (URL : string) : string | undefined =>{
    const hostname : string | undefined = /http(s)?:\/\/?(\w+\.\w{2,})/.exec(URL)?.[3];
    if(hostname) return hostname;
}