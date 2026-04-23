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
      //
      // Demo Mode 的訂單 fixture。包含 10 筆分散在近 14 天、涵蓋所有 12 種
      // 綠界付款方式的訂單，讓 AdminOrders 的付款方式欄位 + PaymentLedger
      // 的 pie chart / line chart / 最近交易明細都有資料可看。
      //
      // 每筆訂單都帶 user.paid_method / paid_method_label / paid_category /
      // merchant_trade_no / check_mac_value / is_paid_mock，mirror 前台
      // Checkout.tsx 塞進 order.user 的 schema。
      else if (url.includes('/admin/orders')) {
        const now = Math.floor(Date.now() / 1000);
        const D = 86400;
        const makeMtn = (seed) =>
          `ECPAY${seed.toString(36).toUpperCase().padStart(6, '0')}`;
        const mockOrders = [
          {
            id: 'ORD-20260423-A1',
            create_at: now - 1800,
            is_paid: true,
            total: 1360,
            user: {
              name: '王大明', email: 'wang@example.com', address: '台北市信義區松高路 1 號', tel: '0912345678',
              paid_method: 'applepay', paid_method_label: 'Apple Pay', paid_category: 'wallet',
              merchant_trade_no: makeMtn(117461), check_mac_value: 'A9F3E7B1D8C2467E0F4A9B5D2C7E1F3A6B8D0E4F2A5C7B9D1E3F6A8B0C2D4E6F',
              is_paid_mock: true,
            },
            message: '[ECPay 模擬 Apple Pay｜' + makeMtn(117461) + ']',
            products: { 1: { qty: 2, product: { title: '琥珀黃昏', price: 520 } }, 2: { qty: 1, product: { title: '晨林沈靜', price: 480 } } },
          },
          {
            id: 'ORD-20260423-B2',
            create_at: now - 5400,
            is_paid: true,
            total: 2160,
            user: {
              name: '李思敏', email: 'lee.sm@example.com', address: '新北市板橋區文化路 88 號', tel: '0923456789',
              paid_method: 'credit_onetime', paid_method_label: '信用卡一次付清', paid_category: 'card',
              merchant_trade_no: makeMtn(242891), check_mac_value: 'B7D2E9A1F8C4387E0A3B6D1C5E8F2A4B7D9E1C3F5A8B0D2E4F6A9C1B3D5E7F9A',
              is_paid_mock: true,
            },
            message: '[ECPay 模擬 信用卡一次付清｜' + makeMtn(242891) + '] 晚上可以送',
            products: { 1: { qty: 1, product: { title: '琥珀黃昏', price: 520 } }, 3: { qty: 2, product: { title: '龍血沉香', price: 680 } }, 4: { qty: 1, product: { title: '白鼠尾草淨化', price: 280 } } },
          },
          {
            id: 'ORD-20260422-C3',
            create_at: now - 1 * D - 3600,
            is_paid: true,
            total: 3600,
            user: {
              name: '張懷瑾', email: 'chang.hj@example.com', address: '台中市西屯區台灣大道 1000 號', tel: '0934567890',
              paid_method: 'credit_installment_6', paid_method_label: '信用卡分期 6 期', paid_category: 'card',
              merchant_trade_no: makeMtn(358274), check_mac_value: 'C5E1D9B3F7A2468D0E4B8C2F5A7D9E1B3F5A7C9D1E3F5B7C9D1E3F5A7B9D1E3F',
              is_paid_mock: true,
            },
            message: '[ECPay 模擬 信用卡分期 6 期｜' + makeMtn(358274) + ']',
            products: { 3: { qty: 5, product: { title: '龍血沉香', price: 680 } }, 5: { qty: 1, product: { title: '茉莉月夜', price: 200 } } },
          },
          {
            id: 'ORD-20260422-D4',
            create_at: now - 1 * D - 18000,
            is_paid: false,
            total: 1960,
            user: {
              name: '陳宥之', email: 'chen.yz@example.com', address: '高雄市前鎮區中華五路 789 號', tel: '0945678901',
              paid_method: 'atm', paid_method_label: 'ATM 虛擬帳號', paid_category: 'transfer',
              merchant_trade_no: makeMtn(481029), check_mac_value: 'D8F2A6B4E1C3759F0A3B6D1C5E8F2A4B7D9E1C3F5A8B0D2E4F6A9C1B3D5E7F9B',
              is_paid_mock: true,
            },
            message: '[ECPay 模擬 ATM 虛擬帳號｜' + makeMtn(481029) + ']',
            products: { 2: { qty: 3, product: { title: '晨林沈靜', price: 480 } }, 6: { qty: 1, product: { title: '春分雨露', price: 520 } } },
          },
          {
            id: 'ORD-20260421-E5',
            create_at: now - 2 * D,
            is_paid: true,
            total: 840,
            user: {
              name: '林佳穎', email: 'lin.jy@example.com', address: '台南市東區裕農路 250 號', tel: '0956789012',
              paid_method: 'linepay', paid_method_label: 'LINE Pay', paid_category: 'wallet',
              merchant_trade_no: makeMtn(512937), check_mac_value: 'E1A4C8B5F3D7264E0A3B6D1C5E8F2A4B7D9E1C3F5A8B0D2E4F6A9C1B3D5E7F9C',
              is_paid_mock: true,
            },
            message: '[ECPay 模擬 LINE Pay｜' + makeMtn(512937) + ']',
            products: { 5: { qty: 4, product: { title: '茉莉月夜', price: 210 } } },
          },
          {
            id: 'ORD-20260420-F6',
            create_at: now - 3 * D,
            is_paid: false,
            total: 1520,
            user: {
              name: '黃建宏', email: 'huang.jh@example.com', address: '桃園市中壢區中央西路 66 號', tel: '0967890123',
              paid_method: 'cvs', paid_method_label: '超商代碼繳費', paid_category: 'cvs',
              merchant_trade_no: makeMtn(643852), check_mac_value: 'F3B5D9C7A2E4168F0A3B6D1C5E8F2A4B7D9E1C3F5A8B0D2E4F6A9C1B3D5E7F9D',
              is_paid_mock: true,
            },
            message: '[ECPay 模擬 超商代碼繳費｜' + makeMtn(643852) + ']',
            products: { 4: { qty: 4, product: { title: '白鼠尾草淨化', price: 380 } } },
          },
          {
            id: 'ORD-20260419-G7',
            create_at: now - 4 * D,
            is_paid: true,
            total: 2280,
            user: {
              name: '蘇文琪', email: 'su.wc@example.com', address: '台北市大安區忠孝東路 555 號', tel: '0978901234',
              paid_method: 'googlepay', paid_method_label: 'Google Pay', paid_category: 'wallet',
              merchant_trade_no: makeMtn(761904), check_mac_value: 'A7C3E1B9F5D6273E0A3B6D1C5E8F2A4B7D9E1C3F5A8B0D2E4F6A9C1B3D5E7F9E',
              is_paid_mock: true,
            },
            message: '[ECPay 模擬 Google Pay｜' + makeMtn(761904) + ']',
            products: { 1: { qty: 1, product: { title: '琥珀黃昏', price: 520 } }, 3: { qty: 2, product: { title: '龍血沉香', price: 680 } }, 6: { qty: 1, product: { title: '春分雨露', price: 400 } } },
          },
          {
            id: 'ORD-20260418-H8',
            create_at: now - 5 * D,
            is_paid: true,
            total: 4080,
            user: {
              name: '吳雅涵', email: 'wu.yh@example.com', address: '新竹市東區光復路 200 號', tel: '0989012345',
              paid_method: 'credit_installment_12', paid_method_label: '信用卡分期 12 期', paid_category: 'card',
              merchant_trade_no: makeMtn(889217), check_mac_value: 'B9D5F1C7A3E8462F0A3B6D1C5E8F2A4B7D9E1C3F5A8B0D2E4F6A9C1B3D5E7F9F',
              is_paid_mock: true,
            },
            message: '[ECPay 模擬 信用卡分期 12 期｜' + makeMtn(889217) + ']',
            products: { 3: { qty: 6, product: { title: '龍血沉香', price: 680 } } },
          },
          {
            id: 'ORD-20260416-I9',
            create_at: now - 7 * D,
            is_paid: false,
            total: 680,
            user: {
              name: '周昱承', email: 'chou.yc@example.com', address: '宜蘭縣羅東鎮中正路 120 號', tel: '0912340987',
              paid_method: 'barcode', paid_method_label: '超商條碼繳費', paid_category: 'cvs',
              merchant_trade_no: makeMtn(913486), check_mac_value: 'C1E7B3F9A5D4587E0A3B6D1C5E8F2A4B7D9E1C3F5A8B0D2E4F6A9C1B3D5E7F9A',
              is_paid_mock: true,
            },
            message: '[ECPay 模擬 超商條碼繳費｜' + makeMtn(913486) + ']',
            products: { 3: { qty: 1, product: { title: '龍血沉香', price: 680 } } },
          },
          {
            id: 'ORD-20260415-J10',
            create_at: now - 8 * D,
            is_paid: true,
            total: 1200,
            user: {
              name: '劉天祐', email: 'liu.ty@example.com', address: '嘉義市西區文化路 88 號', tel: '0923459876',
              paid_method: 'twqr', paid_method_label: '台灣 Pay QR Code', paid_category: 'qr',
              merchant_trade_no: makeMtn(108562), check_mac_value: 'D3F9C5B1A7E2698F0A3B6D1C5E8F2A4B7D9E1C3F5A8B0D2E4F6A9C1B3D5E7F9B',
              is_paid_mock: true,
            },
            message: '[ECPay 模擬 台灣 Pay QR Code｜' + makeMtn(108562) + ']',
            products: { 4: { qty: 2, product: { title: '白鼠尾草淨化', price: 280 } }, 5: { qty: 3, product: { title: '茉莉月夜', price: 213 } } },
          },
          {
            id: 'ORD-20260412-K11',
            create_at: now - 11 * D,
            is_paid: true,
            total: 960,
            user: {
              name: '鄭美惠', email: 'cheng.mh@example.com', address: '基隆市仁愛區愛一路 50 號', tel: '0934568765',
              paid_method: 'webatm', paid_method_label: '網路 ATM', paid_category: 'transfer',
              merchant_trade_no: makeMtn(217934), check_mac_value: 'E5A1D7C3B9F8604E0A3B6D1C5E8F2A4B7D9E1C3F5A8B0D2E4F6A9C1B3D5E7F9C',
              is_paid_mock: true,
            },
            message: '[ECPay 模擬 網路 ATM｜' + makeMtn(217934) + ']',
            products: { 2: { qty: 2, product: { title: '晨林沈靜', price: 480 } } },
          },
          {
            id: 'ORD-20260411-L12',
            create_at: now - 12 * D,
            is_paid: true,
            total: 1560,
            user: {
              name: '許家瑋', email: 'hsu.jw@example.com', address: '台北市內湖區瑞光路 399 號', tel: '0945670123',
              paid_method: 'credit_installment_3', paid_method_label: '信用卡分期 3 期', paid_category: 'card',
              merchant_trade_no: makeMtn(325186), check_mac_value: 'F7B3E9D5C1A6705F0A3B6D1C5E8F2A4B7D9E1C3F5A8B0D2E4F6A9C1B3D5E7F9D',
              is_paid_mock: true,
            },
            message: '[ECPay 模擬 信用卡分期 3 期｜' + makeMtn(325186) + ']',
            products: { 1: { qty: 3, product: { title: '琥珀黃昏', price: 520 } } },
          },
        ];
        mockResponse.data = {
          success: true,
          orders: mockOrders,
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
