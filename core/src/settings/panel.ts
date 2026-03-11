/**
 * Nixcord Settings Panel
 * Injects a Nixcord section into Discord's native settings sidebar.
 * Renders plugin list, theme manager, updater status, and custom CSS editor.
 */

import { getAllPlugins, togglePlugin, isPluginEnabled, getPluginError } from "../core/src/plugins/registry";
import { getAllThemes, toggleTheme, isThemeEnabled, applyCustomCSS, getCustomCSS } from "../core/src/themes/engine";
import { checkForUpdate, performUpdate, getLastUpdateCheck, getCurrentSha } from "../core/src/utils/updater";
import { Settings } from "../core/src/settings/store";

type Tab = "plugins" | "themes" | "updater" | "customcss";

const STYLE_ID = "nixcord-settings-styles";

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .nixcord-settings-root {
      padding: 24px;
      color: #dcddde;
      font-family: 'gg sans', 'Noto Sans', sans-serif;
      max-width: 740px;
    }
    .nixcord-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
    }
    .nixcord-logo {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #5865F2, #7289da);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: bold;
    }
    .nixcord-title { font-size: 20px; font-weight: 700; color: #fff; }
    .nixcord-subtitle { font-size: 12px; color: #72767d; margin-top: 2px; }
    .nixcord-tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 20px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      padding-bottom: 8px;
    }
    .nixcord-tab {
      padding: 6px 14px;
      border-radius: 6px 6px 0 0;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      color: #b9bbbe;
      background: transparent;
      border: none;
      transition: all 0.15s;
    }
    .nixcord-tab:hover { color: #dcddde; background: rgba(255,255,255,0.04); }
    .nixcord-tab.active { color: #fff; background: rgba(88,101,242,0.2); border-bottom: 2px solid #5865F2; }
    .nixcord-search {
      width: 100%;
      padding: 8px 12px;
      background: rgba(0,0,0,0.2);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 6px;
      color: #dcddde;
      font-size: 14px;
      margin-bottom: 16px;
      outline: none;
      box-sizing: border-box;
    }
    .nixcord-search:focus { border-color: #5865F2; }
    .nixcord-plugin-card {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 14px 16px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 8px;
      margin-bottom: 8px;
      transition: background 0.1s;
    }
    .nixcord-plugin-card:hover { background: rgba(255,255,255,0.05); }
    .nixcord-plugin-name { font-size: 14px; font-weight: 600; color: #fff; }
    .nixcord-plugin-desc { font-size: 12px; color: #72767d; margin-top: 3px; line-height: 1.4; }
    .nixcord-plugin-meta { font-size: 11px; color: #4f545c; margin-top: 4px; }
    .nixcord-plugin-error { font-size: 11px; color: #ed4245; margin-top: 4px; }
    .nixcord-plugin-tags { display: flex; gap: 4px; margin-top: 6px; flex-wrap: wrap; }
    .nixcord-tag {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 10px;
      background: rgba(88,101,242,0.15);
      color: #7289da;
      font-weight: 500;
    }
    .nixcord-toggle {
      position: relative;
      width: 40px;
      height: 22px;
      flex-shrink: 0;
      margin-left: 12px;
      cursor: pointer;
    }
    .nixcord-toggle input { display: none; }
    .nixcord-toggle-track {
      width: 100%;
      height: 100%;
      background: #4f545c;
      border-radius: 11px;
      transition: background 0.2s;
    }
    .nixcord-toggle.on .nixcord-toggle-track { background: #5865F2; }
    .nixcord-toggle-thumb {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 16px;
      height: 16px;
      background: #fff;
      border-radius: 50%;
      transition: left 0.2s;
    }
    .nixcord-toggle.on .nixcord-toggle-thumb { left: 21px; }
    .nixcord-update-card {
      padding: 16px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 8px;
      margin-bottom: 12px;
    }
    .nixcord-update-card h3 { margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #fff; }
    .nixcord-update-meta { font-size: 12px; color: #72767d; line-height: 1.6; }
    .nixcord-btn {
      padding: 8px 16px;
      background: #5865F2;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 10px;
      transition: background 0.15s;
    }
    .nixcord-btn:hover { background: #4752c4; }
    .nixcord-btn:disabled { background: #4f545c; cursor: not-allowed; }
    .nixcord-btn.danger { background: #ed4245; }
    .nixcord-btn.danger:hover { background: #c03537; }
    .nixcord-css-editor {
      width: 100%;
      min-height: 300px;
      background: #1e1f22;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 8px;
      color: #dcddde;
      font-family: 'Fira Code', 'Consolas', monospace;
      font-size: 13px;
      padding: 12px;
      resize: vertical;
      outline: none;
      box-sizing: border-box;
    }
    .nixcord-css-editor:focus { border-color: #5865F2; }
    .nixcord-status-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 6px;
    }
    .nixcord-status-dot.green { background: #3ba55c; }
    .nixcord-status-dot.yellow { background: #faa61a; }
    .nixcord-status-dot.red { background: #ed4245; }
    .nixcord-empty { text-align: center; color: #4f545c; padding: 40px; font-size: 14px; }
  `;
  document.head.appendChild(style);
}

function createToggle(enabled: boolean, onChange: (v: boolean) => void): HTMLElement {
  const wrapper = document.createElement("label");
  wrapper.className = `nixcord-toggle ${enabled ? "on" : ""}`;

  const track = document.createElement("div");
  track.className = "nixcord-toggle-track";

  const thumb = document.createElement("div");
  thumb.className = "nixcord-toggle-thumb";

  wrapper.appendChild(track);
  wrapper.appendChild(thumb);

  wrapper.addEventListener("click", () => {
    const next = !wrapper.classList.contains("on");
    wrapper.classList.toggle("on", next);
    onChange(next);
  });

  return wrapper;
}

function renderPluginsTab(container: HTMLElement) {
  container.innerHTML = "";

  const search = document.createElement("input");
  search.className = "nixcord-search";
  search.placeholder = "Search plugins...";
  container.appendChild(search);

  const list = document.createElement("div");
  container.appendChild(list);

  function render(query = "") {
    list.innerHTML = "";
    const plugins = getAllPlugins().filter(({ plugin }) =>
      !query || plugin.name.toLowerCase().includes(query) || plugin.description.toLowerCase().includes(query)
    );

    if (!plugins.length) {
      list.innerHTML = `<div class="nixcord-empty">No plugins found.</div>`;
      return;
    }

    for (const { plugin, error } of plugins) {
      const card = document.createElement("div");
      card.className = "nixcord-plugin-card";

      const info = document.createElement("div");
      info.style.flex = "1";

      const name = document.createElement("div");
      name.className = "nixcord-plugin-name";
      name.textContent = plugin.name;

      const desc = document.createElement("div");
      desc.className = "nixcord-plugin-desc";
      desc.textContent = plugin.description;

      const meta = document.createElement("div");
      meta.className = "nixcord-plugin-meta";
      meta.textContent = `v${plugin.version} by ${plugin.author}`;

      info.appendChild(name);
      info.appendChild(desc);
      info.appendChild(meta);

      if (error) {
        const errEl = document.createElement("div");
        errEl.className = "nixcord-plugin-error";
        errEl.textContent = `⚠ ${error}`;
        info.appendChild(errEl);
      }

      if (plugin.tags?.length) {
        const tags = document.createElement("div");
        tags.className = "nixcord-plugin-tags";
        for (const t of plugin.tags) {
          const tag = document.createElement("span");
          tag.className = "nixcord-tag";
          tag.textContent = t;
          tags.appendChild(tag);
        }
        info.appendChild(tags);
      }

      const toggle = createToggle(isPluginEnabled(plugin.id), async () => {
        await togglePlugin(plugin.id);
        render(search.value.trim().toLowerCase());
      });

      card.appendChild(info);
      card.appendChild(toggle);
      list.appendChild(card);
    }
  }

  render();
  search.addEventListener("input", () => render(search.value.trim().toLowerCase()));
}

function renderThemesTab(container: HTMLElement) {
  container.innerHTML = "";

  const themes = getAllThemes();
  if (!themes.length) {
    container.innerHTML = `<div class="nixcord-empty">No themes installed.</div>`;
    return;
  }

  for (const theme of themes) {
    const card = document.createElement("div");
    card.className = "nixcord-plugin-card";

    const info = document.createElement("div");
    info.style.flex = "1";

    const name = document.createElement("div");
    name.className = "nixcord-plugin-name";
    name.textContent = theme.name;

    const desc = document.createElement("div");
    desc.className = "nixcord-plugin-desc";
    desc.textContent = theme.description;

    const meta = document.createElement("div");
    meta.className = "nixcord-plugin-meta";
    meta.textContent = `v${theme.version} by ${theme.author}${theme.isRemote ? " · Remote" : " · Local"}`;

    info.appendChild(name);
    info.appendChild(desc);
    info.appendChild(meta);

    const toggle = createToggle(isThemeEnabled(theme.id), async () => {
      await toggleTheme(theme.id);
    });

    card.appendChild(info);
    card.appendChild(toggle);
    container.appendChild(card);
  }
}

async function renderUpdaterTab(container: HTMLElement) {
  container.innerHTML = `<div class="nixcord-update-card"><h3>Checking for updates...</h3></div>`;

  const sha = getCurrentSha();
  const lastCheck = getLastUpdateCheck();

  try {
    const info = await checkForUpdate();

    container.innerHTML = "";

    const card = document.createElement("div");
    card.className = "nixcord-update-card";

    card.innerHTML = `
      <h3>
        <span class="nixcord-status-dot ${info.hasUpdate ? "yellow" : "green"}"></span>
        ${info.hasUpdate ? "Update Available" : "Up to Date"}
      </h3>
      <div class="nixcord-update-meta">
        <strong>Current:</strong> ${sha === "dev" ? "dev build" : sha.slice(0, 7)}<br>
        <strong>Latest:</strong> ${info.latestSha.slice(0, 7)}<br>
        <strong>Commit:</strong> ${info.message}<br>
        <strong>Date:</strong> ${new Date(info.timestamp).toLocaleString()}<br>
        <strong>Last checked:</strong> ${lastCheck ? lastCheck.toLocaleString() : "Just now"}
      </div>
    `;

    if (info.hasUpdate) {
      const btn = document.createElement("button");
      btn.className = "nixcord-btn";
      btn.textContent = "Install Update";
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        btn.textContent = "Updating...";
        const result = await performUpdate();
        if (result.success) {
          btn.textContent = "Reloading...";
        } else {
          btn.textContent = `Failed: ${result.error}`;
          btn.disabled = false;
        }
      });
      card.appendChild(btn);
    }

    const checkBtn = document.createElement("button");
    checkBtn.className = "nixcord-btn";
    checkBtn.style.marginLeft = info.hasUpdate ? "8px" : "0";
    checkBtn.textContent = "Check Again";
    checkBtn.addEventListener("click", () => renderUpdaterTab(container));
    card.appendChild(checkBtn);

    container.appendChild(card);
  } catch (err) {
    container.innerHTML = `
      <div class="nixcord-update-card">
        <h3><span class="nixcord-status-dot red"></span>Update Check Failed</h3>
        <div class="nixcord-update-meta">${String(err)}</div>
      </div>
    `;
  }
}

function renderCustomCSSTab(container: HTMLElement) {
  container.innerHTML = "";

  const label = document.createElement("div");
  label.style.cssText = "font-size:12px;color:#72767d;margin-bottom:10px;";
  label.textContent = "Write custom CSS to inject into Discord. Changes apply immediately.";

  const editor = document.createElement("textarea");
  editor.className = "nixcord-css-editor";
  editor.value = getCustomCSS();
  editor.placeholder = "/* your custom CSS here */";

  let applyTimer: ReturnType<typeof setTimeout>;
  editor.addEventListener("input", () => {
    clearTimeout(applyTimer);
    applyTimer = setTimeout(() => applyCustomCSS(editor.value), 500);
  });

  const clearBtn = document.createElement("button");
  clearBtn.className = "nixcord-btn danger";
  clearBtn.style.marginTop = "10px";
  clearBtn.textContent = "Clear CSS";
  clearBtn.addEventListener("click", () => {
    editor.value = "";
    applyCustomCSS("");
  });

  container.appendChild(label);
  container.appendChild(editor);
  container.appendChild(clearBtn);
}

export function mountSettingsPanel(target: HTMLElement) {
  injectStyles();
  target.innerHTML = "";

  const root = document.createElement("div");
  root.className = "nixcord-settings-root";

  // Header
  const header = document.createElement("div");
  header.className = "nixcord-header";
  header.innerHTML = `
    <div class="nixcord-logo">N</div>
    <div>
      <div class="nixcord-title">Nixcord</div>
      <div class="nixcord-subtitle">by NISPAX InfoTech</div>
    </div>
  `;

  // Tabs
  const tabs = document.createElement("div");
  tabs.className = "nixcord-tabs";

  const tabContent = document.createElement("div");

  const tabDefs: { id: Tab; label: string }[] = [
    { id: "plugins", label: "Plugins" },
    { id: "themes", label: "Themes" },
    { id: "customcss", label: "Custom CSS" },
    { id: "updater", label: "Updater" }
  ];

  let activeTab: Tab = "plugins";

  function switchTab(id: Tab) {
    activeTab = id;
    tabs.querySelectorAll(".nixcord-tab").forEach(t => t.classList.remove("active"));
    tabs.querySelector(`[data-tab="${id}"]`)?.classList.add("active");

    tabContent.innerHTML = "";
    switch (id) {
      case "plugins": renderPluginsTab(tabContent); break;
      case "themes": renderThemesTab(tabContent); break;
      case "customcss": renderCustomCSSTab(tabContent); break;
      case "updater": renderUpdaterTab(tabContent); break;
    }
  }

  for (const { id, label } of tabDefs) {
    const btn = document.createElement("button");
    btn.className = `nixcord-tab${id === activeTab ? " active" : ""}`;
    btn.textContent = label;
    btn.dataset.tab = id;
    btn.addEventListener("click", () => switchTab(id));
    tabs.appendChild(btn);
  }

  root.appendChild(header);
  root.appendChild(tabs);
  root.appendChild(tabContent);
  target.appendChild(root);

  switchTab("plugins");
}

/** Inject a "Nixcord" entry into Discord's settings sidebar */
export function injectSettingsSidebarEntry() {
  const observer = new MutationObserver(() => {
    const sidebar = document.querySelector('[class*="sidebar-"]');
    if (!sidebar || sidebar.querySelector(".nixcord-settings-entry")) return;

    const separator = document.createElement("div");
    separator.style.cssText = "height:1px;background:rgba(255,255,255,0.06);margin:8px 8px;";

    const entry = document.createElement("div");
    entry.className = "nixcord-settings-entry";
    entry.style.cssText = `
      padding: 6px 10px;
      margin: 2px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      color: #b9bbbe;
      transition: background 0.1s, color 0.1s;
    `;
    entry.textContent = "Nixcord";

    entry.addEventListener("mouseenter", () => {
      entry.style.background = "rgba(255,255,255,0.06)";
      entry.style.color = "#dcddde";
    });
    entry.addEventListener("mouseleave", () => {
      entry.style.background = "transparent";
      entry.style.color = "#b9bbbe";
    });

    entry.addEventListener("click", () => {
      // Find the main settings content area and mount our panel
      const contentArea = document.querySelector('[class*="contentRegion-"], [class*="content-"]');
      if (contentArea) mountSettingsPanel(contentArea as HTMLElement);
    });

    sidebar.appendChild(separator);
    sidebar.appendChild(entry);
  });

  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}
