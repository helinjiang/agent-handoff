import { describe, it, expect } from 'vitest';
import path from 'path';
import { buildWorkspaceIndex } from '../../../src/core/index/indexer';

describe('indexer', () => {
  it('should build index for demo-login', async () => {
    const workspacePath = path.resolve('examples/workspaces/demo-login');
    const index = await buildWorkspaceIndex(workspacePath);

    expect(index.version).toBe(1);
    expect(index.workspaceName).toBe('demo-login');
    expect(index.workflowName).toBe('demo-login');
    expect(index.steps).toHaveLength(6);
    expect(index.steps[0].index).toBe(1);
    expect(index.steps.every((s) => typeof s.outputExists === 'boolean')).toBe(true);

    const brief = index.artifacts.find((a) => a.path === 'brief.md');
    expect(brief).toBeDefined();
    expect(brief?.kind).toBe('brief');

    const firstStepOut = index.artifacts.find((a) => a.kind === 'step.output');
    expect(firstStepOut).toBeDefined();
    if (firstStepOut?.preview) {
      expect(firstStepOut.preview.length).toBeLessThanOrEqual(2000);
    }

    if (index.events.length > 1) {
      for (let i = 1; i < index.events.length; i++) {
        expect(index.events[i - 1].ts <= index.events[i].ts).toBe(true);
      }
    }
  });
});

