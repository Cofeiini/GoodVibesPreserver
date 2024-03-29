<div style="display: flex; justify-content: center">
    <img src="./assets/logo/gvplogo128.png" alt="Logo">
</div>
<div style="display:flex; justify-content: center">
    <h1>Good Vibes Preserver</h1>
</div>

---
This browser extension is designed to enhance user experience during web browsing by replacing undesirable content on web pages.

It incorporates a comprehensive reporting system enabling users to report images along with specifying the corresponding tags.

Users can provide feedback on reported images utilizing a voting system, where they can cast positive or negative votes for each tag.

The content blocking can be customized by allowing certain tags or whitelisting specific content.

---
## Image Reporting Example
### 1. Select image and click on the Report Image context menu item
![Report Example](./assets/help/report1.png)

### 2. Select the tags that apply for the image
![Tags Example](./assets/help/report2.png)

### 3. The image will now be blocked
![Blocked Example](./assets/help/report4.png)

---
## Building from source
> This project is built and managed with [Bun](https://bun.sh)

> This project uses [Firefox Developer Edition](https://www.mozilla.org/en-US/firefox/developer) for testing

### Getting started
* Clone the repository
* Open a terminal in the root of the source directory
* Execute `bun install` to get the dependencies
* Execute `bun run install` to generate an extension package for manually installing it as a temporary extension
  * \[Alternative\] Execute `bun run dev` to compile and launch [Firefox Developer Edition](https://www.mozilla.org/en-US/firefox/developer) with the extension
