const key = 'enso.interview.workspace.v1';
export function readWorkspace() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) || 'null');
    return saved && /^[a-f0-9-]{36}$/.test(saved.id) && saved.expires > Date.now() ? saved : null;
  } catch { return null; }
}
export function workspaceBase() { return `/demo-api/${readWorkspace()?.id || 'expired'}`; }
export async function startWorkspace() {
  sessionStorage.setItem('enso.storage-check', '1');
  sessionStorage.removeItem('enso.storage-check');
  const response = await fetch('/demo-api/session', { method: 'POST' });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.message || '無法建立展示空間，請稍後重試。');
  sessionStorage.setItem(key, JSON.stringify(data));
  return data;
}
export function clearWorkspace() {
  for (const name of Object.keys(sessionStorage)) {
    if (name === key || name.startsWith('enso.checkout.') || name.startsWith('enso.receipt.')) sessionStorage.removeItem(name);
  }
}
