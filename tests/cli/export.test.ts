import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

describe('export command', () => {
  it('should export web timeline for demo-login', async () => {
    const workspace = 'examples/workspaces/demo-login';
    const outDir = path.join(process.cwd(), 'test-export-out');

    await fs.rm(outDir, { recursive: true, force: true });

    const output = execSync(
      `node dist/index.js export ${workspace} --format web --output ${outDir}`,
      { encoding: 'utf-8' }
    );

    expect(output).toContain('Exported to');

    const indexPath = path.join(outDir, 'index.html');
    const cssPath = path.join(outDir, 'assets', 'viewer.css');
    const jsPath = path.join(outDir, 'assets', 'viewer.js');

    const index = await fs.readFile(indexPath, 'utf-8');
    expect(index).toContain('id="__EVENTS__"');

    await fs.access(cssPath);
    await fs.access(jsPath);

    const files = await fs.readdir(path.join(outDir, 'artifacts'));
    expect(files.length).toBeGreaterThan(0);
  });
});
