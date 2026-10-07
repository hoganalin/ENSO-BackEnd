const LOG_KEY = 'enso_inventory_logs';

export function getInventoryLogs() {
  try {
    const logs = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    return Array.isArray(logs) ? logs.filter((log) => log && typeof log === 'object') : [];
  } catch {
    return [];
  }
}

// A local audit-log failure must never turn a successful stock update into a
// retryable stock error. Preserve unreadable records instead of overwriting them.
export function appendInventoryLog(entry) {
  try {
    const logs = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    if (!Array.isArray(logs)) return false;
    localStorage.setItem(LOG_KEY, JSON.stringify([entry, ...logs].slice(0, 200)));
    return true;
  } catch {
    return false;
  }
}
