
/**
 * @param width Width in pixels of the image that is getting filtered.
 * @param height Height in pixels of the image that is getting filtered.
 * @returns { String } Canvas element that will cover the filtered image.
 */

export const generateFilteredImage = (width: number, height: number): string => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const canvasContext = canvas.getContext("2d");
    if (canvasContext) {
        const gradient = canvasContext.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, "rgb(10,10,10)");
        gradient.addColorStop(1, "rgb(55,55,55)");
        canvasContext.fillStyle = gradient;
        canvasContext.fillRect(0, 0, width, height);
    }
    return canvas.toDataURL("image/png");
};
