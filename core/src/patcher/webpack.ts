/**
 * Nixcord Webpack Module Finder
 * Finds Discord's internal webpack modules on-demand.
 * Unlike Vencord's approach, we never scan all chunks at boot.
 * Modules are resolved lazily and cached after first access.
 */

declare const webpackChunkdiscord_app: Array<[unknown[], Record<string, unknown>, unknown]>;

type ModuleFilter = (exports: unknown, module: unknown, id: string) => boolean;
type ModuleCache = Map<string, unknown>;

const resolvedCache: ModuleCache = new Map();
let webpackRequire: ((id: string) => unknown) | null = null;

function getWebpackRequire(): ((id: string) => unknown) | null {
  if (webpackRequire) return webpackRequire;

  try {
    // Grab require from the chunk array Discord uses
    const chunk = webpackChunkdiscord_app;
    if (!chunk) return null;

    let req: ((id: string) => unknown) | null = null;
    chunk.push([
      [Symbol()],
      {},
      (r: (id: string) => unknown) => { req = r; }
    ]);
    chunk.pop();
    webpackRequire = req;
    return req;
  } catch {
    return null;
  }
}

export function findModule(filter: ModuleFilter): unknown | null {
  const req = getWebpackRequire();
  if (!req) return null;

  const modules = (req as unknown as { c: Record<string, { exports: unknown }> }).c;
  if (!modules) return null;

  for (const id in modules) {
    const mod = modules[id];
    if (!mod?.exports) continue;

    if (filter(mod.exports, mod, id)) return mod.exports;

    // Check default export too
    const def = (mod.exports as Record<string, unknown>)?.default;
    if (def && filter(def, mod, id)) return def;
  }

  return null;
}

export function findModuleByProps(...props: string[]): unknown | null {
  const cacheKey = props.join("|");
  if (resolvedCache.has(cacheKey)) return resolvedCache.get(cacheKey) ?? null;

  const result = findModule(exports => {
    if (typeof exports !== "object" || !exports) return false;
    return props.every(p => p in (exports as object));
  });

  if (result) resolvedCache.set(cacheKey, result);
  return result;
}

export function findModuleByDisplayName(name: string): unknown | null {
  const cacheKey = `displayName:${name}`;
  if (resolvedCache.has(cacheKey)) return resolvedCache.get(cacheKey) ?? null;

  const result = findModule(exports => {
    return (exports as Record<string, unknown>)?.displayName === name
      || (exports as Record<string, unknown>)?.default?.displayName === name;
  });

  if (result) resolvedCache.set(cacheKey, result);
  return result;
}

export function clearModuleCache() {
  resolvedCache.clear();
  webpackRequire = null;
}
