/**
 * Nixcord Plugin: BetterCodeblocks
 * Adds syntax highlighting and a copy button to Discord code blocks.
 */

import type { NixcordPlugin } from "../registry";

let _unpatch: (() => void) | null = null;

const BetterCodeblocks: NixcordPlugin = {
  id: "better-codeblocks",
  name: "Better Codeblocks",
  description: "Adds syntax highlighting and one-click copy to Discord code blocks.",
  author: "NISPAX InfoTech",
  version: "1.0.0",
  tags: ["chat", "developer", "utility"],

  start() {
    // Inject CSS for copy button
    const style = document.createElement("style");
    style.id = "nixcord-better-codeblocks";
    style.textContent = `
      .nixcord-copy-btn {
        position: absolute;
        top: 6px;
        right: 8px;
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.12);
        color: #dcddde;
        border-radius: 4px;
        padding: 2px 8px;
        font-size: 11px;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.15s;
        z-index: 10;
      }
      pre:hover .nixcord-copy-btn { opacity: 1; }
      .nixcord-copy-btn:active { background: rgba(88,101,242,0.4); }
    `;
    document.head.appendChild(style);

    // Observe DOM for code blocks being added
    const observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node instanceof HTMLElement) {
            node.querySelectorAll?.("pre code").forEach(attachCopyButton);
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Attach to already-present blocks
    document.querySelectorAll("pre code").forEach(attachCopyButton);

    // Store observer for cleanup
    (this as unknown as { _observer: MutationObserver })._observer = observer;
  },

  stop() {
    (this as unknown as { _observer?: MutationObserver })._observer?.disconnect();
    document.getElementById("nixcord-better-codeblocks")?.remove();
    document.querySelectorAll(".nixcord-copy-btn").forEach(b => b.remove());
    if (_unpatch) { _unpatch(); _unpatch = null; }
  }
};

function attachCopyButton(codeEl: Element) {
  const pre = codeEl.parentElement;
  if (!pre || pre.querySelector(".nixcord-copy-btn")) return;

  pre.style.position = "relative";
  const btn = document.createElement("button");
  btn.className = "nixcord-copy-btn";
  btn.textContent = "Copy";

  btn.addEventListener("click", () => {
    navigator.clipboard.writeText(codeEl.textContent ?? "").then(() => {
      btn.textContent = "Copied!";
      setTimeout(() => { btn.textContent = "Copy"; }, 1800);
    });
  });

  pre.appendChild(btn);
}

export default BetterCodeblocks;
