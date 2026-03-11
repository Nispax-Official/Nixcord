/**
 * Nixcord Loader
 * Web-accessible script that runs in the page's MAIN world.
 * Reads the bundle URL from its own script tag's data attribute,
 * then injects nixcord.js into Discord's JS context.
 */
(function () {
  "use strict";

  if (window.__nixcord_loaded) return;
  window.__nixcord_loaded = true;

  // Grab bundle URL passed via data attribute from content.js
  var me = document.currentScript;
  var bundleUrl = me && me.dataset.nixcordBundle;

  if (!bundleUrl) {
    console.error("[Nixcord] loader.js: could not find bundle URL");
    return;
  }

  // Expose bridge
  try {
    Object.defineProperty(window, "nixcordBridge", {
      value: { platform: "extension", applyUpdate: function () { window.location.reload(); } },
      writable: false,
      configurable: false
    });
  } catch (e) {
    // Already defined — fine
  }

  // Inject nixcord.js as a proper <script src> — CSP allows extension URLs
  var script = document.createElement("script");
  script.src = bundleUrl;
  script.type = "text/javascript";
  script.addEventListener("load", function () { script.remove(); }, { once: true });
  script.addEventListener("error", function () {
    console.error("[Nixcord] Failed to load bundle:", bundleUrl);
    script.remove();
  }, { once: true });

  (document.head || document.documentElement).appendChild(script);
})();