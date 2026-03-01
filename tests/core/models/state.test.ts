import { describe, it, expect } from 'vitest';
import { State, WorkflowStatus, createInitialState } from '../../../src/core/models/state';

describe('State types', () => {
  it('should define State type correctly', () => {
    const state: State = {
      currentIndex: 0,
      status: 'running',
      updatedAt: '2026-03-01T00:00:00+08:00',
    };
    expect(state.currentIndex).toBe(0);
    expect(state.status).toBe('running');
  });

  it('should define State with blocked status', () => {
    const state: State = {
      currentIndex: 2,
      status: 'blocked',
      updatedAt: '2026-03-01T00:00:00+08:00',
      blockedReason: '缺少依赖',
    };
    expect(state.status).toBe('blocked');
    expect(state.blockedReason).toBe('缺少依赖');
  });

  it('should create initial state', () => {
    const state = createInitialState();
    expect(state.currentIndex).toBe(0);
    expect(state.status).toBe('running');
    expect(state.updatedAt).toBeDefined();
  });
});
