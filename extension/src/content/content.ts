/**
 * Nixcord Extension Content Script
 * Runs in ISOLATED world to get the extension URL, then passes it to
 * the MAIN world via a CustomEvent so nixcord.js can be injected with
 * full access to Discord's JS context.
 */

(function nixcordLoader() {
  "use strict";

  // We're in ISOLATED world here — chrome.runtime.getURL works fine
  const bundleUrl = chrome.runtime.getURL("nixcord.js");

  function injectIntoMain(url: string) {
    // Create a script that runs in MAIN world to inject nixcord.js
    const injector = document.createElement("script");
    injector.textContent = `
(function() {
  if (window.__nixcord_loaded) return;
  window.__nixcord_loaded = true;

  // Expose bridge before bundle loads
  Object.defineProperty(window, "nixcordBridge", {
    value: { platform: "extension", applyUpdate: () => window.location.reload() },
    writable: false,
    configurable: false
  });

  var script = document.createElement("script");
  script.src = ${JSON.stringify(url)};
  script.type = "text/javascript";
  script.addEventListener("load", function() { script.remove(); }, { once: true });
  script.addEventListener("error", function() {
    console.error("[Nixcord] Failed to load bundle from: " + script.src);
    script.remove();
  }, { once: true });
  (document.head || document.documentElement).appendChild(script);
})();
    `.trim();

    (document.head ?? document.documentElement).appendChild(injector);
    injector.remove();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => injectIntoMain(bundleUrl), { once: true });
  } else {
    injectIntoMain(bundleUrl);
  }
})();