import axios from 'axios';

import {
  createCoupon,
  createProduct,
  deleteAllOrders,
  deleteCoupon,
  deleteOrder,
  deleteProduct,
  getCoupons,
  getNextUploadImage,
  getOrders,
  getProducts,
  updateCoupon,
  updateOrder,
  updateProduct,
} from './demoStore';

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

    // 🚀 展示模式：若為 demo token，強行中斷請求並導向 Mock
    if (token === 'enso-demo-token') {
      return Promise.reject({ isDemoMock: true, config });
    }

    if (token) {
      config.headers.Authorization = `${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 統一的 demo 分頁回應 wrapper
const PAGINATION = {
  current_page: 1,
  total_pages: 1,
  has_pre: false,
  has_next: false,
};

// 解析 demo 請求：path + method → 對應 demoStore 操作。
//
// 為什麼集中在 interceptor 而不是各 service：rules/api.md 規定 service 層
// 不知道 demo 存在；這裡是唯一一個合法的 demo 邏輯落點。
function resolveDemoMock(config) {
  const url = config.url || '';
  const path = url.split('?')[0];
  const method = (config.method || 'get').toLowerCase();
  const data = config.data
    ? typeof config.data === 'string'
      ? safeParse(config.data)
      : config.data
    : null;
  // HexSchool 規範請求 body 包一層 { data }，要解開
  const body = data && data.data !== undefined ? data.data : data;

  // 列表 endpoints
  if (path.endsWith('/admin/products')) {
    return { success: true, products: getProducts(), pagination: PAGINATION };
  }
  if (path.endsWith('/admin/orders')) {
    return {
      success: true,
      orders: getOrders(),
      pagination: PAGINATION,
    };
  }
  if (path.endsWith('/admin/coupons')) {
    return { success: true, coupons: getCoupons(), pagination: PAGINATION };
  }

  // 圖片上傳：round-robin 三張示範圖
  if (path.endsWith('/admin/upload')) {
    return {
      success: true,
      imageUrl: getNextUploadImage(),
      message: '[Demo Mode] 上傳模擬，正式環境會推送至 GCS',
    };
  }

  // 商品 CRUD
  if (path.endsWith('/admin/product') && method === 'post') {
    return { success: true, message: '已新增', product: createProduct(body) };
  }
  const productMatch = path.match(/\/admin\/product\/([^/]+)$/);
  if (productMatch) {
    const id = productMatch[1];
    if (method === 'put') {
      return {
        success: true,
        message: '已更新',
        product: updateProduct(id, body),
      };
    }
    if (method === 'delete') {
      deleteProduct(id);
      return { success: true, message: '已刪除' };
    }
  }

  // 訂單 CRUD（HexSchool 沒提供 create order，只有 update / delete / delete-all）
  if (path.endsWith('/admin/orders/all') && method === 'delete') {
    deleteAllOrders();
    return { success: true, message: '已清空' };
  }
  const orderMatch = path.match(/\/admin\/order\/([^/]+)$/);
  if (orderMatch) {
    const id = orderMatch[1];
    if (method === 'put') {
      return { success: true, message: '已更新', order: updateOrder(id, body) };
    }
    if (method === 'delete') {
      deleteOrder(id);
      return { success: true, message: '已刪除' };
    }
  }

  // 優惠券 CRUD
  if (path.endsWith('/admin/coupon') && method === 'post') {
    return { success: true, message: '已新增', coupon: createCoupon(body) };
  }
  const couponMatch = path.match(/\/admin\/coupon\/([^/]+)$/);
  if (couponMatch) {
    const id = couponMatch[1];
    if (method === 'put') {
      return {
        success: true,
        message: '已更新',
        coupon: updateCoupon(id, body),
      };
    }
    if (method === 'delete') {
      deleteCoupon(id);
      return { success: true, message: '已刪除' };
    }
  }

  // 預設：回 success（保留舊行為，避免未列舉的 endpoint 直接炸）
  return { success: true };
}

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

// 回應攔截器在收到後統一處理（錯誤訊息、資料格式、重新導向）。
apiAuth.interceptors.response.use(
  (response) => response,
  (error) => {
    // 🚀 展示模式：處理被中斷的請求，直接回傳 Mock 資料
    if (error.isDemoMock) {
      const url = error.config.url || '';
      console.log(
        '🚀 [Demo Mode] Mocking API request:',
        error.config.method?.toUpperCase(),
        url
      );

      const data = resolveDemoMock(error.config);

      // 用 Promise.resolve() 假裝正常連線回傳 (延遲 300ms 增加真實感)
      return new Promise((resolve) => setTimeout(() => resolve({ data }), 300));
    }

    const { response } = error;

    if (response?.status === 401) {
      const message =
        (typeof response.data === 'string'
          ? response.data
          : response.data?.message) || '未授權，請重新登入';
      window.alert(message);
      window.location.hash = '#/login';
    } else if (response?.status >= 500) {
      window.alert('伺服器錯誤，請稍後再試');
    }

    return Promise.reject(error);
  }
);
