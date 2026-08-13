/** Returns true if isoDateStr falls within the optional from/to date inputs (YYYY-MM-DD). */
function isDateInRange(isoDateStr, fromStr, toStr) {
  if (!fromStr && !toStr) return true;
  const d = new Date(isoDateStr);
  if (Number.isNaN(d.getTime())) return true;

  if (fromStr) {
    const start = new Date(fromStr + 'T00:00:00');
    if (d < start) return false;
  }
  if (toStr) {
    const end = new Date(toStr + 'T23:59:59.999');
    if (d > end) return false;
  }
  return true;
}

function bindDateRangeFilter(fromId, toId, clearId, onChange) {
  const fromEl = document.getElementById(fromId);
  const toEl = document.getElementById(toId);
  const clearEl = document.getElementById(clearId);
  const handler = () => onChange(fromEl.value, toEl.value);
  fromEl.addEventListener('change', handler);
  toEl.addEventListener('change', handler);
  clearEl.addEventListener('click', () => {
    fromEl.value = '';
    toEl.value = '';
    onChange('', '');
  });
}

function formatRangeLabel(fromStr, toStr) {
  if (!fromStr && !toStr) return '';
  if (fromStr && toStr) return `${fromStr} to ${toStr}`;
  if (fromStr) return `from ${fromStr}`;
  return `up to ${toStr}`;
}
