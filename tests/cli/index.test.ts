import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

describe('index command', () => {
  it('should generate index json file and output json', async () => {
    const workspace = 'examples/workspaces/demo-login';
    const outFile = path.join(process.cwd(), 'test-index-out', 'index.json');

    await fs.rm(path.dirname(outFile), { recursive: true, force: true });

    const output = execSync(
      `node dist/index.js index ${workspace} --output ${outFile} --json`,
      { encoding: 'utf-8' }
    );

    const parsed = JSON.parse(output);
    expect(parsed.version).toBe(1);
    expect(parsed.workspaceName).toBe('demo-login');
    expect(Array.isArray(parsed.steps)).toBe(true);

    const saved = JSON.parse(await fs.readFile(outFile, 'utf-8'));
    expect(saved.version).toBe(1);
    expect(saved.workspaceName).toBe('demo-login');
  });
});

