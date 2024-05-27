const maxWidth = 200;
const maxHeight = 200;

const makeThumbnail = (src: string) => {
    return new Promise((resolve, reject) => {
        const thumbnail = new Image();
        thumbnail.onload = () => {
            let width = thumbnail.width || maxWidth;
            let height = thumbnail.height || maxHeight;

            if ((width > height) && (width > maxWidth)) {
                height *= maxWidth / width;
                width = maxWidth;
            }
            if ((height > width) && (height > maxHeight)) {
                width *= maxHeight / height;
                height = maxHeight;
            }

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;

            const context = canvas.getContext("2d");
            context?.drawImage(thumbnail, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg"));
        };
        thumbnail.onerror = () => {
            reject("Error");
        };
        thumbnail.src = src;
    });
};

export default makeThumbnail;
