// Nixcord Extension Popup Script

async function getState() {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ type: "GET_STATE" }, resolve);
  });
}

async function checkUpdate() {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ type: "CHECK_UPDATE" }, resolve);
  });
}

async function openSettings() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      // Trigger Nixcord settings panel from within the page
      window.dispatchEvent(new CustomEvent("nixcord:open-settings"));
    }
  });
  window.close();
}

function formatTime(ts) {
  if (!ts) return "Never";
  const diff = Date.now() - ts;
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

async function render() {
  const state = await getState() ?? {};
  const dot = document.getElementById("status-dot");
  const statusText = document.getElementById("status-text");
  const btnUpdate = document.getElementById("btn-update");
  const footerSha = document.getElementById("footer-sha");
  const footerCheck = document.getElementById("footer-check");

  if (state.updateAvailable) {
    dot.className = "dot yellow";
    statusText.textContent = "Update available";
    btnUpdate.style.display = "block";
  } else {
    dot.className = "dot green";
    statusText.textContent = "Nixcord is active";
    btnUpdate.style.display = "none";
  }

  footerSha.textContent = state.lastSha ? `build: ${state.lastSha.slice(0, 7)}` : "build: dev";
  footerCheck.textContent = `Checked: ${formatTime(state.lastCheck)}`;
}

document.getElementById("btn-settings").addEventListener("click", openSettings);

document.getElementById("btn-check").addEventListener("click", async () => {
  const btn = document.getElementById("btn-check");
  btn.disabled = true;
  btn.textContent = "Checking...";
  await checkUpdate();
  await render();
  btn.disabled = false;
  btn.textContent = "Check for Updates";
});

document.getElementById("btn-update").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab?.url?.includes("discord.com")) {
      chrome.tabs.reload(tab.id);
    }
  });
  window.close();
});

render();
