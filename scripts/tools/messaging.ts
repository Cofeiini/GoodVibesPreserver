import { urlFilter } from "./interfaces"

export enum Action{
    get_filters,
    send_filters,
    redirect,
    add_listener,
    analyze_elements,
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
     * @param key - The {@link Action} of the {@link message} type representing which function the custom map needs to return.
     * @param
     * key @action of the @message type represensting which function the custom map needs to return.
     * 
     * @returns
     * The function that matches the @param key. This will return a function with a debug message as fallback, if key isn't found.
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


