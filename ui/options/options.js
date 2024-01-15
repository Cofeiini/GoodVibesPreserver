import {
__toESM,
require_client,
require_react
} from "../chunk-ff9566dbb8bbd2d1.js";

// ui/options/options.tsx
var React = __toESM(require_react(), 1);
var client = __toESM(require_client(), 1);
var OptionsPage = () => {
  return React.createElement(React.Fragment, null, React.createElement("div", {
    style: { position: "fixed", width: "20%", height: "100%", backgroundColor: "red", left: "0", top: "0" }
  }), React.createElement("main", {
    style: { position: "fixed", width: "60%", height: "100%", backgroundColor: "blue", right: "10%", top: "0" }
  }));
};
var root = client.createRoot(document.getElementById("root"));
root.render(React.createElement(OptionsPage, null));
