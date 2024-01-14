export let maxZIndex: number = 0;
export const getMaxZIndex = (): void => {
    maxZIndex = Math.max(...Array.from(document.querySelectorAll("body div, body img, body nav, body section"), (element) => {
        return parseInt(getComputedStyle(element).zIndex);
    }).filter(zIndex => !Number.isNaN(zIndex)));
    maxZIndex++;
};
