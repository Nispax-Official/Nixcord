/**
 * Nixcord Theme Engine
 * Injects themes as <style> tags with unique IDs.
 * Supports remote theme URLs and local CSS strings.
 * Custom CSS is always applied last (highest specificity).
 */

import { Settings } from "../settings/store";

export interface NixcordTheme {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  /** Remote URL to fetch CSS from, or inline CSS */
  source: string;
  isRemote: boolean;
  thumbnail?: string;
}

const STYLE_PREFIX = "nixcord-theme-";
const CUSTOM_CSS_ID = "nixcord-custom-css";
const injectedStyles = new Map<string, HTMLStyleElement>();

function getOrCreateStyle(id: string): HTMLStyleElement {
  if (injectedStyles.has(id)) return injectedStyles.get(id)!;
  const el = document.createElement("style");
  el.id = id;
  el.setAttribute("data-nixcord", "true");
  document.head.appendChild(el);
  injectedStyles.set(id, el);
  return el;
}

function removeStyle(id: string) {
  const el = injectedStyles.get(id);
  if (el) {
    el.remove();
    injectedStyles.delete(id);
  }
}

async function resolveCSS(theme: NixcordTheme): Promise<string> {
  if (!theme.isRemote) return theme.source;

  try {
    const res = await fetch(theme.source, { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    console.error(`[Nixcord] Failed to fetch theme "${theme.id}":`, err);
    return "";
  }
}

const themeRegistry = new Map<string, NixcordTheme>();

export function registerTheme(theme: NixcordTheme) {
  themeRegistry.set(theme.id, theme);
}

export function getAllThemes(): NixcordTheme[] {
  return Array.from(themeRegistry.values());
}

export async function enableTheme(id: string): Promise<boolean> {
  const theme = themeRegistry.get(id);
  if (!theme) {
    console.error(`[Nixcord] Theme not found: ${id}`);
    return false;
  }

  const css = await resolveCSS(theme);
  if (!css) return false;

  const el = getOrCreateStyle(`${STYLE_PREFIX}${id}`);
  el.textContent = css;

  const enabled = Settings.get("themes").enabled;
  if (!enabled.includes(id)) {
    Settings.set("themes", { ...Settings.get("themes"), enabled: [...enabled, id] });
  }

  console.log(`[Nixcord] Theme enabled: ${id}`);
  return true;
}

export function disableTheme(id: string) {
  removeStyle(`${STYLE_PREFIX}${id}`);
  const current = Settings.get("themes");
  Settings.set("themes", {
    ...current,
    enabled: current.enabled.filter(t => t !== id)
  });
  console.log(`[Nixcord] Theme disabled: ${id}`);
}

export function isThemeEnabled(id: string): boolean {
  return Settings.get("themes").enabled.includes(id);
}

export async function toggleTheme(id: string): Promise<boolean> {
  if (isThemeEnabled(id)) {
    disableTheme(id);
    return false;
  } else {
    return await enableTheme(id);
  }
}

export function applyCustomCSS(css: string) {
  const el = getOrCreateStyle(CUSTOM_CSS_ID);
  el.textContent = css;
  Settings.set("themes", { ...Settings.get("themes"), customCSS: css });
}

export function getCustomCSS(): string {
  return Settings.get("themes").customCSS;
}

export function clearCustomCSS() {
  applyCustomCSS("");
}

/** Reload all currently enabled themes (re-fetch remotes) */
export async function reloadAllThemes() {
  const enabled = [...Settings.get("themes").enabled];
  for (const id of enabled) {
    removeStyle(`${STYLE_PREFIX}${id}`);
    await enableTheme(id);
  }
}

/** Called on startup — restores previously enabled themes */
export async function restoreThemes() {
  const { enabled, customCSS } = Settings.get("themes");

  for (const id of enabled) {
    await enableTheme(id);
  }

  if (customCSS) applyCustomCSS(customCSS);
}
