import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

const testWorkspaceDir = path.resolve('test-workspace-init');

describe('init command', () => {
  afterEach(async () => {
    try {
      await fs.rm(testWorkspaceDir, { recursive: true });
    } catch {}
  });

  it('should create workspace structure', async () => {
    execSync(`node dist/index.js init test-workspace-init`, { cwd: process.cwd() });

    const stat = await fs.stat(testWorkspaceDir);
    expect(stat.isDirectory()).toBe(true);

    const workflow = await fs.readFile(path.join(testWorkspaceDir, 'workflow.yaml'), 'utf-8');
    expect(workflow).toContain('name: test-workspace-init');

    const stateContent = await fs.readFile(path.join(testWorkspaceDir, 'state.json'), 'utf-8');
    const state = JSON.parse(stateContent);
    expect(state.status).toBe('running');
    expect(state.currentIndex).toBe(0);

    const brief = await fs.readFile(path.join(testWorkspaceDir, 'brief.md'), 'utf-8');
    expect(brief).toContain('# brief');

    const stepsDir = await fs.stat(path.join(testWorkspaceDir, 'steps'));
    expect(stepsDir.isDirectory()).toBe(true);
  });

  it('should fail when workspace already exists', async () => {
    await fs.mkdir(testWorkspaceDir, { recursive: true });

    try {
      execSync(`node dist/index.js init test-workspace-init`, { cwd: process.cwd(), stdio: 'pipe' });
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should create workspace in custom path', async () => {
    const customPath = path.resolve('test-custom-path');
    try {
      execSync(`node dist/index.js init test-workspace-init --path ${customPath}`, { cwd: process.cwd() });

      const workspacePath = path.join(customPath, 'test-workspace-init');
      const stat = await fs.stat(workspacePath);
      expect(stat.isDirectory()).toBe(true);
    } finally {
      try {
        await fs.rm(customPath, { recursive: true });
      } catch {}
    }
  });
});

describe('CLI help and version', () => {
  it('should show help', () => {
    const output = execSync(`node dist/index.js --help`, { cwd: process.cwd(), encoding: 'utf-8' });
    expect(output).toContain('agent-handoff');
    expect(output).toContain('轻量级多 Agent 协作接力工具');
  });

  it('should show version', () => {
    const output = execSync(`node dist/index.js --version`, { cwd: process.cwd(), encoding: 'utf-8' });
    expect(output.trim()).toBe('0.1.0');
  });
});
