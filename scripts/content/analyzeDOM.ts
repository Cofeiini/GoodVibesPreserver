const filtersUrl : string = "https://api.github.com/repos/Cofeiini/GoodVibesPreserver/contents/filters.json?ref=main";
import { urlFilter, githubResponse } from "../tools/interfaces";
import { messagingMap, message, Action } from "../tools/messaging";


/**
 *  @blockedElementsSet - represents the Set where the blocked elements in the document are stored to recover them if the user wants to
 * 
 *  @blockedElementsCounter - represents the amount of blocked elements in the @blockedElementsSet
 * 
 *  When blocking an element, the element will be stored on the @blockedElementsSet and the recoverID will be the current @blockedElementsCounter value
 *  When recovering an element the function @recoverElement use the ID that we give to the warning sign with the @blockedElements counter as index in the @blockedElementsSet
**/

let blockedElementsSet : Set<{blockedElement : Element, recoverID : number, url : string}> = new Set();
let blockedElementsCounter : number = 0;

// Messaging system

let filters : urlFilter[];

const setupFilters = (message : message) =>{
    filters = message.data.content;
}

const fetchFilters = () => {
    console.log("Fetch filters called.");
    browser.runtime.sendMessage({ action: Action.get_filters, data: {} });
}

browser.runtime.onMessage.addListener((message,sender) =>{
    console.log(message.action);
    const requestedAction = messageMap.get(message.action);
    requestedAction(message);
})

const messageMap = new messagingMap([
    [Action.send_filters,setupFilters]
])

//

const makeWarning = (blockedElement : Element) : string => { 
    
    if(analyzeElement(blockedElement)) // This will replace element with a smaller version of the warning sign.
    {
        blockedElementsSet.add({blockedElement : blockedElement, recoverID: blockedElementsCounter, url: blockedElement.getAttribute('href') || blockedElement.getAttribute('src') || ""})
        return         `
            <div id="blocked-container-${blockedElementsCounter}" style="padding: 2px; background-color: rgb(31,31,31); border-radius: 20px; width: ${(blockedElement as HTMLElement).offsetWidth}px; height: ${(blockedElement as HTMLElement).offsetHeight}px; display: flex; align-items: center; justify-content:center">
            <button id="recover-button-${blockedElementsCounter}" style="font-family: Arial, Helvetica, sans-serif; font-weight: bold">
            Recover
            </button>
            </div>
        `
    }
    else // This will replace the element with the regular version of the warning sign.
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


/**
 * 
 * @param element represents the element that the function will analyze its dimensions.
 * 
 * @returns { boolean } for telling whether the warning sign should be the default or smaller one.
 * 
 */
const analyzeElement = (element: Element) : boolean =>{
    const elementHTML : HTMLElement = (element as HTMLElement);
    if(elementHTML.offsetWidth <= 134 || elementHTML.offsetHeight <= 52) { return true } // 134 pixels of width and 52 pixels of height is the minimum dimensions for the warning sign to look correctly.
    return false;
}

const analyzeDOM = () : void => {
    const hrefElements : NodeListOf<Element> = document.querySelectorAll('[href]');
    const srcElements : NodeListOf<Element> = document.querySelectorAll('[src]');
    let elementSet : Set<{element : Element, url : string | null}> = new Set();
    const activeRegEx : RegExp = new RegExp(`${window.location.hostname}`);

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

    filters.forEach(filter => {
        const filterRegExp = new RegExp(filter.pattern);
        elementSet.forEach(DOMElement => {
            const elementUrl = DOMElement.url?.split('/')[2];
            if(elementUrl)
            {
                if(filterRegExp.test(elementUrl) && !activeRegEx.test(elementUrl) && !DOMElement.element.hasAttribute('blocked-identifier'))
                {
                    console.log(`Removed element: ${DOMElement.url, DOMElement.element}`);
                    blockedElementsCounter++;
                    DOMElement.element.setAttribute('blocked-identifier','blocked');                    
                    const warningSign : DocumentFragment = document.createRange().createContextualFragment(makeWarning(DOMElement.element));
                    DOMElement.element.parentNode?.replaceChild(warningSign,DOMElement.element);
                    document.getElementById(`recover-button-${blockedElementsCounter}`)?.addEventListener('click',recoverElement);
                    console.log("Blocked content.")
                } 
            }
        })
    })
}

const recoverElement = (event: Event) : void =>{
    console.log("Recover element called");
    const recoverButtonElement : HTMLElement = event.target as HTMLElement;
    const regexID : RegExpExecArray | null = /recover-button-(\d+)/.exec(recoverButtonElement.getAttribute("id") || "");
    const recoverID : number = Number(regexID?.at(1));
    const blockedContainer : HTMLElement | null = document.getElementById(`blocked-container-${recoverID}`);
    blockedElementsSet.forEach(elem =>{
        if(elem.recoverID === recoverID)
        {
            if(blockedContainer)
            {
                console.log(elem.blockedElement);
                var recoverPrompt : boolean = window.confirm(`Do you want to recover this element? \n The source of the element comes from a blocked URL: ${elem.url}`);
                if(recoverPrompt)
                {
                    blockedContainer.parentNode?.replaceChild(elem.blockedElement,blockedContainer);   
                }
                return;
            }
        }
    })
}

// Mutation observer setup.

const mutationObserver = new MutationObserver(analyzeDOM);

const observerConfig = { childList: true, subtree: true, attributes: true, characterData: true};

mutationObserver.observe(document,observerConfig);



// Fetchs filters as soon as the website finishes loading.

if(document.readyState !== "loading")
{
    fetchFilters();
}
else { 
    document.addEventListener("DOMContentLoaded",fetchFilters);
}
