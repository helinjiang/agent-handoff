import { describe, it, expect } from 'vitest';
import { renderArtifactPage } from '../../../src/export/web/artifact-renderer';

describe('artifact-renderer', () => {
  it('should render html with title/path/content', () => {
    const html = renderArtifactPage({
      title: 't',
      originalPath: 'steps/01-a/output.md',
      content: 'hello',
    });

    expect(html).toContain('<!doctype html>');
    expect(html).toContain('<title>t</title>');
    expect(html).toContain('steps/01-a/output.md');
    expect(html).toContain('<pre>hello</pre>');
  });

  it('should escape html content', () => {
    const html = renderArtifactPage({
      title: '<t>',
      originalPath: 'a"><script>alert(1)</script>',
      content: '<img src=x onerror=alert(1)>',
    });

    expect(html).toContain('&lt;t&gt;');
    expect(html).toContain('a&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
  });
});

