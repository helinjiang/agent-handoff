(() => {
  const el = document.getElementById("__EVENTS__");
  if (!el) return;
  try {
    JSON.parse(el.textContent || "[]");
  } catch {
  }
})();
