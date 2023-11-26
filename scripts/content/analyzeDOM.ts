import { urlFilter, githubResponse } from "../tools/interfaces";
import { messagingMap, message, Action } from "../tools/messaging";
import { Optional } from "../tools/optional";


// Messaging system

var filters : urlFilter[];
var blockedSignString : string;
var blockedSignSmallString : string;

const setupFilters = (message : message) =>{
    filters = message.data.content.filters;
    blockedSignString = message.data.content.blockedSign;
    blockedSignSmallString = message.data.content.blockedSignSmall;
    console.log(blockedSignSmallString);
    console.log(blockedSignString);
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


// Element filtering

let blockedElementsSet : Set<{blockedElement : Element, recoverID : number, url : string}> = new Set();
let blockedElementsCounter : number = 0; 

/**
 * 
 * @param blockedElement Element that is being blocked.
 * 
 * @returns { string } representing the HTML of the proper warning sign that replaces the element.
 * 
 */

const makeWarning = (blockedElement : Element) : string => { 
    const parser = new DOMParser();
    const serializer = new XMLSerializer();
    const elementHeight = (blockedElement as HTMLElement).offsetHeight;
    const elementWidth = (blockedElement as HTMLElement).offsetWidth;
    const measuredWarningSize : string = analyzeElement(blockedElement); // analyzeElement returns the proper HTML string depending the parameter element dimensions.
    const newWarningHTML : Document = parser.parseFromString(measuredWarningSize,'text/html');
    const blockedContainer = new Optional<HTMLElement>(newWarningHTML.getElementById("blocked-container-?"));
    const revealButton = new Optional<HTMLElement>(newWarningHTML.getElementById("recover-button-?"));
    if(measuredWarningSize === blockedSignSmallString)
    {
        blockedContainer.value().style.width = elementWidth.toString();
        blockedContainer.value().style.height = elementHeight.toString();
    }
    blockedContainer.value().id = `blocked-container-${blockedElementsCounter}`;
    revealButton.value().id = `recover-button-${blockedElementsCounter}`;
    return serializer.serializeToString(newWarningHTML);
}


/**
 * 
 * @param element represents the element that the function will analyze its dimensions.
 * 
 * @returns { boolean } for telling whether the warning sign should be the default or smaller one.
 * 
 */
const analyzeElement = (element: Element) : string =>{
    const elementHTML : HTMLElement = (element as HTMLElement);
    if(elementHTML.offsetWidth <= 134 || elementHTML.offsetHeight <= 52) { return blockedSignSmallString } // 134 pixels of width and 52 pixels of height is the minimum dimensions for the warning sign to look correctly.
    return blockedSignString;
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
            const elementUrl = DOMElement.url?.split('/')[2]; // TODO: rework filters, probably add a '^' on the beginning of the pattern because this line is needed to avoid matching URLs with other URLs in the URL parameters.
            if(elementUrl)
            {
                if(filterRegExp.test(elementUrl) && !activeRegEx.test(elementUrl) && !DOMElement.element.hasAttribute('blocked-identifier'))
                {
                    console.log(`Removed element: ${DOMElement.url, DOMElement.element}`);
                    blockedElementsCounter++;
                    blockedElementsSet.add({blockedElement: DOMElement.element, recoverID: blockedElementsCounter, url: DOMElement.element.getAttribute('href') || DOMElement.element.getAttribute('src') || ""});
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
    const regexID : RegExpExecArray | null = /recover-button-(\d+)/.exec(recoverButtonElement.getAttribute("id") || ""); // Gets the id of the blocked element since we give the same id to the recover button when blocking.
    const recoverID : number = Number(regexID?.at(1));
    const blockedContainer : HTMLElement | null = document.getElementById(`blocked-container-${recoverID}`); // Gets the proper container that represents the blocked element tied to the button.
    blockedElementsSet.forEach(elem =>{
        if(elem.recoverID === recoverID)
        {
            if(blockedContainer)
            {
                console.log(elem.blockedElement);
                var recoverPrompt : boolean = window.confirm(`Do you want to recover this element? \n The source of the element comes from a blocked URL: ${elem.url}`);
                if(recoverPrompt)
                {
                    blockedContainer.parentNode?.replaceChild(elem.blockedElement,blockedContainer);   // Replaces the blocked element warning sign with the original element.
                }
                return;
            }
        }
    })
}

//


// Mutation observer setup.

const mutationObserver = new MutationObserver(analyzeDOM);

const observerConfig = { childList: true, subtree: true, attributes: true, characterData: true};

mutationObserver.observe(document,observerConfig);

//


// Fetchs filters as soon as the website finishes loading.

if(document.readyState !== "loading"){
    fetchFilters();
}
else {   document.addEventListener("DOMContentLoaded",fetchFilters);    }