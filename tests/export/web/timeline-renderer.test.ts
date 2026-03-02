import { describe, it, expect } from 'vitest';
import { renderWebTimeline } from '../../../src/export/web/timeline-renderer';

describe('timeline-renderer', () => {
  it('should render full HTML and include assets when enabled', () => {
    const result = renderWebTimeline({
      title: 'Test',
      workspaceName: 'demo',
      generatedAt: '2026-03-02T00:00:00.000Z',
      includeAssets: true,
      items: [
        {
          ts: '2026-03-01T00:00:01.000Z',
          stepId: 'step-1',
          stepIndex: 0,
          type: 'step.started',
          summary: 'hello',
        },
      ],
    });

    expect(result.html).toContain('<!doctype html>');
    expect(result.html).toContain('demo Timeline');
    expect(result.html).toContain('assets/viewer.css');
    expect(result.html).toContain('assets/viewer.js');
    expect(result.assets['assets/viewer.css']).toBeDefined();
    expect(result.assets['assets/viewer.js']).toBeDefined();
    expect(result.html).toContain('id="__EVENTS__"');
    expect(result.html).toContain('timeline-list');
  });

  it('should render links and data blocks', () => {
    const result = renderWebTimeline({
      title: 'Test',
      workspaceName: 'demo',
      generatedAt: '2026-03-02T00:00:00.000Z',
      includeAssets: false,
      items: [
        {
          ts: '2026-03-01T00:00:01.000Z',
          stepId: 'step-1',
          stepIndex: 0,
          type: 'automation.session',
          summary: 'session',
          workItemId: 'w1',
          links: ['steps/01-a/output.md'],
          data: { ok: true, n: 1 },
        },
      ],
    });

    expect(result.html).toContain('automation.session');
    expect(result.html).toContain('steps/01-a/output.md');
    expect(result.html).toContain('<details>');
    expect(result.html).toContain('&quot;ok&quot;: true');
    expect(result.assets).toEqual({});
  });

  it('should escape HTML content', () => {
    const result = renderWebTimeline({
      title: '<title>',
      workspaceName: '<ws>',
      generatedAt: 'now',
      includeAssets: false,
      items: [
        {
          ts: '2026-03-01T00:00:01.000Z',
          stepId: '<step>',
          stepIndex: 0,
          type: 'step.started',
          summary: '<img src=x onerror=alert(1)>',
          links: ['a"><script>alert(1)</script>'],
          data: { x: '<b>1</b>' },
        },
      ],
    });

    expect(result.html).toContain('&lt;ws&gt; Timeline');
    expect(result.html).toContain('&lt;step&gt;');
    expect(result.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(result.html).toContain('a&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(result.html).toContain('&lt;b&gt;1&lt;/b&gt;');
    expect(result.html).not.toContain('<script>alert(1)</script>');
  });
});
