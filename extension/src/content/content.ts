/**
 * Nixcord Extension Content Script
 * Runs at document_start in the MAIN world so it has direct access
 * to Discord's JS context — no messaging overhead, no world boundary.
 *
 * We inject a <script> tag pointing to our web-accessible nixcord.js
 * bundle so it runs in the page's JS context like any other script.
 */

(function nixcordExtensionLoader() {
  "use strict";

  // Bail if already injected (e.g. SPA navigation)
  if ((window as unknown as Record<string, unknown>).__nixcord_loaded) return;
  (window as unknown as Record<string, unknown>).__nixcord_loaded = true;

  function injectScript(src: string) {
    const script = document.createElement("script");
    script.src = src;
    script.type = "text/javascript";

    // Remove from DOM after load — keeps things tidy
    script.addEventListener("load", () => script.remove(), { once: true });
    script.addEventListener("error", () => {
      console.error("[Nixcord] Failed to load bundle from:", src);
      script.remove();
    }, { once: true });

    // Inject into <head> or <html> — document might not have <body> yet
    (document.head ?? document.documentElement).appendChild(script);
  }

  // chrome.runtime.getURL works in both Chrome (MV3) and Firefox (MV2)
  const bundleUrl = (typeof chrome !== "undefined" && chrome.runtime?.getURL)
    ? chrome.runtime.getURL("nixcord.js")
    : null;

  if (!bundleUrl) {
    console.error("[Nixcord] Could not resolve extension URL. Is the extension loaded correctly?");
    return;
  }

  // If DOM is already past document_start, inject now
  // Otherwise wait for the earliest safe injection point
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => injectScript(bundleUrl), { once: true });
  } else {
    injectScript(bundleUrl);
  }

  // Expose bridge for settings panel to call extension APIs
  Object.defineProperty(window, "nixcordBridge", {
    value: {
      platform: "extension",
      applyUpdate: () => {
        // Extension updates go through the Chrome/Firefox extension update mechanism
        // Manual reload for now
        window.location.reload();
      }
    },
    writable: false,
    configurable: false
  });
})();
