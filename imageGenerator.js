import nodeHtmlToImage from "node-html-to-image";
import fs from "node:fs";
import { tagsDisplayText } from "./src/content/tags";
import gvp_logo from "./assets/gvplogo128.png";

const assetPath = "./testing";

const logo_data = `data:image/png;base64,${new Buffer.from(fs.readFileSync(String(gvp_logo))).toString("base64")}`;
const cursor_default = "data:image/png;base64,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";
const cursor_pointer = "data:image/png;base64,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";

const gvpReportHTML = fs.readFileSync("./htmlresources/gvp-report.txt", "utf8");
const gvpReportCSS = fs.readFileSync("./htmlresources/gvp-report-style.txt", "utf8");
const gvpRevealImageHTML = fs.readFileSync("./htmlresources/gvp-revealimage.txt", "utf8");
const gvpRevealImageCSS = fs.readFileSync("./htmlresources/gvp-revealimage-style.txt", "utf8");

const installMouseHelper = async (page) => {
    await page.evaluate((cursor) => {
        const box = document.createElement("puppeteer-mouse-pointer");
        const styleElement = document.createElement("style");
        styleElement.innerHTML = `
puppeteer-mouse-pointer {
    pointer-events: none;
    position: absolute;
    content: url(${cursor});
    top: 0;
    left: 0;
    z-index: 1;
    aspect-ratio: 1/1;
    height: 24px;
}
`;
        document.head.appendChild(styleElement);
        document.body.appendChild(box);
        document.addEventListener("mousemove", event => {
            box.style.left = `${event.pageX }px`;
            box.style.top = `${event.pageY }px`;
        });
    }, cursor_pointer);
};

if (!fs.existsSync(assetPath)) {
    fs.mkdirSync(assetPath);
}

nodeHtmlToImage({
    output: `${assetPath}/report3.png`,
    html: `
<html lang="en">
<body>
    ${gvpReportHTML}
    <style>${gvpReportCSS}</style>
</body>
</html>
`,
    transparent: true,
    selector: "#gvp-alert",
    beforeScreenshot: async page => {
        await installMouseHelper(page);
        await page.setViewport({ width: 1920, height: 1080 });
        await page.$eval("#gvp-report-preview-image", (node, logo) => node.src = logo, logo_data);

        for (const [key, value] of tagsDisplayText) {
            await page.evaluate((tag, text) => {
                const tagsSection = document.querySelector(".gvp-tags-section");
                const container = document.createElement("div");
                container.className = "gvp-tag-container";

                const input = document.createElement("input");
                input.type = "checkbox";
                input.className = "gvp-checkbox";
                input.id = `gvp-${tag}-checkbox`;
                input.checked = true;

                const label = document.createElement("label");
                label.htmlFor = input.id;
                label.innerText = text;

                container.appendChild(input);
                container.appendChild(label);
                tagsSection.appendChild(container);
            }, key, value);
        }

        await page.hover(`#gvp-${tagsDisplayText.keys().next().value}-checkbox + label`);
        const node = await page.$("#gvp-alert");
        await node.screenshot({
            path: `${assetPath}/report2.png`,
            omitBackground: true,
        });

        await page.hover("#gvp-submit-button");
    },
});

nodeHtmlToImage({
    output: `${assetPath}/report5.png`,
    html: `
<html lang="en">
<body>
    ${gvpRevealImageHTML}
    <style>${gvpRevealImageCSS}</style>
</body>
</html>
`,
    transparent: true,
    selector: "#gvp-reveal-image",
    beforeScreenshot: async page => {
        await installMouseHelper(page);
        await page.setViewport({ width: 1920, height: 1080 });
        await page.$eval("#gvp-image-preview", (node, logo) => node.src = logo, logo_data);

        const imageTagArray = [...tagsDisplayText.values()];
        await page.$eval("#gvp-image-preview-tags", (node, text) => node.textContent = text, imageTagArray.join(", "));
        for (const [key, value] of tagsDisplayText) {
            await page.evaluate((tag, text) => {
                const feedback = document.querySelector(".gvp-feedback-checkboxes");
                const tagbox = document.createElement("div");
                tagbox.className = "gvp-tagbox";

                const label = document.createElement("label");
                label.innerText = text;

                const reveal = document.createElement("div");
                reveal.className = "gvp-reveal-checkbox";

                const positive = document.createElement("img");
                positive.id = `gvp-positive-checkbox-${tag}`;
                positive.className = "gvp-positive-checkbox";

                const negative = document.createElement("img");
                negative.id = `gvp-negative-checkbox-${tag}`;
                negative.className = "gvp-negative-checkbox";
                negative.style.backgroundColor = "rgb(179, 0, 0)";

                reveal.appendChild(positive);
                reveal.appendChild(negative);
                tagbox.appendChild(label);
                tagbox.appendChild(reveal);

                feedback.appendChild(tagbox);
            }, key, value);
        }

        await page.hover(`#gvp-negative-checkbox-${tagsDisplayText.keys().next().value}`);
        let node = await page.$("#gvp-reveal-image");
        await node.screenshot({
            path: `${assetPath}/voting.png`,
            omitBackground: true,
        });

        await page.hover("#gvp-whitelist-checkbox");
        node = await page.$(".gvp-whitelist");
        await node.screenshot({
            path: `${assetPath}/whitelisting.png`,
            omitBackground: true,
        });

        await page.mouse.reset();
        await page.evaluate(() => {
            document.getElementById("gvp-user-feedback").remove();
        });
    },
});

nodeHtmlToImage({
    output: `${assetPath}/report4.png`,
    html: `
<html lang="en">
<body>
    <img id="gvp-filtered-image" src="" alt="" />
</body>
</html>
`,
    transparent: true,
    selector: "#gvp-filtered-image",
    beforeScreenshot: async page => {
        await installMouseHelper(page);
        await page.setViewport({ width: 1920, height: 1080 });

        await page.evaluate(() => {
            const width = 960;
            const height = 540;

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

            document.getElementById("gvp-filtered-image").src = canvas.toDataURL("image/png");
        });

        await page.hover("#gvp-filtered-image");
    },
});
