import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import {
  validateArtifact,
  validateArtifactFile,
  validateWorkspaceArtifacts,
  REQUIRED_SECTIONS,
} from '../../src/core/artifact-validator';

const demoLoginPath = path.resolve('examples/workspaces/demo-login');

const validContent = `
# Output

## 产物更新
- 更新了文件 A
- 创建了文件 B

## 关键决策
- 选择方案 X

## 风险与待确认
- 需要确认 API 设计

## 下一步交接
- 交给下一步实现
`;

describe('validateArtifact', () => {
  it('should pass valid artifact', () => {
    const result = validateArtifact(validContent);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should pass valid artifact with ### headers', () => {
    const content = `
# Output

### 产物更新
- 更新了文件 A

### 关键决策
- 选择方案 X

### 风险与待确认
- 需要确认

### 下一步交接
- 交给下一步
`;
    const result = validateArtifact(content);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail when section missing', () => {
    const content = `
# Output
## 产物更新
- 更新了文件
`;
    const result = validateArtifact(content);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.section === '关键决策')).toBe(true);
    expect(result.errors.some((e) => e.section === '风险与待确认')).toBe(true);
    expect(result.errors.some((e) => e.section === '下一步交接')).toBe(true);
  });

  it('should fail when section empty', () => {
    const content = `
# Output
## 产物更新
## 关键决策
## 风险与待确认
## 下一步交接
`;
    const result = validateArtifact(content);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.type === 'empty_section')).toBe(true);
  });

  it('should warn when content too short', () => {
    const content = `
# Output
## 产物更新
ok
## 关键决策
ok
## 风险与待确认
ok
## 下一步交接
ok
`;
    const result = validateArtifact(content);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.every((w) => w.type === 'short_content')).toBe(true);
  });

  it('should detect all required sections', () => {
    expect(REQUIRED_SECTIONS).toContain('产物更新');
    expect(REQUIRED_SECTIONS).toContain('关键决策');
    expect(REQUIRED_SECTIONS).toContain('风险与待确认');
    expect(REQUIRED_SECTIONS).toContain('下一步交接');
  });

  it('should handle mixed ## and ### headers', () => {
    const content = `
# Output
## 产物更新
- 内容

### 关键决策
- 决策

## 风险与待确认
- 风险

### 下一步交接
- 交接
`;
    const result = validateArtifact(content);
    expect(result.valid).toBe(true);
  });
});

describe('validateArtifactFile', () => {
  const testDir = path.join(process.cwd(), 'test-validator-workspace');
  const testFile = path.join(testDir, 'output.md');

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true });
    } catch {}
  });

  it('should validate existing file', async () => {
    await fs.writeFile(testFile, validContent);
    const result = await validateArtifactFile(testFile);
    expect(result.valid).toBe(true);
  });

  it('should fail for nonexistent file', async () => {
    const result = await validateArtifactFile('/nonexistent/file.md');
    expect(result.valid).toBe(false);
    expect(result.errors[0].type).toBe('invalid_format');
  });

  it('should validate demo-login output files', async () => {
    const outputPath = path.join(demoLoginPath, 'steps/01-a-clarify/output.md');
    const result = await validateArtifactFile(outputPath);
    expect(result.valid).toBe(true);
  });
});

describe('validateWorkspaceArtifacts', () => {
  const testDir = path.join(process.cwd(), 'test-validator-workspace-full');

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, 'steps/01-step1'), { recursive: true });
    await fs.mkdir(path.join(testDir, 'steps/02-step2'), { recursive: true });

    await fs.writeFile(
      path.join(testDir, 'workflow.yaml'),
      `
name: test-validator
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
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true });
    } catch {}
  });

  it('should validate all artifacts in workspace', async () => {
    await fs.writeFile(
      path.join(testDir, 'steps/01-step1/output.md'),
      validContent
    );
    await fs.writeFile(
      path.join(testDir, 'steps/02-step2/output.md'),
      validContent
    );

    const result = await validateWorkspaceArtifacts(testDir);
    expect(result.valid).toBe(true);
    expect(result.totalSteps).toBe(2);
    expect(result.validSteps).toBe(2);
    expect(result.errorCount).toBe(0);
  });

  it('should detect invalid artifacts', async () => {
    await fs.writeFile(
      path.join(testDir, 'steps/01-step1/output.md'),
      validContent
    );
    await fs.writeFile(
      path.join(testDir, 'steps/02-step2/output.md'),
      '# Invalid Output\n## 产物更新\nonly this'
    );

    const result = await validateWorkspaceArtifacts(testDir);
    expect(result.valid).toBe(false);
    expect(result.validSteps).toBe(1);
    expect(result.errorCount).toBeGreaterThan(0);
  });

  it('should handle missing output files', async () => {
    const result = await validateWorkspaceArtifacts(testDir);
    expect(result.valid).toBe(false);
    expect(result.errorCount).toBeGreaterThan(0);
  });

  it('should validate demo-login workspace', async () => {
    const result = await validateWorkspaceArtifacts(demoLoginPath);
    expect(result.valid).toBe(true);
    expect(result.totalSteps).toBe(6);
    expect(result.validSteps).toBe(6);
    expect(result.errorCount).toBe(0);
  });
});
