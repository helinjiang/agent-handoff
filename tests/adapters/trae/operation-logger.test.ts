import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { OperationLogger } from '../../../src/adapters/trae/operation-logger';

describe('OperationLogger', () => {
  const testDir = path.join(process.cwd(), 'test-operation-logger');

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true });
    } catch {}
  });

  it('should log operations', async () => {
    const logger = new OperationLogger({
      workspacePath: testDir,
      stepId: 'test-step',
    });

    await logger.log('click', 'newTaskButton');
    await logger.log('fill', 'chatInputArea', 'test prompt');

    const operations = logger.getOperations();
    expect(operations).toHaveLength(2);
    expect(operations[0].type).toBe('click');
    expect(operations[1].value).toBe('test prompt');
  });

  it('should save to file', async () => {
    const logger = new OperationLogger({
      workspacePath: testDir,
      stepId: 'test-step',
    });

    await logger.log('click', 'button');
    logger.markCompleted('success');
    const filePath = await logger.saveToFile();

    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    const session = JSON.parse(lines[lines.length - 1]);
    expect(session.operations).toHaveLength(1);
  });

  it('should generate session info', () => {
    const logger = new OperationLogger({
      workspacePath: testDir,
      stepId: 'test-step',
    });

    const session = logger.getSession();
    expect(session.id).toBeDefined();
    expect(session.stepId).toBe('test-step');
  });
});

