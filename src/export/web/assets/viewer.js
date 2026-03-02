(() => {
  const doc = globalThis.document;
  if (!doc || typeof doc.getElementById !== 'function') return;
  const el = doc.getElementById('__EVENTS__');
  if (!el) return;
  try {
    JSON.parse(el.textContent || '[]');
  } catch {
    return;
  }
})();
