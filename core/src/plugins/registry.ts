/**
 * Nixcord Plugin System
 * Plugins are registered with metadata and lifecycle hooks.
 * Nothing runs until explicitly started — no eager execution at boot.
 */

import { Settings } from "../settings/store";
import { unpatchAll } from "../patcher/index";

export type PluginSettingType = "toggle" | "text" | "number" | "select" | "color";

export interface PluginSettingDef {
  type: PluginSettingType;
  label: string;
  description?: string;
  default: unknown;
  options?: { label: string; value: string }[]; // for select
  min?: number;
  max?: number;
}

export interface NixcordPlugin {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  tags?: string[];
  settingsDefs?: Record<string, PluginSettingDef>;

  /** Called once when the plugin is enabled */
  start(): void | Promise<void>;

  /** Called when the plugin is disabled — must clean up all patches */
  stop(): void | Promise<void>;

  /** Optional: called after Discord finishes loading its modules */
  onModulesReady?(): void | Promise<void>;
}

interface PluginEntry {
  plugin: NixcordPlugin;
  running: boolean;
  error: string | null;
}

const registry = new Map<string, PluginEntry>();

export function registerPlugin(plugin: NixcordPlugin) {
  if (registry.has(plugin.id)) {
    console.warn(`[Nixcord] Plugin "${plugin.id}" is already registered — skipping duplicate.`);
    return;
  }
  registry.set(plugin.id, { plugin, running: false, error: null });
}

export async function startPlugin(id: string): Promise<boolean> {
  const entry = registry.get(id);
  if (!entry) {
    console.error(`[Nixcord] Cannot start unknown plugin: ${id}`);
    return false;
  }
  if (entry.running) return true;

  try {
    await entry.plugin.start();
    entry.running = true;
    entry.error = null;
    console.log(`[Nixcord] Plugin started: ${id}`);
    return true;
  } catch (err) {
    entry.error = String(err);
    console.error(`[Nixcord] Plugin "${id}" failed to start:`, err);
    return false;
  }
}

export async function stopPlugin(id: string): Promise<boolean> {
  const entry = registry.get(id);
  if (!entry || !entry.running) return false;

  try {
    await entry.plugin.stop();
  } catch (err) {
    console.error(`[Nixcord] Plugin "${id}" threw during stop:`, err);
  }

  // Always clean up patches regardless of stop() result
  unpatchAll(id);
  entry.running = false;
  console.log(`[Nixcord] Plugin stopped: ${id}`);
  return true;
}

export async function togglePlugin(id: string): Promise<boolean> {
  const entry = registry.get(id);
  if (!entry) return false;

  const wasEnabled = isPluginEnabled(id);
  if (wasEnabled) {
    await stopPlugin(id);
    Settings.setPlugin(id, "_enabled", false);
  } else {
    Settings.setPlugin(id, "_enabled", true);
    await startPlugin(id);
  }

  return !wasEnabled;
}

export function isPluginEnabled(id: string): boolean {
  return Settings.getPluginSetting(id, "_enabled", false) as boolean;
}

export function isPluginRunning(id: string): boolean {
  return registry.get(id)?.running ?? false;
}

export function getPlugin(id: string): NixcordPlugin | null {
  return registry.get(id)?.plugin ?? null;
}

export function getAllPlugins(): PluginEntry[] {
  return Array.from(registry.values());
}

export function getPluginError(id: string): string | null {
  return registry.get(id)?.error ?? null;
}

/** Start all plugins that were previously enabled */
export async function startEnabledPlugins() {
  const tasks: Promise<boolean>[] = [];

  for (const [id] of registry) {
    if (isPluginEnabled(id)) {
      tasks.push(startPlugin(id));
    }
  }

  await Promise.allSettled(tasks);
}

/** Notify all running plugins that Discord modules are ready */
export async function notifyModulesReady() {
  const tasks: Promise<void>[] = [];

  for (const [, entry] of registry) {
    if (entry.running && entry.plugin.onModulesReady) {
      tasks.push(
        Promise.resolve(entry.plugin.onModulesReady!()).catch(err =>
          console.error(`[Nixcord] onModulesReady failed for ${entry.plugin.id}:`, err)
        )
      );
    }
  }

  await Promise.allSettled(tasks);
}
