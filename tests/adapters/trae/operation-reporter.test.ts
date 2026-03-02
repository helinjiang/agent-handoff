import { describe, it, expect } from 'vitest';
import { OperationReporter } from '../../../src/adapters/trae/operation-reporter';
import { TraeSession } from '../../../src/adapters/trae/types';

describe('OperationReporter', () => {
  const mockSession: TraeSession = {
    id: 'test-session',
    startedAt: '2026-03-02T10:00:00+08:00',
    workspacePath: '/test',
    stepId: 'test-step',
    operations: [
      { type: 'click', target: 'button', timestamp: 1677123456000 },
      { type: 'fill', target: 'input', value: 'test', timestamp: 1677123457000 },
    ],
    screenshots: [],
  };

  it('should generate json report', () => {
    const reporter = new OperationReporter(mockSession);
    const report = reporter.generate({ format: 'json', includeScreenshots: false });
    const parsed = JSON.parse(report);
    expect(parsed.id).toBe('test-session');
  });

  it('should generate markdown report', () => {
    const reporter = new OperationReporter(mockSession);
    const report = reporter.generate({ format: 'markdown', includeScreenshots: false });
    expect(report).toContain('# Automation Session Report');
    expect(report).toContain('click');
  });

  it('should generate html report', () => {
    const reporter = new OperationReporter(mockSession);
    const report = reporter.generate({ format: 'html', includeScreenshots: false });
    expect(report).toContain('<!DOCTYPE html>');
    expect(report).toContain('test-session');
  });
});

