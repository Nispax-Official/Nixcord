# Nixcord
**A performance-first Discord mod client by [NISPAX InfoTech](https://nispax.in)**

Nixcord patches Discord with a plugin system, theme engine, settings panel, and auto-updater — without the startup lag and memory overhead common in other mod clients.

---

## Features

- **Plugin System** — Enable/disable plugins individually. Nothing runs unless it's on.
- **Theme Engine** — Load local or remote CSS themes. Supports custom CSS injection.
- **Settings Panel** — Native-feeling settings UI injected into Discord's sidebar.
- **Auto-Updater** — Fetches the latest build from the `main` branch on GitHub automatically.
- **Zero startup scan** — Modules are patched lazily, not scanned at boot.

---

## Platform Support

| Platform | Target |
|---|---|
| Desktop (Windows) | Discord Stable |
| Browser | Discord Web (Chrome, Firefox) |

---

## Installation

### Desktop (Windows)

1. Download the latest `nixcord-installer.exe` from [Releases](../../releases)
2. Run it and follow the prompts:

```
nixcord-installer install
```

Or use the CLI directly:

```
nixcord-installer.exe install    # Install
nixcord-installer.exe uninstall  # Remove
nixcord-installer.exe status     # Check status
nixcord-installer.exe update     # Update bundle
```

3. **Restart Discord** after installing.

> If Discord shows a "corrupted installation" prompt, click **Cancel** — not Repair.

---

### Browser Extension

#### Chrome / Chromium

1. Download `nixcord-chrome.zip` from [Releases](../../releases)
2. Unzip it
3. Go to `chrome://extensions`
4. Enable **Developer mode** (top right)
5. Click **Load unpacked** → select the unzipped folder
6. Reload Discord tab

#### Firefox

1. Download `nixcord-firefox.zip` from [Releases](../../releases)
2. Go to `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on** → select the zip
4. Reload Discord tab

> For permanent Firefox install, the extension needs to be signed via AMO.

---

## Development

### Prerequisites

- Node.js 20+
- npm 10+
- Git

### Setup

```bash
git clone https://github.com/NISPAX-InfoTech/nixcord.git
cd nixcord
npm install
```

### Build everything

```bash
npm run build
```

### Build individual packages

```bash
npm run build:core       # Core bundle (nixcord.js)
npm run build:extension  # Chrome + Firefox extensions
npm run build:desktop    # Desktop injector
npm run build:installer  # CLI installer
```

### Watch mode (core)

```bash
npm run dev:extension
```

---

## Writing a Plugin

Create a file in `plugins/` and implement the `NixcordPlugin` interface:

```typescript
import type { NixcordPlugin } from "@nixcord/core";
import { patch } from "@nixcord/core";

const MyPlugin: NixcordPlugin = {
  id: "my-plugin",
  name: "My Plugin",
  description: "Does something cool.",
  author: "Your Name",
  version: "1.0.0",
  tags: ["utility"],

  start() {
    // Called when the plugin is enabled
    // Add DOM mutations, patches, event listeners here
  },

  stop() {
    // Called when disabled
    // MUST clean up everything start() did
    // patches registered with the id "my-plugin" are auto-removed
  }
};

export default MyPlugin;
```

Then register it in `core/src/index.ts`:

```typescript
import { registerPlugin } from "./plugins/registry";
import MyPlugin from "../../plugins/my-plugin";

registerPlugin(MyPlugin);
```

---

## Writing a Theme

Themes are registered with a CSS source (inline or remote URL):

```typescript
import { registerTheme } from "@nixcord/core";

registerTheme({
  id: "my-theme",
  name: "My Theme",
  description: "A dark red theme.",
  author: "Your Name",
  version: "1.0.0",
  source: "https://raw.githubusercontent.com/you/themes/main/my-theme.css",
  isRemote: true
});
```

---

## Auto-Update Flow

1. On Discord load, Nixcord waits 8 seconds (so Discord loads first)
2. Hits `api.github.com` to get the latest commit SHA on `main`
3. Compares it to the embedded `__NIXCORD_BUILD_SHA__` constant
4. If different: downloads `dist/nixcord.js` from raw GitHub
5. **Desktop**: writes to the injected `app/nixcord.js`, reloads Discord
6. **Extension**: stores in localStorage, reloads the Discord tab

The CI pipeline commits `dist/nixcord.js` to `main` on every push, so the raw URL always points to the latest build.

---

## Project Structure

```
nixcord/
├── core/                  # Shared engine (plugins, themes, patcher, updater)
│   └── src/
│       ├── index.ts       # Bootstrap entry point
│       ├── patcher/       # Webpack module patcher & finder
│       ├── plugins/       # Plugin registry & lifecycle
│       ├── themes/        # Theme engine & CSS injection
│       ├── settings/      # Settings store & UI panel
│       └── utils/         # Updater
├── desktop/               # Windows injector (patches Discord Stable)
│   └── src/injector.ts
├── extension/             # Chrome (MV3) + Firefox (MV2) extension
│   └── src/
│       ├── content/       # Content script (injects nixcord.js)
│       ├── background/    # Service worker (update badge)
│       └── popup/         # Extension popup UI
├── installer/             # CLI installer for Windows
│   └── src/index.ts
├── plugins/
│   └── built-in/          # Bundled plugins
└── .github/workflows/     # CI/CD pipeline
```

---

## License

MIT © [NISPAX InfoTech](https://nispax.in)
