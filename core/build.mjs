// build.mjs — Core bundle builder
import * as esbuild from "esbuild";
import { execSync } from "child_process";
import * as fs from "fs";

const watch = process.argv.includes("--watch");

// Get current git SHA for build stamping
let sha = "dev";
try {
  sha = execSync("git rev-parse HEAD").toString().trim();
} catch {}

const shared = {
  bundle: true,
  minify: !watch,
  sourcemap: watch ? "inline" : false,
  target: ["es2020"],
  define: {
    "__NIXCORD_BUILD_SHA__": JSON.stringify(sha)
  }
};

async function build() {
  // Build the main nixcord.js bundle (for both desktop injection and extension)
  await esbuild.build({
    ...shared,
    entryPoints: ["src/index.ts"],
    outfile: "dist/nixcord.js",
    format: "iife",
    globalName: "__nixcord__",
    platform: "browser",
    external: [],
  });

  // Build the settings panel separately (loaded on-demand)
  await esbuild.build({
    ...shared,
    entryPoints: ["src/settings/panel.ts"],
    outfile: "dist/panel.js",
    format: "iife",
    platform: "browser",
  });

  fs.mkdirSync("dist", { recursive: true });
  console.log(`[Nixcord] Core built — SHA: ${sha.slice(0, 7)}`);
}

if (watch) {
  const ctx = await esbuild.context({
    ...shared,
    entryPoints: ["src/index.ts"],
    outfile: "dist/nixcord.js",
    format: "iife",
    platform: "browser",
  });
  await ctx.watch();
  console.log("[Nixcord] Watching for changes...");
} else {
  build().catch(err => { console.error(err); process.exit(1); });
}
