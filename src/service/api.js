import axios from 'axios';

export const API_PATH = import.meta.env.VITE_API_PATH;
export const API_BASE = import.meta.env.VITE_API_BASE;

//後台API
export const apiAuth = axios.create({
  baseURL: API_BASE,
});
// 請求攔截器
apiAuth.interceptors.request.use(
  (config) => {
    const token =
      document.cookie
        .split('; ')
        .find((row) => row.startsWith('myToken='))
        ?.split('=')[1] ||
      document.cookie
        .split('; ')
        .find((row) => row.startsWith('hexToken='))
        ?.split('=')[1];
    if (token) {
      config.headers.Authorization = `${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
// 回應攔截器在收到後統一處理（錯誤訊息、資料格式、重新導向）。
apiAuth.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response } = error;

    if (response?.status === 401) {
      const message =
        (typeof response.data === 'string' ? response.data : response.data?.message) ||
        '未授權，請重新登入';
      window.alert(message);
      window.location.hash = '#/login';
    } else if (response?.status >= 500) {
      window.alert('伺服器錯誤，請稍後再試');
    }

    return Promise.reject(error);
  }
);
