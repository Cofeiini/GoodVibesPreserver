import {
__toESM,
require_client,
require_react
} from "../chunk-ff9566dbb8bbd2d1.js";

// ui/popup/popup.tsx
var React = __toESM(require_react(), 1);
var client = __toESM(require_client(), 1);
var Popup = () => {
  return React.createElement(React.Fragment, null, React.createElement("div", {
    style: { width: "200px", height: "450px", backgroundColor: "red" }
  }, React.createElement("button", {
    onClick: () => {
      browser.tabs.create({ url: "../options/options.html" });
    }
  }, "Options Page")));
};
var root = client.createRoot(document.getElementById("gvp-popup-root"));
root.render(React.createElement(Popup, null));
