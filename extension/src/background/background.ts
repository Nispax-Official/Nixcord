/**
 * Nixcord Extension Background Script
 * Handles extension-level tasks: update checks, badge status, tab messaging.
 */

const REPO_OWNER = "NISPAX-InfoTech";
const REPO_NAME = "nixcord";

interface StoredState {
  lastSha: string;
  lastCheck: number;
  updateAvailable: boolean;
}

async function getState(): Promise<StoredState> {
  return new Promise(resolve => {
    chrome.storage.local.get(["lastSha", "lastCheck", "updateAvailable"], items => {
      resolve({
        lastSha: (items.lastSha as string) ?? "",
        lastCheck: (items.lastCheck as number) ?? 0,
        updateAvailable: (items.updateAvailable as boolean) ?? false
      });
    });
  });
}

async function saveState(state: Partial<StoredState>) {
  return new Promise<void>(resolve => chrome.storage.local.set(state, resolve));
}

async function checkForUpdate() {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits?sha=main&per_page=1`,
      { headers: { Accept: "application/vnd.github.v3+json" } }
    );
    if (!res.ok) return;

    const commits = await res.json() as Array<{ sha: string; commit: { message: string } }>;
    if (!commits.length) return;

    const latestSha = commits[0].sha;
    const state = await getState();
    const hasUpdate = state.lastSha !== "" && state.lastSha !== latestSha;

    await saveState({ lastCheck: Date.now(), updateAvailable: hasUpdate });

    if (hasUpdate) {
      chrome.action.setBadgeText({ text: "!" });
      chrome.action.setBadgeBackgroundColor({ color: "#faa61a" });
    } else {
      chrome.action.setBadgeText({ text: "" });
    }

    if (!state.lastSha) {
      await saveState({ lastSha: latestSha });
    }
  } catch (err) {
    console.warn("[Nixcord] Background update check failed:", err);
  }
}

// Register alarm on install/update — must be done in onInstalled for MV3
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("nixcord-update-check", { periodInMinutes: 360 });
  checkForUpdate();
});

// Also run check when service worker wakes up
chrome.runtime.onStartup.addListener(() => {
  checkForUpdate();
});

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === "nixcord-update-check") checkForUpdate();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "GET_STATE") {
    getState().then(sendResponse);
    return true;
  }
  if (msg.type === "CHECK_UPDATE") {
    checkForUpdate().then(() => getState()).then(sendResponse);
    return true;
  }
});