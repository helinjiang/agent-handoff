import fs from 'fs/promises';
import os from 'os';
import path from 'path';

export interface WorkspaceRegistryItem {
  name: string;
  path: string;
  addedAt: string;
  updatedAt: string;
}

export interface WorkspaceRegistry {
  version: 1;
  items: WorkspaceRegistryItem[];
}

export interface RegistryStore {
  load(): Promise<WorkspaceRegistry>;
  save(registry: WorkspaceRegistry): Promise<void>;
}

function getHomeDir(): string | null {
  try {
    const envHome = process.env.HOME;
    if (envHome && envHome.trim()) return envHome;
    const home = os.homedir();
    if (home && home.trim()) return home;
    return null;
  } catch {
    return null;
  }
}

function defaultRegistryFilePath(): string {
  const home = getHomeDir();
  const base = home ? home : process.cwd();
  return path.join(base, '.agenthandoff', 'registry.json');
}

async function ensureParentDir(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

function normalizeRegistry(registry: unknown): WorkspaceRegistry {
  if (
    typeof registry === 'object' &&
    registry !== null &&
    'version' in registry &&
    (registry as { version?: unknown }).version === 1 &&
    'items' in registry &&
    Array.isArray((registry as { items?: unknown }).items)
  ) {
    const items = (registry as { items: unknown[] }).items
      .map((item) => {
        if (typeof item !== 'object' || item === null) return null;
        const obj = item as Record<string, unknown>;
        const name = typeof obj.name === 'string' ? obj.name : '';
        const itemPath = typeof obj.path === 'string' ? obj.path : '';
        const addedAt = typeof obj.addedAt === 'string' ? obj.addedAt : '';
        const updatedAt = typeof obj.updatedAt === 'string' ? obj.updatedAt : '';
        if (!name || !itemPath) return null;
        return { name, path: itemPath, addedAt, updatedAt };
      })
      .filter((x): x is WorkspaceRegistryItem => Boolean(x));

    return { version: 1, items };
  }

  return { version: 1, items: [] };
}

export function createDefaultRegistryStore(): RegistryStore {
  const filePath = defaultRegistryFilePath();

  return {
    async load(): Promise<WorkspaceRegistry> {
      try {
        const raw = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(raw) as unknown;
        return normalizeRegistry(parsed);
      } catch {
        return { version: 1, items: [] };
      }
    },
    async save(registry: WorkspaceRegistry): Promise<void> {
      await ensureParentDir(filePath);
      const normalized = normalizeRegistry(registry);
      await fs.writeFile(filePath, JSON.stringify(normalized, null, 2) + '\n', 'utf-8');
    },
  };
}

function defaultNameForPath(workspacePath: string): string {
  const abs = path.resolve(workspacePath);
  return path.basename(abs) || abs;
}

export async function registerWorkspace(workspacePath: string, name?: string): Promise<void> {
  const store = createDefaultRegistryStore();
  const registry = await store.load();
  const absPath = path.resolve(workspacePath);
  const now = new Date().toISOString();
  const itemName = (name && name.trim()) ? name.trim() : defaultNameForPath(absPath);

  const existingIndex = registry.items.findIndex((i) => path.resolve(i.path) === absPath);
  if (existingIndex >= 0) {
    const existing = registry.items[existingIndex];
    registry.items[existingIndex] = {
      ...existing,
      name: itemName,
      updatedAt: now,
      addedAt: existing.addedAt || now,
      path: absPath,
    };
  } else {
    registry.items.push({
      name: itemName,
      path: absPath,
      addedAt: now,
      updatedAt: now,
    });
  }

  await store.save(registry);
}

export async function unregisterWorkspace(pathOrName: string): Promise<void> {
  const store = createDefaultRegistryStore();
  const registry = await store.load();
  const token = String(pathOrName).trim();
  if (!token) return;

  const abs = path.resolve(token);
  registry.items = registry.items.filter((item) => {
    const itemAbs = path.resolve(item.path);
    return itemAbs !== abs && item.name !== token;
  });

  await store.save(registry);
}

export async function listWorkspaces(): Promise<WorkspaceRegistryItem[]> {
  const store = createDefaultRegistryStore();
  const registry = await store.load();
  return [...registry.items].sort((a, b) => a.name.localeCompare(b.name));
}
