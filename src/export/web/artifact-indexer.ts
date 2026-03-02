import crypto from 'crypto';

export interface ArtifactLinkMapping {
  original: string;
  outputHtmlPath: string;
  title: string;
}

function sanitizeSegments(segments: string[]): string[] {
  const result: string[] = [];
  for (const seg of segments) {
    const trimmed = seg.trim();
    if (!trimmed || trimmed === '.') continue;
    if (trimmed === '..') {
      result.push('__');
      continue;
    }
    result.push(trimmed);
  }
  return result;
}

function toSafeFilename(original: string): string {
  const rawSegments = original.split(/[\\/]+/g);
  const safeSegments = sanitizeSegments(rawSegments);
  const base = safeSegments.join('-') || 'artifact';
  const normalized = base.replace(/[^a-zA-Z0-9._-]+/g, '_');

  const suffix = '.html';
  const maxLen = 180;
  if (normalized.length + suffix.length <= maxLen) {
    return normalized + suffix;
  }

  const hash = crypto.createHash('sha1').update(original).digest('hex').slice(0, 10);
  const headLen = Math.max(16, maxLen - suffix.length - 1 - hash.length);
  const head = normalized.slice(0, headLen);
  return `${head}-${hash}${suffix}`;
}

export function buildArtifactLinkMap(links: string[]): ArtifactLinkMapping[] {
  const seen = new Set<string>();
  const mappings: ArtifactLinkMapping[] = [];

  for (const link of links) {
    const original = String(link);
    if (seen.has(original)) continue;
    seen.add(original);

    const filename = toSafeFilename(original);
    const outputHtmlPath = `artifacts/${filename}`;
    mappings.push({ original, outputHtmlPath, title: original });
  }

  return mappings;
}

