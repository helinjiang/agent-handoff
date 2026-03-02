import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

describe('advance command', () => {
  const testDir = path.join(process.cwd(), 'test-advance-workspace');

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, 'steps/01-step1'), { recursive: true });

    await fs.writeFile(
      path.join(testDir, 'workflow.yaml'),
      `
name: test-advance
steps:
  - id: step1
    executor: trae
    input: brief.md
    output: steps/01-step1/output.md
  - id: step2
    executor: trae
    input: steps/01-step1/output.md
    output: steps/02-step2/output.md
`
    );

    await fs.writeFile(
      path.join(testDir, 'state.json'),
      JSON.stringify({
        currentIndex: 0,
        status: 'running',
        updatedAt: new Date().toISOString(),
      })
    );

    await fs.writeFile(
      path.join(testDir, 'steps/01-step1/output.md'),
      `# Output\n## 产物更新\n- done\n## 关键决策\n- done\n## 风险与待确认\n- none\n## 下一步交接\n- next`
    );

    await fs.writeFile(path.join(testDir, 'brief.md'), '# Brief');
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true });
    } catch {}
  });

  it('should advance state and write event', () => {
    const output = execSync(`node dist/index.js advance ${testDir}`, {
      encoding: 'utf-8',
    });
    expect(output).toContain('step.done');
    expect(output).toContain('State updated');
  });

  it('should write custom event', () => {
    const output = execSync(
      `node dist/index.js advance ${testDir} -e verify.passed -s "测试通过"`,
      { encoding: 'utf-8' }
    );
    expect(output).toContain('verify.passed');
    expect(output).toContain('测试通过');
  });

  it('should not update state with --no-state', async () => {
    const stateBefore = JSON.parse(
      await fs.readFile(path.join(testDir, 'state.json'), 'utf-8')
    );

    execSync(`node dist/index.js advance ${testDir} --no-state`, {
      encoding: 'utf-8',
    });

    const stateAfter = JSON.parse(
      await fs.readFile(path.join(testDir, 'state.json'), 'utf-8')
    );
    expect(stateAfter.currentIndex).toBe(stateBefore.currentIndex);
  });

  it('should not write event with --skip-event', () => {
    const output = execSync(`node dist/index.js advance ${testDir} --skip-event`, {
      encoding: 'utf-8',
    });
    expect(output).not.toContain('Event written');
    expect(output).toContain('State updated');
  });

  it('should warn when workflow completed', async () => {
    await fs.writeFile(
      path.join(testDir, 'state.json'),
      JSON.stringify({
        currentIndex: 2,
        status: 'done',
        updatedAt: new Date().toISOString(),
      })
    );

    const output = execSync(`node dist/index.js advance ${testDir}`, {
      encoding: 'utf-8',
    });
    expect(output).toContain('completed');
  });

  it('should create events.jsonl file', async () => {
    execSync(`node dist/index.js advance ${testDir}`, { encoding: 'utf-8' });

    const eventsPath = path.join(testDir, 'events.jsonl');
    const content = await fs.readFile(eventsPath, 'utf-8');
    expect(content).toContain('step.done');
  });
});
