/**
 * Nixcord Core Bootstrap
 * Entry point shared by both desktop and web platforms.
 * Initializes in a specific order to avoid race conditions.
 */

import { startEnabledPlugins, notifyModulesReady } from "./plugins/registry";
import { restoreThemes } from "./themes/engine";

export * from "./patcher/index";
export * from "./patcher/webpack";
export * from "./plugins/registry";
export * from "./themes/engine";
export * from "./settings/store";
export * from "./utils/updater";

const NIXCORD_VERSION = "1.0.0";

async function bootstrap() {
  console.log(`%c[Nixcord] v${NIXCORD_VERSION} by NISPAX InfoTech`, "color:#5865F2;font-weight:bold;font-size:13px");

  // 1. Restore themes first so UI looks correct before plugins run
  try {
    await restoreThemes();
  } catch (err) {
    console.error("[Nixcord] Theme restore failed:", err);
  }

  // 2. Start plugins that were enabled in previous session
  try {
    await startEnabledPlugins();
  } catch (err) {
    console.error("[Nixcord] Plugin startup failed:", err);
  }

  // 3. Wait for Discord's webpack to finish, then notify plugins
  waitForModules().then(notifyModulesReady);

  // 4. Auto-update is handled by the background service worker (no CSP restrictions)
  // We just log that we're ready
  console.log("%c[Nixcord] Ready", "color:#3ba55c;font-weight:bold;");

function waitForModules(): Promise<void> {
  return new Promise(resolve => {
    let resolved = false;

    const checkReady = () => {
      if (resolved) return;
      // @ts-expect-error
      if (typeof window?.webpackChunkdiscord_app !== "undefined") {
        resolved = true;
        resolve();
      }
    };

    // Poll lightly — stops as soon as webpack is present
    const interval = setInterval(() => {
      checkReady();
      if (resolved) clearInterval(interval);
    }, 100);

    // Hard timeout fallback
    setTimeout(() => {
      if (!resolved) {
        clearInterval(interval);
        resolved = true;
        resolve();
      }
    }, 15000);
  });
}

bootstrap().catch(err => {
  console.error("[Nixcord] Bootstrap failed catastrophically:", err);
});