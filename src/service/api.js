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

// 回應攔截器在收到後統一處理（錯誤訊息、資料格式、重新導向）。
apiAuth.interceptors.response.use(
  (response) => response,
  (error) => {
    // 🚀 展示模式：處理被中斷的請求，直接回傳 Mock 資料
    if (error.isDemoMock) {
      const mockResponse = { data: { success: true } };
      const url = error.config.url || '';

      console.log('🚀 [Demo Mode] Mocking API request:', url);

      // 產品與庫存列表 Mock
      if (url.includes('/admin/products')) {
        mockResponse.data = {
          success: true,
          products: [
            {
              id: '1',
              title: '琥珀黃昏',
              category: '線香系列',
              origin_price: 1200,
              price: 980,
              is_enabled: true,
              inventory: 15,
              imageUrl:
                'https://storage.googleapis.com/vue-course-api.appspot.com/rogan/1773124274099.png',
            },
            {
              id: '2',
              title: '晨林沈靜',
              category: '線香系列',
              origin_price: 1500,
              price: 1280,
              is_enabled: true,
              inventory: 25,
              imageUrl:
                'https://storage.googleapis.com/vue-course-api.appspot.com/rogan/1773126097700.png',
            },
            {
              id: '3',
              title: '龍血沉香',
              category: '線香系列',
              origin_price: 2200,
              price: 1980,
              is_enabled: true,
              inventory: 10,
              imageUrl:
                'https://storage.googleapis.com/vue-course-api.appspot.com/rogan/1773129441675.png',
            },
          ],
          pagination: {
            current_page: 1,
            total_pages: 1,
            has_pre: false,
            has_next: false,
          },
        };
      }
      // 訂單列表 Mock
      else if (url.includes('/admin/orders')) {
        mockResponse.data = {
          success: true,
          orders: [
            {
              id: 'ORD-20260407001',
              create_at: Math.floor(Date.now() / 1000) - 3600,
              is_paid: true,
              total: 3200,
              user: {
                name: '王大明',
                email: 'wang@example.com',
                address: '台北市信義區',
                tel: '0912345678',
              },
              products: {
                1: { qty: 1, product: { title: '琥珀黃昏', price: 980 } },
              },
            },
            {
              id: 'ORD-20260407002',
              create_at: Math.floor(Date.now() / 1000) - 86400,
              is_paid: false,
              total: 1280,
              user: {
                name: '李阿華',
                email: 'lee@example.com',
                address: '台中市西區',
                tel: '0987654321',
              },
              products: {
                2: { qty: 1, product: { title: '晨林沈靜', price: 1280 } },
              },
            },
          ],
          pagination: {
            current_page: 1,
            total_pages: 1,
            has_pre: false,
            has_next: false,
          },
        };
      }
      // 優惠券 Mock
      else if (url.includes('/admin/coupons')) {
        mockResponse.data = {
          success: true,
          coupons: [
            {
              id: 'C1',
              title: '雙11免運券',
              code: 'FREESHIP11',
              percent: 100,
              due_date: Math.floor(Date.now() / 1000) + 86400 * 30,
              is_enabled: 1,
            },
            {
              id: 'C2',
              title: '新客體驗 8 折',
              code: 'NEWBIE80',
              percent: 80,
              due_date: Math.floor(Date.now() / 1000) + 86400 * 90,
              is_enabled: 1,
            },
          ],
          pagination: {
            current_page: 1,
            total_pages: 1,
            has_pre: false,
            has_next: false,
          },
        };
      }

      // 用 Promise.resolve() 假裝正常連線回傳 (延遲300ms增加真實感)
      return new Promise((resolve) =>
        setTimeout(() => resolve(mockResponse), 300)
      );
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
