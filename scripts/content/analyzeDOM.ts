const filtersUrl : string = "https://api.github.com/repos/Cofeiini/GoodVibesPreserver/contents/filters.json?ref=main";
import { urlFilter, githubResponse } from "../tools/interfaces";
import { filterToken } from "../tools/token";

let blockedElementsSet : Set<{blockedElement : Element, recoverID : number, url : string}> = new Set();
let blockedElementsCounter : number = 0;

const makeWarning = (blockedElement : Element) : string => { 
    const elementWidth : number = (blockedElement as HTMLElement).offsetWidth;
    const elementHeight : number = (blockedElement as HTMLElement).offsetHeight;
    if(elementWidth <= 134 || elementHeight <= 52)
    {
        blockedElementsSet.add({blockedElement : blockedElement, recoverID: blockedElementsCounter, url: blockedElement.getAttribute('href') || blockedElement.getAttribute('src') || ""})
        return         `
            <div id="blocked-container-${blockedElementsCounter}" style="padding: 2px; background-color: rgb(31,31,31); border-radius: 20px; width: ${elementWidth}px; height: ${elementHeight}px; display: flex; align-items: center; justify-content:center">
            <button id="recover-button-${blockedElementsCounter}" style="font-family: Arial, Helvetica, sans-serif; font-weight: bold">
            Recover
            </button>
            </div>
        `
    }
    else
    {
        blockedElementsSet.add({blockedElement: blockedElement, recoverID: blockedElementsCounter, url: blockedElement.getAttribute('href') || blockedElement.getAttribute('src') || ""})
        return`
        <div  
        id="blocked-container-${blockedElementsCounter}"
        style="
        padding: 5px;
        display: flex;
        flex-direction: column;
        align-items: center;
        font-size: medium;
        width: 180px;
        gap: 6px;
        background: rgb(95, 31, 31);
        color: white;
        border-radius: 5px;
        border-style: solid;
        border-width: 1.5px;
        border-color: white;>
            <label style="        
            font-family: Arial, Helvetica, sans-serif;
            font-weight: bold;">
            ⚠️ Blocked content ⚠️</label> 

            <button id="recover-button-${blockedElementsCounter}" style="        
            font-family: Arial, Helvetica, sans-serif;
            font-size: 75%;
            color: black;
            cursor: pointer;
            border: none;
            border-radius: 4px;
            padding: 5px;
            box-shadow: 2px 2px 2px rgba(0, 0, 0, 0.411);"
            >Reveal content</button>
        </div>
    `
    }
    
}

const analyzeDOM = () : void => {
    const hrefElements : NodeListOf<Element> = document.querySelectorAll('[href]');
    const srcElements : NodeListOf<Element> = document.querySelectorAll('[src]');
    let elementSet : Set<{element : Element, url : string | null}> = new Set();

    hrefElements.forEach(element =>{
        elementSet.add({
            element: element,
            url: element.getAttribute("href")
        })
    })
    srcElements.forEach(element =>{
        elementSet.add({
            element: element,
            url: element.getAttribute("src")
        })
    })

    fetch(filtersUrl,{
        headers: {
            Authorization:`${filterToken}`
        }
    })
    .then( response => response.json())
    .then((responseJSON: githubResponse) => {
        const filtersString : string = atob(responseJSON.content);
        const filters : urlFilter[] = JSON.parse(filtersString)
        return filters;
    })
    .then((filters: urlFilter[]) =>{
        filters.forEach(filter => {
            elementSet.forEach(DOMElement => {
                if(DOMElement.url)
                {
                    if(new RegExp(filter.pattern).test(DOMElement.url))
                    {
                        console.log(`Removed element: ${DOMElement.url, DOMElement.element}`);
                        blockedElementsCounter++;                     
                        const warningSign : DocumentFragment = document.createRange().createContextualFragment(makeWarning(DOMElement.element));
                        DOMElement.element.parentNode?.replaceChild(warningSign,DOMElement.element);
                        document.getElementById(`recover-button-${blockedElementsCounter}`)?.addEventListener('click',recoverElement);
                        console.log("Blocked content.")
                    }
                }
            })
        })
    })
}

const recoverElement = (event: Event) : void =>{
    const recoverButtonHTML : HTMLElement = event.target as HTMLElement;
    const regexID : RegExpExecArray | null = /recover-button-(\d+)/.exec(recoverButtonHTML.getAttribute("id") || "");
    const recoverID : number = Number(regexID?.at(1));
    const blockedContainer : HTMLElement | null = document.getElementById(`blocked-container-${recoverID}`);
    blockedElementsSet.forEach(elem =>{
        if(elem.recoverID === recoverID)
        {
            if(blockedContainer)
            {
                var recover : boolean = window.confirm(`Do you want to recover this element? \n The source of the element comes from a blocked URL: ${elem.url}`);
                if(recover)
                {
                    blockedContainer.parentNode?.replaceChild(elem.blockedElement,blockedContainer);   
                }

                return;
            }
        }
    })
}

browser.runtime.onMessage.addListener((message, sender, sendResponse) =>{
    console.log("Message received in content");
    if(message.action === "add_listener")
    {
        console.log("Add listener called");
        document.getElementById("proceedanyways")?.addEventListener('click', () =>{
            console.log("Proceed button pressed");
            let selfUrl : string = window.location.href;
            browser.runtime.sendMessage({data: {action: "redirect", url: selfUrl, id: message.id}})
        })
    }
    return Promise.resolve("Message received");
})

if(document.readyState !== "loading")
{
    analyzeDOM()
}
else { document.addEventListener("DOMContentLoaded",analyzeDOM) }
