export interface RenderArtifactOptions {
  title: string;
  originalPath: string;
  content: string;
}

function escapeHtml(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderArtifactPage(options: RenderArtifactOptions): string {
  const title = escapeHtml(options.title);
  const originalPath = escapeHtml(options.originalPath);
  const content = escapeHtml(options.content);

  return [
    '<!doctype html>',
    '<html lang="zh-CN">',
    '<head>',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<title>${title}</title>`,
    '<style>',
    'body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial; color: #111827; background: #ffffff; }',
    '.container { max-width: 1040px; margin: 0 auto; padding: 24px; }',
    'h1 { font-size: 18px; margin: 0 0 8px; }',
    '.path { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 12px; color: #374151; }',
    'pre { margin-top: 16px; background: #0b1020; color: #e5e7eb; padding: 12px; border-radius: 10px; overflow: auto; font-size: 12px; line-height: 1.5; }',
    '</style>',
    '</head>',
    '<body>',
    '<div class="container">',
    `<h1>${title}</h1>`,
    `<div class="path">${originalPath}</div>`,
    `<pre>${content}</pre>`,
    '</div>',
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

