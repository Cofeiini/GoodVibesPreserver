export enum Action {
    get_resources,
    send_resources,
    update_blocked_images,
    reporting_image,
    update_report_queue,
    update_voted_images,
    make_request,
    get_voted_images,
    reveal_image_prompt,
    make_notification,
}

export type browserMessage = {
    /**
     * @action
     * Represents the action that the message receiver is requested to do.
     * @data
     * Contains the message @content object.
     * @content
     * Contains any data that is sent through the message.
     */
    action: Action,
    data: {
        // eslint-disable-next-line
        content: any
    }
};

type CustomFunction = (message: browserMessage, sender: browser.runtime.MessageSender) => void;

export class messagingMap extends Map<Action, CustomFunction> {

    // Using same constructor as parent class.
    // eslint-disable-next-line
    constructor(entries: any){
        super(entries);
    }

    /**
     * @param
     * key @action of the @message type represensting which function the custom map needs to return.
     * @returns
     * The function that matches the @param key, will return a void function with a debug message as fallback if key isn't found.
     */
    get(key: Action) {
        if (this.has(key)) {
            return super.get(key) as CustomFunction;
        }
        return () => {
            console.log("Bad Messaging Map access.");
        };
    }
}
