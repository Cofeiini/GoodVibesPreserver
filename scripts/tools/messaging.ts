import { urlFilter } from "./interfaces"

export enum Action {
    get_filters = "GET_FILTERS",
    send_filters = "SEND_FILTERS",
    redirect = "REDIRECT",
    add_listener = "ADD_LISTENER",
}

export type message = {
    /**
     * @action 
     * Represents the action that the message receiver is requested to do.
     * 
     * @data 
     * Contains the message @content object.
     * 
     * @content 
     * Contains any data that is sent through the message.
     */
    action : Action,
    data : {
        content: any
    }
}

export class messagingMap extends Map<Action,Function> {

    // Using same constructor as parent class.
    constructor(entries : any)
    {
        super(entries)
    }

    /**
     * @param
     * key @action of the @message type represensting which function the custom map needs to return.
     * 
     * @returns 
     * The function that matches the @param key, will return a void function with a debug message as fallback if key isn't found.
     */
    get(key : Action)
    {
        if(this.has(key))
        {
            return super.get(key) as Function;
        }
        
        return () => { console.log("Bad Messaging Map access.")}
    }
}


