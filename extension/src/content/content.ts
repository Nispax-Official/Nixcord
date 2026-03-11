/**
 * Nixcord Extension Content Script
 * Runs in ISOLATED world. Injects loader.js (a web-accessible file)
 * into the page as a <script src> tag — no inline scripts, CSP safe.
 */

(function nixcordLoader() {
  "use strict";

  const loaderUrl = chrome.runtime.getURL("content/loader.js");

  const script = document.createElement("script");
  script.src = loaderUrl;
  script.dataset.nixcordBundle = chrome.runtime.getURL("nixcord.js");
  script.addEventListener("load", () => script.remove(), { once: true });

  (document.head ?? document.documentElement).appendChild(script);
})();