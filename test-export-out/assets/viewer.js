(() => {
  const g = globalThis;
  const doc = g.document;
  if (!doc || typeof doc.getElementById !== "function") return;
  const el = doc.getElementById("__EVENTS__");
  if (!el) return;
  const qInput = doc.getElementById("filter-q");
  const stepSelect = doc.getElementById("filter-step");
  const typeSelect = doc.getElementById("filter-type");
  const workItemSelect = doc.getElementById("filter-workItem");
  const clearBtn = doc.getElementById("filter-clear");
  const listEl = doc.getElementById("timeline-list");
  const metaEl = doc.getElementById("filters-meta");
  const HTMLInput = g.HTMLInputElement;
  const HTMLSelect = g.HTMLSelectElement;
  const HTMLButton = g.HTMLButtonElement;
  const HTMLElementCtor = g.HTMLElement;
  if (!HTMLInput || !HTMLSelect || !HTMLButton || !HTMLElementCtor) return;
  if (
    !(qInput instanceof HTMLInput) ||
    !(stepSelect instanceof HTMLSelect) ||
    !(typeSelect instanceof HTMLSelect) ||
    !(workItemSelect instanceof HTMLSelect) ||
    !(clearBtn instanceof HTMLButton) ||
    !(listEl instanceof HTMLElementCtor)
  ) {
    return;
  }
  let events;
  try {
    events = JSON.parse(el.textContent || "[]");
  } catch {
    return;
  }
  const linkMapEl = doc.getElementById("__LINK_HREF_MAP__");
  let linkHrefMap = {};
  if (linkMapEl && typeof linkMapEl.textContent === "string" && linkMapEl.textContent.trim()) {
    try {
      linkHrefMap = JSON.parse(linkMapEl.textContent) || {};
    } catch {
      linkHrefMap = {};
    }
  }
  const safeText = (v) => (v == null ? "" : String(v));
  const normalize = (v) => safeText(v).toLowerCase();
  const getUniqueSorted = (arr) =>
    Array.from(new Set(arr.filter((x) => x != null && String(x).trim() !== "").map(String))).sort();
  const steps = getUniqueSorted(events.map((e) => e.stepId));
  const types = getUniqueSorted(events.map((e) => e.type));
  const workItems = getUniqueSorted(events.map((e) => e.workItemId));
  const setOptions = (select, values, labelAll) => {
    select.innerHTML = "";
    const optAll = doc.createElement("option");
    optAll.value = "";
    optAll.textContent = labelAll;
    select.appendChild(optAll);
    for (const v of values) {
      const opt = doc.createElement("option");
      opt.value = v;
      opt.textContent = v;
      select.appendChild(opt);
    }
  };
  setOptions(stepSelect, steps, "全部 step");
  setOptions(typeSelect, types, "全部 type");
  setOptions(workItemSelect, workItems, "全部 workItem");
  const getQuery = () => new URLSearchParams(g.location ? g.location.search : "");
  const applyFromUrl = () => {
    const qs = getQuery();
    qInput.value = safeText(qs.get("q") || "");
    stepSelect.value = safeText(qs.get("step") || "");
    typeSelect.value = safeText(qs.get("type") || "");
    workItemSelect.value = safeText(qs.get("workItem") || "");
  };
  const writeUrl = () => {
    if (!g.history || !g.location) return;
    const qs = new URLSearchParams();
    if (qInput.value.trim()) qs.set("q", qInput.value.trim());
    if (stepSelect.value) qs.set("step", stepSelect.value);
    if (typeSelect.value) qs.set("type", typeSelect.value);
    if (workItemSelect.value) qs.set("workItem", workItemSelect.value);
    const qsStr = qs.toString();
    const next = qsStr ? `${g.location.pathname}?${qsStr}` : g.location.pathname;
    g.history.replaceState(null, "", next);
  };
  const escapeHtml = (input) =>
    safeText(input)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("\'", "&#39;");
  const renderLinks = (links) => {
    if (!Array.isArray(links) || links.length === 0) return "";
    const html = links
      .map((l) => {
        const href = linkHrefMap && linkHrefMap[l] ? linkHrefMap[l] : l;
        const safeHref = escapeHtml(href);
        const label = escapeHtml(l);
        return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">${label}</a>`;
      })
      .join("");
    return `<div class="links">${html}</div>`;
  };
  const renderData = (data) => {
    if (!data) return "";
    let json = "";
    try {
      json = JSON.stringify(data, null, 2);
    } catch {
      json = safeText(data);
    }
    return `<details><summary>data</summary><pre>${escapeHtml(json)}</pre></details>`;
  };
  const renderList = (items) => {
    listEl.innerHTML = items
      .map((item) => {
        const ts = escapeHtml(item.ts);
        const stepId = escapeHtml(item.stepId);
        const type = escapeHtml(item.type);
        const summary = escapeHtml(item.summary);
        const workItem = item.workItemId ? `<span class="badge">${escapeHtml(item.workItemId)}</span>` : "";
        return [
          `<div class="item" data-step="${stepId}" data-type="${type}">`,
          `<div class="row">`,
          `<span class="ts">${ts}</span>`,
          `<span class="badge">${stepId}</span>`,
          `<span class="type">${type}</span>`,
          workItem,
          `</div>`,
          `<div class="summary">${summary}</div>`,
          renderLinks(item.links),
          renderData(item.data),
          `</div>`,
        ].join("");
      })
      .join("");
  };
  const applyFilters = () => {
    const q = normalize(qInput.value.trim());
    const step = safeText(stepSelect.value);
    const type = safeText(typeSelect.value);
    const workItem = safeText(workItemSelect.value);
    const filtered = events.filter((e) => {
      if (step && safeText(e.stepId) !== step) return false;
      if (type && safeText(e.type) !== type) return false;
      if (workItem && safeText(e.workItemId) !== workItem) return false;
      if (!q) return true;
      const hay1 = normalize(e.summary);
      let hay2 = "";
      try {
        hay2 = normalize(JSON.stringify(e.data || {}));
      } catch {
        hay2 = normalize(String(e.data || ""));
      }
      return hay1.includes(q) || hay2.includes(q);
    });
    renderList(filtered);
    if (metaEl) {
      metaEl.textContent = `显示 ${filtered.length} / ${events.length}`;
    }
    writeUrl();
  };
  applyFromUrl();
  applyFilters();
  qInput.addEventListener("input", applyFilters);
  stepSelect.addEventListener("change", applyFilters);
  typeSelect.addEventListener("change", applyFilters);
  workItemSelect.addEventListener("change", applyFilters);
  clearBtn.addEventListener("click", () => {
    qInput.value = "";
    stepSelect.value = "";
    typeSelect.value = "";
    workItemSelect.value = "";
    applyFilters();
  });
})();
