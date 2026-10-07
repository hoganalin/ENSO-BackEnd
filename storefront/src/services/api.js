import axios from 'axios';

import { readWorkspace, workspaceBase } from '../../../shared/showcase';

export const API_PATH = 'enso';
export const api = axios.create({ timeout: 15000 });
api.interceptors.request.use((config) => {
  const workspace = readWorkspace();
  if (!workspace) throw new Error('展示空間已到期，請回到展示入口建立新空間。');
  config.baseURL = workspaceBase();
  config.headers['X-Guest-Token'] = workspace.guestToken;
  return config;
});
export const adminApi = api;
export function errorMessage(error) {
  return error?.response?.data?.message || (error?.code === 'ECONNABORTED' ? '連線逾時。若剛送出訂單，請使用原內容重試，不要另建新單。' : error?.message === 'Network Error' ? '目前無法連線，請確認網路後重試。' : error?.message) || '操作失敗，請稍後重試。';
}
