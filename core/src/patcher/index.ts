/**
 * Nixcord Module Patcher
 * Patches Discord's internal webpack modules via targeted proxy interception.
 * Deliberately avoids chunk scanning at startup — modules are patched lazily
 * only when first accessed, keeping boot time near zero.
 */

type PatchFn = (original: Function, ...args: unknown[]) => unknown;

interface Patch {
  id: string;
  module: string;
  method: string;
  fn: PatchFn;
  once: boolean;
}

interface PatchedModule {
  [key: string]: unknown;
}

const activePatchMap = new Map<string, Patch[]>();
const proxyCache = new WeakMap<object, object>();

function buildProxy(target: PatchedModule, moduleKey: string): PatchedModule {
  if (proxyCache.has(target)) return proxyCache.get(target) as PatchedModule;

  const proxy = new Proxy(target, {
    get(obj, prop: string) {
      const value = obj[prop];
      const patches = activePatchMap.get(`${moduleKey}::${prop}`);

      if (!patches?.length || typeof value !== "function") return value;

      return function (this: unknown, ...args: unknown[]) {
        let result: unknown;
        const remaining: Patch[] = [];

        for (const patch of patches) {
          try {
            result = patch.fn.call(this, value.bind(this), ...args);
          } catch (err) {
            console.error(`[Nixcord] Patch "${patch.id}" threw on ${moduleKey}::${prop}:`, err);
            result = value.apply(this, args);
          }
          if (!patch.once) remaining.push(patch);
        }

        activePatchMap.set(`${moduleKey}::${prop}`, remaining);
        return result;
      };
    }
  });

  proxyCache.set(target, proxy);
  return proxy;
}

export function patch(opts: {
  id: string;
  module: string;
  method: string;
  fn: PatchFn;
  once?: boolean;
}): () => void {
  const key = `${opts.module}::${opts.method}`;
  const entry: Patch = { ...opts, once: opts.once ?? false };

  if (!activePatchMap.has(key)) activePatchMap.set(key, []);
  activePatchMap.get(key)!.push(entry);

  return () => {
    const list = activePatchMap.get(key);
    if (!list) return;
    const idx = list.indexOf(entry);
    if (idx !== -1) list.splice(idx, 1);
  };
}

export function unpatchAll(pluginId: string) {
  for (const [key, patches] of activePatchMap.entries()) {
    const filtered = patches.filter(p => p.id !== pluginId);
    if (filtered.length !== patches.length) activePatchMap.set(key, filtered);
  }
}

export function getProxied(module: PatchedModule, moduleKey: string): PatchedModule {
  return buildProxy(module, moduleKey);
}

export function getPatchCount(): number {
  let total = 0;
  for (const patches of activePatchMap.values()) total += patches.length;
  return total;
}
