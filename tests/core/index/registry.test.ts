import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { listWorkspaces, registerWorkspace, unregisterWorkspace } from '../../../src/core/index/registry';

describe('registry', () => {
  const originalHome = process.env.HOME;
  const testHome = path.join(process.cwd(), 'test-registry-home');

  beforeEach(async () => {
    process.env.HOME = testHome;
    await fs.rm(testHome, { recursive: true, force: true });
  });

  afterEach(async () => {
    await fs.rm(testHome, { recursive: true, force: true });
    process.env.HOME = originalHome;
  });

  it('should register workspace and dedupe by path', async () => {
    const ws1 = path.join(process.cwd(), 'examples/workspaces/demo-login');

    await registerWorkspace(ws1);
    await registerWorkspace(ws1);

    const items = await listWorkspaces();
    expect(items).toHaveLength(1);
    expect(path.resolve(items[0].path)).toBe(path.resolve(ws1));
    expect(items[0].name).toBe('demo-login');

    const registryPath = path.join(testHome, '.agenthandoff', 'registry.json');
    const raw = await fs.readFile(registryPath, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.version).toBe(1);
    expect(Array.isArray(parsed.items)).toBe(true);
    expect(parsed.items).toHaveLength(1);
  });

  it('should unregister by name or path', async () => {
    const ws1 = path.join(process.cwd(), 'examples/workspaces/demo-login');
    const ws2 = path.join(process.cwd(), 'examples/workspaces');

    await registerWorkspace(ws1);
    await registerWorkspace(ws2);

    await unregisterWorkspace('demo-login');
    let items = await listWorkspaces();
    expect(items.some((i) => i.name === 'demo-login')).toBe(false);

    await unregisterWorkspace(ws2);
    items = await listWorkspaces();
    expect(items).toHaveLength(0);
  });
});

