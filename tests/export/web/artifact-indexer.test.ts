import { describe, it, expect } from 'vitest';
import { buildArtifactLinkMap } from '../../../src/export/web/artifact-indexer';

describe('artifact-indexer', () => {
  it('should generate deterministic mapping and dedupe', () => {
    const links = ['steps/01-a/output.md', 'steps/01-a/output.md', 'brief.md'];
    const mappings = buildArtifactLinkMap(links);

    expect(mappings).toHaveLength(2);
    expect(mappings[0].original).toBe('steps/01-a/output.md');
    expect(mappings[0].outputHtmlPath).toBe('artifacts/steps-01-a-output.md.html');
    expect(mappings[1].outputHtmlPath).toBe('artifacts/brief.md.html');
  });

  it('should prevent path traversal in outputHtmlPath', () => {
    const links = ['../secrets.txt', '..\\secrets.txt', '/abs/path.txt'];
    const mappings = buildArtifactLinkMap(links);

    for (const m of mappings) {
      expect(m.outputHtmlPath.startsWith('artifacts/')).toBe(true);
      expect(m.outputHtmlPath.includes('..')).toBe(false);
      expect(m.outputHtmlPath.includes('\\')).toBe(false);
      expect(m.outputHtmlPath.includes('/abs/')).toBe(false);
    }
  });

  it('should sanitize unsafe characters', () => {
    const links = ['a b/c?d#e.md'];
    const mappings = buildArtifactLinkMap(links);
    expect(mappings[0].outputHtmlPath).toBe('artifacts/a_b-c_d_e.md.html');
  });
});

