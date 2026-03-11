/**
 * Nixcord CLI Installer
 * Windows-only command-line tool to install/uninstall Nixcord on Discord Stable.
 * Run: node installer install | uninstall | status | update
 */

import { findDiscordInstalls, inject, uninject, isInjected, updateBundle } from "../desktop/src/injector";
import * as readline from "readline";
import * as path from "path";
import * as os from "os";

const VERSION = "1.0.0";

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
  dim: "\x1b[2m"
};

function c(color: keyof typeof colors, text: string): string {
  return `${colors[color]}${text}${colors.reset}`;
}

function banner() {
  console.log("");
  console.log(c("cyan", c("bold", "  ███╗   ██╗██╗██╗  ██╗ ██████╗ ██████╗ ██████╗ ██████╗")));
  console.log(c("cyan", c("bold", "  ████╗  ██║██║╚██╗██╔╝██╔════╝██╔═══██╗██╔══██╗██╔══██╗")));
  console.log(c("cyan", c("bold", "  ██╔██╗ ██║██║ ╚███╔╝ ██║     ██║   ██║██████╔╝██║  ██║")));
  console.log(c("cyan", c("bold", "  ██║╚██╗██║██║ ██╔██╗ ██║     ██║   ██║██╔══██╗██║  ██║")));
  console.log(c("cyan", c("bold", "  ██║ ╚████║██║██╔╝ ██╗╚██████╗╚██████╔╝██║  ██║██████╔╝")));
  console.log(c("cyan", c("bold", "  ╚═╝  ╚═══╝╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝")));
  console.log("");
  console.log(c("dim", `  v${VERSION}  ·  by NISPAX InfoTech`));
  console.log("");
}

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function cmdInstall() {
  console.log(c("cyan", "Scanning for Discord installations...\n"));

  const installs = findDiscordInstalls();

  if (!installs.length) {
    console.log(c("red", "✗ No Discord installations found."));
    console.log(c("dim", "  Make sure Discord Stable is installed and has been launched at least once."));
    return;
  }

  console.log(`Found ${installs.length} installation(s):\n`);
  installs.forEach((inst, i) => {
    const status = isInjected(inst)
      ? c("green", "[already injected]")
      : c("dim", "[not injected]");
    console.log(`  ${i + 1}. ${inst.name}  ${status}`);
    console.log(c("dim", `     ${inst.resourcesPath}`));
  });

  console.log("");

  const notInjected = installs.filter(i => !isInjected(i));
  if (!notInjected.length) {
    console.log(c("yellow", "Nixcord is already injected into all found installations."));
    return;
  }

  const answer = await prompt(`Install Nixcord into all ${notInjected.length} installation(s)? [Y/n]: `);
  if (answer.toLowerCase() === "n") {
    console.log(c("dim", "Aborted."));
    return;
  }

  console.log("");
  for (const inst of notInjected) {
    process.stdout.write(`  Installing into ${inst.name}... `);
    const result = inject(inst);
    if (result.success) {
      console.log(c("green", "✓ Done"));
    } else {
      console.log(c("red", `✗ Failed: ${result.error}`));
    }
  }

  console.log("");
  console.log(c("green", "✓ Nixcord installed. Restart Discord to apply."));
  console.log(c("dim", "  If Discord asks to repair, click Cancel."));
}

async function cmdUninstall() {
  const installs = findDiscordInstalls();
  const injected = installs.filter(i => isInjected(i));

  if (!injected.length) {
    console.log(c("yellow", "Nixcord is not installed on any Discord installation."));
    return;
  }

  injected.forEach((inst, i) => {
    console.log(`  ${i + 1}. ${inst.name}`);
  });

  console.log("");
  const answer = await prompt(`Uninstall Nixcord from all ${injected.length} installation(s)? [Y/n]: `);
  if (answer.toLowerCase() === "n") {
    console.log(c("dim", "Aborted."));
    return;
  }

  for (const inst of injected) {
    process.stdout.write(`  Removing from ${inst.name}... `);
    const result = uninject(inst);
    console.log(result.success ? c("green", "✓ Done") : c("red", `✗ Failed: ${result.error}`));
  }

  console.log("");
  console.log(c("green", "✓ Nixcord removed. Restart Discord."));
}

function cmdStatus() {
  const installs = findDiscordInstalls();

  if (!installs.length) {
    console.log(c("yellow", "No Discord installations found."));
    return;
  }

  console.log("Discord installations:\n");
  for (const inst of installs) {
    const status = isInjected(inst)
      ? c("green", "✓ Nixcord installed")
      : c("dim", "○ Not installed");
    console.log(`  ${inst.name}`);
    console.log(`    ${status}`);
    console.log(c("dim", `    ${inst.resourcesPath}`));
    console.log("");
  }
}

async function cmdUpdate() {
  const installs = findDiscordInstalls().filter(i => isInjected(i));

  if (!installs.length) {
    console.log(c("yellow", "Nixcord is not installed. Run: nixcord-installer install"));
    return;
  }

  console.log(c("cyan", "Checking for updates..."));

  try {
    const { checkForUpdate, downloadBuild } = await import("../core/src/utils/updater");
    const info = await checkForUpdate();

    if (!info.hasUpdate) {
      console.log(c("green", `✓ Already up to date (${info.currentSha.slice(0, 7)})`));
      return;
    }

    console.log(c("yellow", `Update available: ${info.latestSha.slice(0, 7)}`));
    console.log(c("dim", `  ${info.message}`));
    console.log("");

    const answer = await prompt("Download and install update? [Y/n]: ");
    if (answer.toLowerCase() === "n") return;

    process.stdout.write("Downloading... ");
    const script = await downloadBuild(info.latestSha);

    const tmp = path.join(os.tmpdir(), "nixcord-update.js");
    require("fs").writeFileSync(tmp, script);
    console.log(c("green", "✓"));

    for (const inst of installs) {
      process.stdout.write(`Updating ${inst.name}... `);
      const result = updateBundle(inst, tmp);
      console.log(result.success ? c("green", "✓ Done") : c("red", `✗ ${result.error}`));
    }

    require("fs").unlinkSync(tmp);
    console.log("");
    console.log(c("green", "✓ Update complete. Restart Discord."));
  } catch (err) {
    console.log(c("red", `✗ Update failed: ${err}`));
  }
}

function cmdHelp() {
  console.log("Usage: nixcord-installer <command>\n");
  console.log("Commands:");
  console.log(`  ${c("cyan", "install")}    Install Nixcord into Discord`);
  console.log(`  ${c("cyan", "uninstall")}  Remove Nixcord from Discord`);
  console.log(`  ${c("cyan", "status")}     Show installation status`);
  console.log(`  ${c("cyan", "update")}     Check and apply updates`);
  console.log(`  ${c("cyan", "help")}       Show this help`);
}

async function main() {
  banner();

  const cmd = process.argv[2] ?? "help";

  switch (cmd) {
    case "install": await cmdInstall(); break;
    case "uninstall": await cmdUninstall(); break;
    case "status": cmdStatus(); break;
    case "update": await cmdUpdate(); break;
    default: cmdHelp();
  }
}

main().catch(err => {
  console.error(c("red", `\nFatal: ${err}`));
  process.exit(1);
});
