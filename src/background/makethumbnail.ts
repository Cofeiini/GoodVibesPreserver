const maxWidth = 200;
const maxHeight = 200;

const makeThumbnail = (src: string) => {
    return new Promise((resolve, reject) => {
        const thumbnail = new Image();
        thumbnail.src = src;
        thumbnail.onload = () => {
            let width = thumbnail.width;
            let height = thumbnail.height;
            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }
            }
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            canvas.width = width;
            canvas.height = height;
            context?.drawImage(thumbnail, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg"));
        };
        thumbnail.onerror = () => {
            reject("Error");
        };
    });
};

export default makeThumbnail;
