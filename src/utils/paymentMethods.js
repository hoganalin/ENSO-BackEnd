/**
 * 後台用的付款方式對照表。
 *
 * 前台 /sessions/vibrant-intelligent-einstein/enso-work/src/constants/paymentMethods.ts
 * 是 source of truth；這裡只保留顯示用到的欄位，同步更新即可。
 */

export const PAYMENT_CATEGORIES = {
  card: { label: '信用卡', colorClass: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  wallet: { label: '行動支付', colorClass: 'bg-purple-100 text-purple-700 border-purple-200' },
  transfer: { label: '轉帳', colorClass: 'bg-sky-100 text-sky-700 border-sky-200' },
  cvs: { label: '超商', colorClass: 'bg-amber-100 text-amber-700 border-amber-200' },
  qr: { label: 'QR Code', colorClass: 'bg-rose-100 text-rose-700 border-rose-200' },
};

export const PAYMENT_METHODS = {
  credit_onetime: { label: '信用卡一次', shortLabel: '信用卡', category: 'card', icon: 'bi-credit-card-2-front' },
  credit_installment_3: { label: '信用卡分期 3 期', shortLabel: '分期 3 期', category: 'card', icon: 'bi-credit-card' },
  credit_installment_6: { label: '信用卡分期 6 期', shortLabel: '分期 6 期', category: 'card', icon: 'bi-credit-card' },
  credit_installment_12: { label: '信用卡分期 12 期', shortLabel: '分期 12 期', category: 'card', icon: 'bi-credit-card' },
  applepay: { label: 'Apple Pay', shortLabel: 'Apple Pay', category: 'wallet', icon: 'bi-apple' },
  googlepay: { label: 'Google Pay', shortLabel: 'Google Pay', category: 'wallet', icon: 'bi-google' },
  linepay: { label: 'LINE Pay', shortLabel: 'LINE Pay', category: 'wallet', icon: 'bi-line' },
  atm: { label: 'ATM 虛擬帳號', shortLabel: 'ATM', category: 'transfer', icon: 'bi-bank' },
  webatm: { label: '網路 ATM', shortLabel: 'WebATM', category: 'transfer', icon: 'bi-laptop' },
  cvs: { label: '超商代碼繳費', shortLabel: 'CVS 代碼', category: 'cvs', icon: 'bi-shop' },
  barcode: { label: '超商條碼繳費', shortLabel: '條碼', category: 'cvs', icon: 'bi-upc-scan' },
  twqr: { label: '台灣 Pay QR', shortLabel: '台灣 Pay', category: 'qr', icon: 'bi-qr-code' },
};

/**
 * 從 order.user 中抽出付款方式 metadata。
 * 支援：
 *   - 新格式：order.user.paid_method === 'applepay'
 *   - 舊訂單 / 非 mock 訂單：回傳 null（UI 顯示「—」）
 */
export function getOrderPaymentMethod(order) {
  const id = order?.user?.paid_method;
  if (!id || !PAYMENT_METHODS[id]) return null;
  return { id, ...PAYMENT_METHODS[id] };
}

/** 取得付款方式的 category 對應顏色。 */
export function getCategoryMeta(method) {
  if (!method) return null;
  return PAYMENT_CATEGORIES[method.category] ?? null;
}
