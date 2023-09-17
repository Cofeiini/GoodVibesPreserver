const filtersUrl : string = "https://api.github.com/repos/Cofeiini/GoodVibesPreserver/contents/filters.json?ref=main";
import { urlFilter } from "../tools/interfaces";
import { githubResponse } from "../tools/interfaces";

let blockedElementsSet : Set<{blockedElement : Element, recoverID : number}> = new Set();
let blockedElementsCounter : number = 0;

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
            Authorization:`token`
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
                        const elementPosition : string = (DOMElement.element as HTMLElement).style.position || "auto";
                        const warningSignString : string = 
                        `
                            <div style="
                            padding: 5px;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            width: 180px;
                            gap: 6px;
                            background: rgb(95, 31, 31);
                            border-radius: 5px;
                            border-style: solid;
                            border-width: 1.5px;
                            border-color: white; 
                            position: ${elementPosition};" 
                            id="blocked-container-${blockedElementsCounter}">
                                <label style="        
                                font-family: Arial, Helvetica, sans-serif;
                                font-weight: bold;
                                color: white;">
                                ⚠️ Blocked content ⚠️</label> 
    
                                <button style="        
                                font-family: Arial, Helvetica, sans-serif;
                                cursor: pointer;
                                border: none;
                                border-radius: 4px;
                                padding: 5px;
                                box-shadow: 2px 2px 2px rgba(0, 0, 0, 0.411);"
                                id="recover-button-${blockedElementsCounter}">Reveal content</button>
                            </div>
                        `
                        const warningSign : DocumentFragment = document.createRange().createContextualFragment(warningSignString);
                        blockedElementsSet.add({blockedElement: DOMElement.element, recoverID: blockedElementsCounter})
                        DOMElement.element.parentNode?.replaceChild(warningSign,DOMElement.element);
                        document.getElementById(`recover-button-${blockedElementsCounter}`)?.addEventListener('click',recoverElement);
                        console.log("Blocked content.")
                    }
                }
            })
        })
    })
}

const recoverElement = (event: Event) =>{
    const recoverButtonHTML : HTMLElement = event.target as HTMLElement;
    const regexID : RegExpExecArray | null = /recover-button-(\d+)/.exec(recoverButtonHTML.getAttribute("id") || "");
    const recoverID : number = Number(regexID?.at(1));
    const blockedContainer : HTMLElement | null = document.getElementById(`blocked-container-${recoverID}`);
    blockedElementsSet.forEach(pair =>{
        if(pair.recoverID === recoverID)
        {
            if(blockedContainer)
            {
                blockedContainer.parentNode?.replaceChild(pair.blockedElement,blockedContainer);   
            }
        }
    })
}

browser.runtime.onMessage.addListener((message, sender, sendResponse) =>{
    console.log(message);
    if(message.action === "add listener")
    {
        document.querySelector('.proceed-button')?.addEventListener('click', () =>{
            // make the background script send the user to the original page and skip filters
        })
    }
})

if(document.readyState !== "loading")
{
    analyzeDOM()
}
else { document.addEventListener("DOMContentLoaded",analyzeDOM) }
