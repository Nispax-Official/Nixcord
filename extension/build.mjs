// build.mjs — Extension bundle builder
import * as esbuild from "esbuild";
import * as fs from "fs";
import * as path from "path";

const OUT_CHROME = "dist/chrome";
const OUT_FIREFOX = "dist/firefox";

async function buildExtension() {
  [OUT_CHROME, OUT_FIREFOX].forEach(d => fs.mkdirSync(d, { recursive: true }));

  // Build content script
  await esbuild.build({
    entryPoints: ["src/content/content.ts"],
    outfile: `${OUT_CHROME}/content/content.js`,
    bundle: true,
    minify: true,
    target: ["chrome112"],
    format: "iife",
    platform: "browser",
  });

  // Build background script
  await esbuild.build({
    entryPoints: ["src/background/background.ts"],
    outfile: `${OUT_CHROME}/background/background.js`,
    bundle: true,
    minify: true,
    target: ["chrome112"],
    format: "esm",
    platform: "browser",
  });

  // Firefox content script (same source, different target)
  await esbuild.build({
    entryPoints: ["src/content/content.ts"],
    outfile: `${OUT_FIREFOX}/content/content.js`,
    bundle: true,
    minify: true,
    target: ["firefox115"],
    format: "iife",
    platform: "browser",
  });

  // Firefox background (MV2 uses scripts, not service worker)
  await esbuild.build({
    entryPoints: ["src/background/background.ts"],
    outfile: `${OUT_FIREFOX}/background/background.js`,
    bundle: true,
    minify: true,
    target: ["firefox115"],
    format: "iife",
    platform: "browser",
  });

  // Copy static files
  for (const [src, dest] of [
    ["manifest.chrome.json", `${OUT_CHROME}/manifest.json`],
    ["manifest.firefox.json", `${OUT_FIREFOX}/manifest.json`],
    ["src/popup/popup.html", `${OUT_CHROME}/popup/popup.html`],
    ["src/popup/popup.html", `${OUT_FIREFOX}/popup/popup.html`],
    ["src/popup/popup.js", `${OUT_CHROME}/popup/popup.js`],
    ["src/popup/popup.js", `${OUT_FIREFOX}/popup/popup.js`],
  ]) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (fs.existsSync(src)) fs.copyFileSync(src, dest);
  }

  // Copy icons
  if (fs.existsSync("icons")) {
    for (const target of [OUT_CHROME, OUT_FIREFOX]) {
      fs.mkdirSync(`${target}/icons`, { recursive: true });
      for (const icon of fs.readdirSync("icons")) {
        fs.copyFileSync(`icons/${icon}`, `${target}/icons/${icon}`);
      }
    }
  } else {
    console.warn("[Nixcord] icons/ folder not found — extension will fail to load");
  }

  // Copy nixcord.js bundle from core
  const bundle = "../core/dist/nixcord.js";
  if (fs.existsSync(bundle)) {
    fs.copyFileSync(bundle, `${OUT_CHROME}/nixcord.js`);
    fs.copyFileSync(bundle, `${OUT_FIREFOX}/nixcord.js`);
  } else {
    console.warn("[Nixcord] nixcord.js not found — build core first");
  }

  console.log("[Nixcord] Extension built → dist/chrome & dist/firefox");
}

buildExtension().catch(err => { console.error(err); process.exit(1); });
