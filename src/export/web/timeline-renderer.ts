import { TimelineItem } from '../../core/events-reader.js';

export interface RenderWebTimelineOptions {
  title: string;
  workspaceName: string;
  generatedAt: string;
  items: TimelineItem[];
  includeAssets: boolean;
}

export interface RenderWebTimelineResult {
  html: string;
  assets: Record<string, string>;
}

function escapeHtml(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderLinks(links: string[]): string {
  const items = links
    .map((link) => {
      const safe = escapeHtml(link);
      return `<a href="${safe}" data-link="${safe}" target="_blank" rel="noopener noreferrer">${safe}</a>`;
    })
    .join('');
  return `<div class="links">${items}</div>`;
}

function renderData(data: Record<string, unknown>): string {
  const json = escapeHtml(JSON.stringify(data, null, 2));
  return `<details><summary>data</summary><pre>${json}</pre></details>`;
}

export function renderWebTimeline(options: RenderWebTimelineOptions): RenderWebTimelineResult {
  const assets: Record<string, string> = {};

  if (options.includeAssets) {
    assets['assets/viewer.css'] = getDefaultCss();
    assets['assets/viewer.js'] = getDefaultJs();
  }

  const title = escapeHtml(options.title);
  const workspaceName = escapeHtml(options.workspaceName);
  const generatedAt = escapeHtml(options.generatedAt);

  const eventsJson = escapeHtml(JSON.stringify(options.items));

  const headAssets = options.includeAssets
    ? `<link rel="stylesheet" href="assets/viewer.css" />`
    : '';
  const bodyAssets = options.includeAssets ? `<script src="assets/viewer.js"></script>` : '';

  const list = options.items
    .map((item) => {
      const ts = escapeHtml(item.ts);
      const stepId = escapeHtml(item.stepId);
      const type = escapeHtml(item.type);
      const summary = escapeHtml(item.summary);

      const workItem = item.workItemId ? `<span class="badge">${escapeHtml(item.workItemId)}</span>` : '';

      const links = item.links && item.links.length > 0 ? renderLinks(item.links) : '';
      const data = item.data ? renderData(item.data) : '';

      return [
        `<div class="item" data-step="${stepId}" data-type="${type}">`,
        `<div class="row">`,
        `<span class="ts">${ts}</span>`,
        `<span class="badge">${stepId}</span>`,
        `<span class="type">${type}</span>`,
        workItem,
        `</div>`,
        `<div class="summary">${summary}</div>`,
        links,
        data,
        `</div>`,
      ].join('');
    })
    .join('');

  const html = [
    '<!doctype html>',
    '<html lang="zh-CN">',
    '<head>',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<title>${title}</title>`,
    headAssets,
    '</head>',
    '<body>',
    '<div class="container">',
    '<header>',
    `<h1>${workspaceName} Timeline</h1>`,
    `<div class="meta">Generated at ${generatedAt}</div>`,
    '</header>',
    `<script id="__EVENTS__" type="application/json">${eventsJson}</script>`,
    `<div class="list" id="timeline-list">${list}</div>`,
    '</div>',
    bodyAssets,
    '</body>',
    '</html>',
  ]
    .filter((x) => x !== '')
    .join('\n');

  return { html, assets };
}

function getDefaultCss(): string {
  return [
    '* { box-sizing: border-box; }',
    'body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"; color: #111827; background: #ffffff; }',
    '.container { max-width: 1040px; margin: 0 auto; padding: 24px; }',
    'header { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 16px; }',
    'h1 { font-size: 20px; margin: 0; }',
    '.meta { font-size: 12px; color: #6b7280; }',
    '.list { display: flex; flex-direction: column; gap: 10px; }',
    '.item { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; }',
    '.row { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; }',
    '.ts { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 12px; color: #374151; }',
    '.badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 999px; font-size: 12px; background: #eff6ff; color: #1d4ed8; border: 1px solid #dbeafe; }',
    '.type { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 12px; color: #111827; background: #f3f4f6; padding: 2px 8px; border-radius: 8px; }',
    '.summary { margin-top: 8px; white-space: pre-wrap; line-height: 1.45; }',
    '.links { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 8px; }',
    '.links a { font-size: 12px; color: #2563eb; text-decoration: none; border-bottom: 1px dashed #93c5fd; }',
    '.links a:hover { border-bottom-style: solid; }',
    'details { margin-top: 10px; }',
    'pre { background: #0b1020; color: #e5e7eb; padding: 10px; border-radius: 10px; overflow: auto; font-size: 12px; line-height: 1.5; }',
    '',
  ].join('\n');
}

function getDefaultJs(): string {
  return [
    '(() => {',
    '  const el = document.getElementById("__EVENTS__");',
    '  if (!el) return;',
    '  try {',
    '    JSON.parse(el.textContent || "[]");',
    '  } catch {',
    '  }',
    '})();',
    '',
  ].join('\n');
}

