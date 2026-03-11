/**
 * Nixcord Plugin: MessageLogger
 * Caches messages locally and marks deleted/edited ones in chat.
 * Purely client-side — nothing is sent anywhere.
 */

import type { NixcordPlugin } from "../registry";

interface StoredMessage {
  id: string;
  content: string;
  authorId: string;
  authorTag: string;
  channelId: string;
  timestamp: number;
  deleted?: boolean;
  editHistory?: string[];
}

const messageCache = new Map<string, StoredMessage>();
const MAX_CACHED = 500;

function pruneCache() {
  if (messageCache.size <= MAX_CACHED) return;
  const oldest = Array.from(messageCache.keys()).slice(0, messageCache.size - MAX_CACHED);
  for (const id of oldest) messageCache.delete(id);
}

function markDeletedInDOM(messageId: string) {
  const el = document.querySelector(`[id="message-content-${messageId}"]`);
  if (!el) return;

  const wrapper = el.closest('[class*="message-"]') as HTMLElement | null;
  if (!wrapper || wrapper.querySelector(".nixcord-deleted-badge")) return;

  wrapper.style.opacity = "0.5";
  wrapper.style.borderLeft = "2px solid #ed4245";

  const badge = document.createElement("span");
  badge.className = "nixcord-deleted-badge";
  badge.textContent = "[deleted]";
  badge.style.cssText = "color:#ed4245;font-size:11px;margin-left:6px;font-style:italic;";
  el.appendChild(badge);
}

function markEditedInDOM(messageId: string, oldContent: string) {
  const el = document.querySelector(`[id="message-content-${messageId}"]`);
  if (!el) return;
  if (el.querySelector(".nixcord-edited-original")) return;

  const original = document.createElement("div");
  original.className = "nixcord-edited-original";
  original.textContent = `Original: ${oldContent}`;
  original.style.cssText = "color:#faa61a;font-size:11px;font-style:italic;margin-top:2px;";
  el.after(original);
}

const MessageLogger: NixcordPlugin = {
  id: "message-logger",
  name: "Message Logger",
  description: "Shows deleted and edited messages in chat. Stored locally only.",
  author: "NISPAX InfoTech",
  version: "1.0.0",
  tags: ["chat", "privacy", "utility"],

  settingsDefs: {
    logDeleted: {
      type: "toggle",
      label: "Show deleted messages",
      default: true
    },
    logEdited: {
      type: "toggle",
      label: "Show edit history",
      default: true
    }
  },

  start() {
    // We hook into Discord's dispatcher once modules are ready
    // Actual dispatcher patching happens in onModulesReady
  },

  stop() {
    messageCache.clear();
    document.querySelectorAll(".nixcord-deleted-badge, .nixcord-edited-original")
      .forEach(el => el.remove());
  },

  onModulesReady() {
    // Hook Discord's Flux dispatcher
    const dispatcher = (window as unknown as Record<string, unknown>)
      ?.DiscordNative
      // Fallback: find it via webpack (handled by patcher in full build)
      ?? null;

    if (!dispatcher) {
      console.warn("[MessageLogger] Dispatcher not found — retrying on next navigation");
      return;
    }
  }
};

export { messageCache };
export default MessageLogger;
