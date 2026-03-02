import { TimelineItem } from '../../core/events-reader.js';

export interface RenderWebTimelineOptions {
  title: string;
  workspaceName: string;
  generatedAt: string;
  items: TimelineItem[];
  includeAssets: boolean;
  linkHrefMap?: Record<string, string>;
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

function renderLinks(links: string[], linkHrefMap?: Record<string, string>): string {
  const items = links
    .map((link) => {
      const href = linkHrefMap && linkHrefMap[link] ? linkHrefMap[link] : link;
      const safeLabel = escapeHtml(link);
      const safeHref = escapeHtml(href);
      return `<a href="${safeHref}" data-link="${safeLabel}" target="_blank" rel="noopener noreferrer">${safeLabel}</a>`;
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
  const linkMapJson = escapeHtml(JSON.stringify(options.linkHrefMap || {}));

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

      const links =
        item.links && item.links.length > 0 ? renderLinks(item.links, options.linkHrefMap) : '';
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
    '<section class="filters" id="timeline-filters">',
    '<div class="filters-row">',
    '<input id="filter-q" type="search" placeholder="搜索 summary / data..." />',
    '<select id="filter-step"></select>',
    '<select id="filter-type"></select>',
    '<select id="filter-workItem"></select>',
    '<button id="filter-clear" type="button">清空筛选</button>',
    '</div>',
    '<div class="filters-meta" id="filters-meta"></div>',
    '</section>',
    `<script id="__EVENTS__" type="application/json">${eventsJson}</script>`,
    `<script id="__LINK_HREF_MAP__" type="application/json">${linkMapJson}</script>`,
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
    '.filters { margin: 12px 0 16px; padding: 12px; border: 1px solid #e5e7eb; border-radius: 10px; background: #fafafa; }',
    '.filters-row { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1fr auto; gap: 10px; align-items: center; }',
    '.filters-row input, .filters-row select { width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid #d1d5db; font-size: 13px; background: #fff; }',
    '.filters-row button { padding: 8px 12px; border-radius: 8px; border: 1px solid #d1d5db; background: #fff; cursor: pointer; }',
    '.filters-row button:hover { background: #f3f4f6; }',
    '.filters-meta { margin-top: 8px; font-size: 12px; color: #6b7280; }',
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
    '  const g = globalThis;',
    '  const doc = g.document;',
    '  if (!doc || typeof doc.getElementById !== "function") return;',
    '  const el = doc.getElementById("__EVENTS__");',
    '  if (!el) return;',
    '  const qInput = doc.getElementById("filter-q");',
    '  const stepSelect = doc.getElementById("filter-step");',
    '  const typeSelect = doc.getElementById("filter-type");',
    '  const workItemSelect = doc.getElementById("filter-workItem");',
    '  const clearBtn = doc.getElementById("filter-clear");',
    '  const listEl = doc.getElementById("timeline-list");',
    '  const metaEl = doc.getElementById("filters-meta");',
    '  const HTMLInput = g.HTMLInputElement;',
    '  const HTMLSelect = g.HTMLSelectElement;',
    '  const HTMLButton = g.HTMLButtonElement;',
    '  const HTMLElementCtor = g.HTMLElement;',
    '  if (!HTMLInput || !HTMLSelect || !HTMLButton || !HTMLElementCtor) return;',
    '  if (',
    '    !(qInput instanceof HTMLInput) ||',
    '    !(stepSelect instanceof HTMLSelect) ||',
    '    !(typeSelect instanceof HTMLSelect) ||',
    '    !(workItemSelect instanceof HTMLSelect) ||',
    '    !(clearBtn instanceof HTMLButton) ||',
    '    !(listEl instanceof HTMLElementCtor)',
    '  ) {',
    '    return;',
    '  }',
    '  let events;',
    '  try {',
    '    events = JSON.parse(el.textContent || "[]");',
    '  } catch {',
    '    return;',
    '  }',
    '  const linkMapEl = doc.getElementById("__LINK_HREF_MAP__");',
    '  let linkHrefMap = {};',
    '  if (linkMapEl && typeof linkMapEl.textContent === "string" && linkMapEl.textContent.trim()) {',
    '    try {',
    '      linkHrefMap = JSON.parse(linkMapEl.textContent) || {};',
    '    } catch {',
    '      linkHrefMap = {};',
    '    }',
    '  }',
    '  const safeText = (v) => (v == null ? "" : String(v));',
    '  const normalize = (v) => safeText(v).toLowerCase();',
    '  const getUniqueSorted = (arr) =>',
    '    Array.from(new Set(arr.filter((x) => x != null && String(x).trim() !== "").map(String))).sort();',
    '  const steps = getUniqueSorted(events.map((e) => e.stepId));',
    '  const types = getUniqueSorted(events.map((e) => e.type));',
    '  const workItems = getUniqueSorted(events.map((e) => e.workItemId));',
    '  const setOptions = (select, values, labelAll) => {',
    '    select.innerHTML = "";',
    '    const optAll = doc.createElement("option");',
    '    optAll.value = "";',
    '    optAll.textContent = labelAll;',
    '    select.appendChild(optAll);',
    '    for (const v of values) {',
    '      const opt = doc.createElement("option");',
    '      opt.value = v;',
    '      opt.textContent = v;',
    '      select.appendChild(opt);',
    '    }',
    '  };',
    '  setOptions(stepSelect, steps, "全部 step");',
    '  setOptions(typeSelect, types, "全部 type");',
    '  setOptions(workItemSelect, workItems, "全部 workItem");',
    '  const getQuery = () => new URLSearchParams(g.location ? g.location.search : "");',
    '  const applyFromUrl = () => {',
    '    const qs = getQuery();',
    '    qInput.value = safeText(qs.get("q") || "");',
    '    stepSelect.value = safeText(qs.get("step") || "");',
    '    typeSelect.value = safeText(qs.get("type") || "");',
    '    workItemSelect.value = safeText(qs.get("workItem") || "");',
    '  };',
    '  const writeUrl = () => {',
    '    if (!g.history || !g.location) return;',
    '    const qs = new URLSearchParams();',
    '    if (qInput.value.trim()) qs.set("q", qInput.value.trim());',
    '    if (stepSelect.value) qs.set("step", stepSelect.value);',
    '    if (typeSelect.value) qs.set("type", typeSelect.value);',
    '    if (workItemSelect.value) qs.set("workItem", workItemSelect.value);',
    '    const qsStr = qs.toString();',
    '    const next = qsStr ? `${g.location.pathname}?${qsStr}` : g.location.pathname;',
    '    g.history.replaceState(null, "", next);',
    '  };',
    '  const escapeHtml = (input) =>',
    '    safeText(input)',
    '      .replaceAll("&", "&amp;")',
    '      .replaceAll("<", "&lt;")',
    '      .replaceAll(">", "&gt;")',
    '      .replaceAll("\\"", "&quot;")',
    '      .replaceAll("\\\'", "&#39;");',
    '  const renderLinks = (links) => {',
    '    if (!Array.isArray(links) || links.length === 0) return "";',
    '    const html = links',
    '      .map((l) => {',
    '        const href = linkHrefMap && linkHrefMap[l] ? linkHrefMap[l] : l;',
    '        const safeHref = escapeHtml(href);',
    '        const label = escapeHtml(l);',
    '        return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">${label}</a>`;',
    '      })',
    '      .join("");',
    '    return `<div class="links">${html}</div>`;',
    '  };',
    '  const renderData = (data) => {',
    '    if (!data) return "";',
    '    let json = "";',
    '    try {',
    '      json = JSON.stringify(data, null, 2);',
    '    } catch {',
    '      json = safeText(data);',
    '    }',
    '    return `<details><summary>data</summary><pre>${escapeHtml(json)}</pre></details>`;',
    '  };',
    '  const renderList = (items) => {',
    '    listEl.innerHTML = items',
    '      .map((item) => {',
    '        const ts = escapeHtml(item.ts);',
    '        const stepId = escapeHtml(item.stepId);',
    '        const type = escapeHtml(item.type);',
    '        const summary = escapeHtml(item.summary);',
    '        const workItem = item.workItemId ? `<span class="badge">${escapeHtml(item.workItemId)}</span>` : "";',
    '        return [',
    '          `<div class="item" data-step="${stepId}" data-type="${type}">`,',
    '          `<div class="row">`,',
    '          `<span class="ts">${ts}</span>`,',
    '          `<span class="badge">${stepId}</span>`,',
    '          `<span class="type">${type}</span>`,',
    '          workItem,',
    '          `</div>`,',
    '          `<div class="summary">${summary}</div>`,',
    '          renderLinks(item.links),',
    '          renderData(item.data),',
    '          `</div>`,',
    '        ].join("");',
    '      })',
    '      .join("");',
    '  };',
    '  const applyFilters = () => {',
    '    const q = normalize(qInput.value.trim());',
    '    const step = safeText(stepSelect.value);',
    '    const type = safeText(typeSelect.value);',
    '    const workItem = safeText(workItemSelect.value);',
    '    const filtered = events.filter((e) => {',
    '      if (step && safeText(e.stepId) !== step) return false;',
    '      if (type && safeText(e.type) !== type) return false;',
    '      if (workItem && safeText(e.workItemId) !== workItem) return false;',
    '      if (!q) return true;',
    '      const hay1 = normalize(e.summary);',
    '      let hay2 = "";',
    '      try {',
    '        hay2 = normalize(JSON.stringify(e.data || {}));',
    '      } catch {',
    '        hay2 = normalize(String(e.data || ""));',
    '      }',
    '      return hay1.includes(q) || hay2.includes(q);',
    '    });',
    '    renderList(filtered);',
    '    if (metaEl) {',
    '      metaEl.textContent = `显示 ${filtered.length} / ${events.length}`;',
    '    }',
    '    writeUrl();',
    '  };',
    '  applyFromUrl();',
    '  applyFilters();',
    '  qInput.addEventListener("input", applyFilters);',
    '  stepSelect.addEventListener("change", applyFilters);',
    '  typeSelect.addEventListener("change", applyFilters);',
    '  workItemSelect.addEventListener("change", applyFilters);',
    '  clearBtn.addEventListener("click", () => {',
    '    qInput.value = "";',
    '    stepSelect.value = "";',
    '    typeSelect.value = "";',
    '    workItemSelect.value = "";',
    '    applyFilters();',
    '  });',
    '})();',
    '',
  ].join('\n');
}
