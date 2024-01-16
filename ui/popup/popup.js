import {
__toESM,
require_client,
require_react
} from "../chunk-ff9566dbb8bbd2d1.js";

// ui/popup/popup.tsx
var React = __toESM(require_react(), 1);
var client = __toESM(require_client(), 1);

// assets/settings-icon.svg
var settings_icon_default = "../settings-icon-d99d085425053ff1.svg";

// scripts/tools/messaging.ts
var Action;
(function(Action2) {
  Action2[Action2["get_resources"] = 0] = "get_resources";
  Action2[Action2["send_resources"] = 1] = "send_resources";
  Action2[Action2["update_reported_images"] = 2] = "update_reported_images";
  Action2[Action2["reporting_image"] = 3] = "reporting_image";
  Action2[Action2["update_report_queue"] = 4] = "update_report_queue";
  Action2[Action2["update_voted_images"] = 5] = "update_voted_images";
  Action2[Action2["make_request"] = 6] = "make_request";
  Action2[Action2["get_voted_images"] = 7] = "get_voted_images";
  Action2[Action2["reveal_image_prompt"] = 8] = "reveal_image_prompt";
  Action2[Action2["make_notification"] = 9] = "make_notification";
  Action2[Action2["turnOffOn"] = 10] = "turnOffOn";
})(Action || (Action = {}));

// ui/popup/popup.tsx
var PowerButton = () => {
  const [status, setStatus] = React.useState(true);
  React.useEffect(() => {
    browser.runtime.sendMessage({ action: Action.turnOffOn, data: { content: { status } } });
  }, [status]);
  return React.createElement(React.Fragment, null, React.createElement("div", {
    className: "gvp-popup-power-button",
    style: { backgroundColor: status ? "white" : "black" },
    onClick: () => {
      setStatus(!status);
    }
  }, React.createElement("div", {
    className: "gvp-popup-status-indicator",
    style: {
      transform: status ? "translateX(60px)" : "translateX(0px)",
      background: status ? "black" : "white"
    }
  }), React.createElement("label", {
    className: "gvp-popup-status-label",
    style: {
      left: status ? "20" : "auto",
      right: status ? "auto" : "20",
      color: status ? "black" : "white"
    }
  }, status ? "On" : "Off")));
};
var Popup = () => {
  return React.createElement(React.Fragment, null, React.createElement("main", {
    className: "gvp-popup-main"
  }, React.createElement("img", {
    src: settings_icon_default,
    className: "gvp-settings-button",
    width: 30,
    height: 30,
    onClick: () => {
      browser.tabs.create({ url: "../options/options.html" });
    }
  }), React.createElement(PowerButton, null)));
};
var root = client.createRoot(document.getElementById("gvp-popup-root"));
root.render(React.createElement(Popup, null));
