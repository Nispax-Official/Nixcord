/**
 * Nixcord Updater
 * Fetches the latest Nixcord build from a raw GitHub branch.
 * Compares commit SHAs to avoid unnecessary reloads.
 * Works in both desktop (via electron IPC) and web (fetch API).
 */

import { Settings } from "../settings/store";

const REPO_OWNER = "NISPAX-InfoTech";
const REPO_NAME = "nixcord";
const API_BASE = "https://api.github.com";
const RAW_BASE = "https://raw.githubusercontent.com";

export interface UpdateInfo {
  hasUpdate: boolean;
  latestSha: string;
  currentSha: string;
  message: string;
  timestamp: string;
}

export interface UpdateResult {
  success: boolean;
  error?: string;
}

// Injected at build time by the CI pipeline
declare const __NIXCORD_BUILD_SHA__: string;
const CURRENT_SHA: string = typeof __NIXCORD_BUILD_SHA__ !== "undefined"
  ? __NIXCORD_BUILD_SHA__
  : "dev";

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "Accept": "application/vnd.github.v3+json" },
    cache: "no-cache"
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export async function checkForUpdate(): Promise<UpdateInfo> {
  const branch = Settings.get("general").updateBranch || "main";

  interface GitHubCommit {
    sha: string;
    commit: { message: string; author: { date: string } };
  }

  const commits = await fetchJSON<GitHubCommit[]>(
    `${API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/commits?sha=${branch}&per_page=1`
  );

  if (!commits.length) throw new Error("No commits found on branch");

  const latest = commits[0];
  const latestSha = latest.sha;

  Settings.set("general", {
    ...Settings.get("general"),
    lastUpdateCheck: Date.now()
  });

  return {
    hasUpdate: CURRENT_SHA !== "dev" && latestSha !== CURRENT_SHA,
    latestSha,
    currentSha: CURRENT_SHA,
    message: latest.commit.message,
    timestamp: latest.commit.author.date
  };
}

export async function downloadBuild(sha: string): Promise<string> {
  const branch = Settings.get("general").updateBranch || "main";
  const url = `${RAW_BASE}/${REPO_OWNER}/${REPO_NAME}/${branch}/dist/nixcord.js`;

  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Failed to download build: ${res.status}`);
  return res.text();
}

/** Web platform: injects updated script and reloads */
export async function applyWebUpdate(newScript: string): Promise<UpdateResult> {
  try {
    localStorage.setItem("nixcord_pending_update", newScript);
    window.location.reload();
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/** Desktop platform: delegates to electron main via IPC */
export async function applyDesktopUpdate(newScript: string): Promise<UpdateResult> {
  try {
    // @ts-expect-error - nixcordBridge injected by preload script
    if (typeof window.nixcordBridge?.applyUpdate === "function") {
      // @ts-expect-error
      await window.nixcordBridge.applyUpdate(newScript);
      return { success: true };
    }
    throw new Error("Desktop bridge not available");
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function performUpdate(): Promise<UpdateResult> {
  try {
    const info = await checkForUpdate();
    if (!info.hasUpdate) return { success: true };

    const script = await downloadBuild(info.latestSha);
    const isDesktop = typeof window !== "undefined"
      // @ts-expect-error
      && typeof window.nixcordBridge !== "undefined";

    return isDesktop
      ? applyDesktopUpdate(script)
      : applyWebUpdate(script);
  } catch (err) {
    console.error("[Nixcord] Update failed:", err);
    return { success: false, error: String(err) };
  }
}

export function getLastUpdateCheck(): Date | null {
  const ts = Settings.get("general").lastUpdateCheck;
  return ts ? new Date(ts) : null;
}

export function getCurrentSha(): string {
  return CURRENT_SHA;
}
