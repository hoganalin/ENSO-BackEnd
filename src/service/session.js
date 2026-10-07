import { readWorkspace, workspaceBase } from '../../shared/showcase.js';

export const AUTH_TIMEOUT = 15000;
export const isShowcase = import.meta.env?.VITE_SHOWCASE === 'true';
export function getApiBase() { return isShowcase ? workspaceBase() : import.meta.env?.VITE_API_BASE; }

export function readSessionToken(cookie = document.cookie) {
  if (isShowcase && arguments.length === 0) return readWorkspace()?.adminToken || '';
  const cookies = cookie.split(';').map((part) => part.trim());
  for (const name of ['myToken', 'hexToken']) {
    const value = cookies.find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
    if (value) return value;
  }
  return '';
}

export function clearSessionCookies() {
  for (const name of ['myToken', 'hexToken']) {
    document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
  }
}

export function createSessionCookie(data, remember, now = Date.now()) {
  if (data?.success === false || typeof data?.token !== 'string' || !/^[A-Za-z0-9._~-]+$/.test(data.token)) {
    throw new Error('登入回應不完整或驗證未通過，請重新登入。');
  }
  let expires = '';
  if (remember) {
    const raw = Number(data.expired);
    const date = new Date(raw < 1e12 ? raw * 1000 : raw);
    if (!Number.isFinite(date.getTime()) || date.getTime() <= now) {
      throw new Error('登入有效期限無效，請重新登入。');
    }
    expires = `expires=${date.toUTCString()};`;
  }
  return `myToken=${data.token};${expires}path=/;SameSite=Lax`;
}

export function authenticationErrorMessage(error) {
  const status = error?.response?.status;
  if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') return '連線逾時，請稍後重試。';
  if (!error?.response && error?.isAxiosError) return '目前無法連線，請檢查網路後重試。';
  if (status === 429) return '嘗試次數過多，請稍後再試。';
  if (status >= 500) return '登入服務暫時無法使用，請稍後再試。';
  const message = error?.response?.data?.message;
  return typeof message === 'string' ? message : '帳號或密碼錯誤，或帳號沒有管理權限，請確認後重試。';
}
