import fs from 'fs/promises';
import path from 'path';
import { readEventsJsonl, toTimelineItems } from '../../core/events-reader.js';
import { buildArtifactLinkMap } from './artifact-indexer.js';
import { renderArtifactPage } from './artifact-renderer.js';
import { renderWebTimeline } from './timeline-renderer.js';

export interface ExportWebTimelineOptions {
  workspacePath: string;
  outputDir: string;
  limit?: number;
}

export interface ExportWebTimelineResult {
  outputDir: string;
  indexPath: string;
  eventsCount: number;
  invalidLines: number;
  artifactsCount: number;
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export async function exportWebTimeline(options: ExportWebTimelineOptions): Promise<ExportWebTimelineResult> {
  const { events, invalidLines } = await readEventsJsonl({
    workspacePath: options.workspacePath,
    limit: options.limit,
  });

  const items = toTimelineItems(events);

  const linkSet = new Set<string>();
  for (const item of items) {
    for (const link of item.links || []) {
      linkSet.add(link);
    }
  }

  const mappings = buildArtifactLinkMap([...linkSet]);
  const linkHrefMap: Record<string, string> = {};
  for (const m of mappings) {
    linkHrefMap[m.original] = m.outputHtmlPath;
  }

  const out = path.resolve(options.outputDir);
  await ensureDir(out);
  await ensureDir(path.join(out, 'assets'));
  await ensureDir(path.join(out, 'artifacts'));

  for (const m of mappings) {
    const artifactSourcePath = path.join(options.workspacePath, m.original);
    let content: string;
    try {
      content = await fs.readFile(artifactSourcePath, 'utf-8');
    } catch {
      content = `文件不存在或无法读取: ${m.original}`;
    }

    const html = renderArtifactPage({
      title: m.title,
      originalPath: m.original,
      content,
    });

    const fullOutPath = path.join(out, m.outputHtmlPath);
    await ensureDir(path.dirname(fullOutPath));
    await fs.writeFile(fullOutPath, html, 'utf-8');
  }

  const timeline = renderWebTimeline({
    title: 'AgentHandoff Timeline',
    workspaceName: path.basename(path.resolve(options.workspacePath)),
    generatedAt: new Date().toISOString(),
    items,
    includeAssets: true,
    linkHrefMap,
  });

  await fs.writeFile(path.join(out, 'index.html'), timeline.html, 'utf-8');
  for (const [rel, content] of Object.entries(timeline.assets)) {
    const full = path.join(out, rel);
    await ensureDir(path.dirname(full));
    await fs.writeFile(full, content, 'utf-8');
  }

  return {
    outputDir: out,
    indexPath: path.join(out, 'index.html'),
    eventsCount: items.length,
    invalidLines,
    artifactsCount: mappings.length,
  };
}

