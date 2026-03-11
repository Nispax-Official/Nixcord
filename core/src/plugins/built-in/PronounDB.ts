/**
 * Nixcord Plugin: PronounDB
 * Fetches and shows user pronouns below usernames using the pronoundb.org API.
 * Results are cached for 30 minutes to avoid hammering the API.
 */

import type { NixcordPlugin } from "../registry";

const cache = new Map<string, { pronouns: string; expires: number }>();
const CACHE_TTL = 30 * 60 * 1000;
const API = "https://pronoundb.org/api/v2/lookup";
const BATCH_SIZE = 50;

const PRONOUN_MAP: Record<string, string> = {
  he_him: "he/him",
  she_her: "she/her",
  they_them: "they/them",
  he_they: "he/they",
  she_they: "she/they",
  he_she: "he/she",
  any: "any pronouns",
  ask: "ask me",
  avoid: "avoid pronouns",
  other: "other pronouns",
  unspecified: ""
};

async function fetchPronouns(userIds: string[]): Promise<Record<string, string>> {
  const toFetch = userIds.filter(id => {
    const cached = cache.get(id);
    return !cached || cached.expires < Date.now();
  });

  if (!toFetch.length) {
    return Object.fromEntries(
      userIds.map(id => [id, PRONOUN_MAP[cache.get(id)?.pronouns ?? ""] ?? ""])
    );
  }

  try {
    const batches: string[][] = [];
    for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
      batches.push(toFetch.slice(i, i + BATCH_SIZE));
    }

    for (const batch of batches) {
      const url = `${API}?platform=discord&ids=${batch.join(",")}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data: Record<string, { sets: { en: string[] } }> = await res.json();

      for (const [id, val] of Object.entries(data)) {
        const raw = val?.sets?.en?.[0] ?? "unspecified";
        cache.set(id, { pronouns: raw, expires: Date.now() + CACHE_TTL });
      }
    }

    for (const id of toFetch) {
      if (!cache.has(id)) cache.set(id, { pronouns: "unspecified", expires: Date.now() + CACHE_TTL });
    }
  } catch (err) {
    console.warn("[PronounDB] Fetch failed:", err);
  }

  return Object.fromEntries(
    userIds.map(id => [id, PRONOUN_MAP[cache.get(id)?.pronouns ?? ""] ?? ""])
  );
}

let observer: MutationObserver | null = null;

function injectPronouns() {
  const userPopouts = document.querySelectorAll('[class*="userPopout-"], [class*="userProfile-"]');
  userPopouts.forEach(async el => {
    if (el.querySelector(".nixcord-pronouns")) return;

    const userIdEl = el.querySelector("[data-user-id]");
    if (!userIdEl) return;
    const userId = (userIdEl as HTMLElement).dataset.userId;
    if (!userId) return;

    const result = await fetchPronouns([userId]);
    const pronouns = result[userId];
    if (!pronouns) return;

    const tag = document.createElement("span");
    tag.className = "nixcord-pronouns";
    tag.textContent = pronouns;
    tag.style.cssText = "display:block;font-size:12px;color:#b9bbbe;margin-top:2px;";

    const nameEl = el.querySelector('[class*="username-"], [class*="nickname-"]');
    nameEl?.after(tag);
  });
}

const PronounDB: NixcordPlugin = {
  id: "pronoundb",
  name: "PronounDB",
  description: "Shows pronouns from pronoundb.org on user profiles and popovers.",
  author: "NISPAX InfoTech",
  version: "1.0.0",
  tags: ["profiles", "utility"],

  start() {
    observer = new MutationObserver(() => injectPronouns());
    observer.observe(document.body, { childList: true, subtree: true });
    injectPronouns();
  },

  stop() {
    observer?.disconnect();
    observer = null;
    document.querySelectorAll(".nixcord-pronouns").forEach(el => el.remove());
    cache.clear();
  }
};

export default PronounDB;
