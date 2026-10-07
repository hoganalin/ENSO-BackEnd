import { readWorkspace } from '../../../shared/showcase';
const storageKey = () => `enso.checkout.${readWorkspace()?.id}`;
export function loadAttempt() {
  try { return JSON.parse(sessionStorage.getItem(storageKey()) || 'null'); } catch { return null; }
}
export function saveAttempt(data) {
  const old = loadAttempt();
  if (old) return old;
  const value = { key: crypto.randomUUID(), data };
  sessionStorage.setItem(storageKey(), JSON.stringify(value));
  return value;
}
export function clearAttempt() { sessionStorage.removeItem(storageKey()); }
export function saveReceipt(receipt) {
  sessionStorage.setItem(`enso.receipt.${receipt.orderId}`, JSON.stringify(receipt));
}
export function readReceipt(id) {
  try { return JSON.parse(sessionStorage.getItem(`enso.receipt.${id}`) || 'null'); } catch { return null; }
}
