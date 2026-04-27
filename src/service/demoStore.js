// Demo Store — 集中管理 demo 模式的 fixture + localStorage 持久化。
//
// 為什麼存 localStorage：
// 原本 demo CRUD 都是「假成功」(return {success:true}) refresh 後資料還原，
// 對示範流程體感破壞很大。改成 localStorage 之後，新增/編輯/刪除會真正反映在
// 列表上，跟正式環境體感一致；登出時 demoStore.reset() 一鍵清回 seed。

const KEYS = {
  products: 'enso_demo_products',
  orders: 'enso_demo_orders',
  coupons: 'enso_demo_coupons',
  uploadIdx: 'enso_demo_upload_idx',
};

const D = 86400; // seconds in a day
const M = D * 30; // 假設一個月 30 天

// 圖片 URL pool — upload mock 輪流回，避免上傳兩張看起來都一樣
const UPLOAD_IMAGES = [
  'https://storage.googleapis.com/vue-course-api.appspot.com/rogan/1773124274099.png',
  'https://storage.googleapis.com/vue-course-api.appspot.com/rogan/1773126097700.png',
  'https://storage.googleapis.com/vue-course-api.appspot.com/rogan/1773129441675.png',
];

// ===== Seeds =====

// 6 個商品（對齊訂單裡用到的 product id 1~6）
const SEED_PRODUCTS = [
  {
    id: '1',
    title: '琥珀黃昏',
    category: '線香系列',
    origin_price: 1200,
    price: 980,
    is_enabled: 1,
    inventory: 15,
    description: '琥珀與焚木交織的醇厚午後，適合冥想與閱讀時光。',
    content: '原料：印尼紋甲沉香 / 越南琥珀 / 雪松木',
    imageUrl: UPLOAD_IMAGES[0],
  },
  {
    id: '2',
    title: '晨林沈靜',
    category: '線香系列',
    origin_price: 1500,
    price: 1280,
    is_enabled: 1,
    inventory: 25,
    description: '檜木與青苔氣息，模擬清晨山林的濕潤呼吸。',
    content: '原料：台灣紅檜 / 日本青苔 / 雪松',
    imageUrl: UPLOAD_IMAGES[1],
  },
  {
    id: '3',
    title: '龍血沉香',
    category: '線香系列',
    origin_price: 2200,
    price: 1980,
    is_enabled: 1,
    inventory: 10,
    description: '龍血樹脂與老山沉香的濃郁基底，奢華暗夜配方。',
    content: '原料：印尼龍血樹脂 / 老山沉香 / 安息香',
    imageUrl: UPLOAD_IMAGES[2],
  },
  {
    id: '4',
    title: '白鼠尾草淨化',
    category: '草本系列',
    origin_price: 380,
    price: 280,
    is_enabled: 1,
    inventory: 32,
    description: '加州白鼠尾草，淨化空間的經典儀式之選。',
    content: '原料：加州野生鼠尾草，無添加。',
    imageUrl: UPLOAD_IMAGES[0],
  },
  {
    id: '5',
    title: '茉莉月夜',
    category: '線香系列',
    origin_price: 280,
    price: 200,
    is_enabled: 1,
    inventory: 18,
    description: '夜晚綻放的茉莉，柔和花調帶一絲蜜糖尾韻。',
    content: '原料：印度茉莉 / 香草豆 / 檀木基底',
    imageUrl: UPLOAD_IMAGES[1],
  },
  {
    id: '6',
    title: '春分雨露',
    category: '線香系列',
    origin_price: 600,
    price: 520,
    is_enabled: 1,
    inventory: 5, // 故意低庫存，讓 AdminInventory low-stock 提示有東西可看
    description: '柔嫩花瓣與雨後土壤的清新氣味，春日限定。',
    content: '原料：玫瑰露 / 廣藿香 / 矮松木',
    imageUrl: UPLOAD_IMAGES[2],
  },
];

// 12 筆訂單，散在 6 個月內，涵蓋所有 12 種綠界付款方式
function buildSeedOrders() {
  const now = Math.floor(Date.now() / 1000);
  const makeMtn = (seed) =>
    `ECPAY${seed.toString(36).toUpperCase().padStart(6, '0')}`;
  const cmv = (s) =>
    `${s}${'0123456789ABCDEF'.repeat(4)}`.slice(0, 64).toUpperCase();

  // [ daysAgo, paid_method, label, category, paid, total, products, name, area ]
  const rows = [
    [
      0.02,
      'applepay',
      'Apple Pay',
      'wallet',
      true,
      1360,
      { 1: [2, 520], 2: [1, 480] },
      '王大明',
      '台北市信義區松高路 1 號',
    ],
    [
      0.06,
      'credit_onetime',
      '信用卡一次付清',
      'card',
      true,
      2160,
      { 1: [1, 520], 3: [2, 680], 4: [1, 280] },
      '李思敏',
      '新北市板橋區文化路 88 號',
    ],
    [
      4,
      'credit_installment_6',
      '信用卡分期 6 期',
      'card',
      true,
      3600,
      { 3: [5, 680], 5: [1, 200] },
      '張懷瑾',
      '台中市西屯區台灣大道 1000 號',
    ],
    [
      9,
      'atm',
      'ATM 虛擬帳號',
      'transfer',
      false,
      1960,
      { 2: [3, 480], 6: [1, 520] },
      '陳宥之',
      '高雄市前鎮區中華五路 789 號',
    ],
    [
      16,
      'linepay',
      'LINE Pay',
      'wallet',
      true,
      840,
      { 5: [4, 210] },
      '林佳穎',
      '台南市東區裕農路 250 號',
    ],
    [
      22,
      'cvs',
      '超商代碼繳費',
      'cvs',
      false,
      1520,
      { 4: [4, 380] },
      '黃建宏',
      '桃園市中壢區中央西路 66 號',
    ],
    [
      38,
      'googlepay',
      'Google Pay',
      'wallet',
      true,
      2280,
      { 1: [1, 520], 3: [2, 680], 6: [1, 400] },
      '蘇文琪',
      '台北市大安區忠孝東路 555 號',
    ],
    [
      54,
      'credit_installment_12',
      '信用卡分期 12 期',
      'card',
      true,
      4080,
      { 3: [6, 680] },
      '吳雅涵',
      '新竹市東區光復路 200 號',
    ],
    [
      82,
      'barcode',
      '超商條碼繳費',
      'cvs',
      false,
      680,
      { 3: [1, 680] },
      '周昱承',
      '宜蘭縣羅東鎮中正路 120 號',
    ],
    [
      108,
      'twqr',
      '台灣 Pay QR Code',
      'qr',
      true,
      1200,
      { 4: [2, 280], 5: [3, 213] },
      '劉天祐',
      '嘉義市西區文化路 88 號',
    ],
    [
      142,
      'webatm',
      '網路 ATM',
      'transfer',
      true,
      960,
      { 2: [2, 480] },
      '鄭美惠',
      '基隆市仁愛區愛一路 50 號',
    ],
    [
      170,
      'credit_installment_3',
      '信用卡分期 3 期',
      'card',
      true,
      1560,
      { 1: [3, 520] },
      '許家瑋',
      '台北市內湖區瑞光路 399 號',
    ],
  ];

  const titleById = SEED_PRODUCTS.reduce((acc, p) => {
    acc[p.id] = p.title;
    return acc;
  }, {});

  return rows.map(
    ([daysAgo, method, label, cat, paid, total, items, name, addr], idx) => {
      const seed = 100000 + idx * 13573;
      const products = {};
      for (const [pid, [qty, price]] of Object.entries(items)) {
        products[pid] = {
          qty,
          product: { title: titleById[pid] || `商品 ${pid}`, price },
        };
      }
      return {
        id: `ORD-DEMO-${String(idx + 1).padStart(2, '0')}`,
        create_at: now - Math.round(daysAgo * D),
        is_paid: paid,
        total,
        user: {
          name,
          email: `${name.toLowerCase().replace(/[^a-z]/g, '')}@example.com`,
          address: addr,
          tel: `09${String(10000000 + idx * 1234567).slice(0, 8)}`,
          paid_method: method,
          paid_method_label: label,
          paid_category: cat,
          merchant_trade_no: makeMtn(seed),
          check_mac_value: cmv(method.slice(0, 4).toUpperCase()),
          is_paid_mock: true,
        },
        message: `[ECPay 模擬 ${label}｜${makeMtn(seed)}]`,
        products,
      };
    }
  );
}

const SEED_COUPONS = [
  {
    id: 'C1',
    title: '雙11免運券',
    code: 'FREESHIP11',
    percent: 100,
    due_date: Math.floor(Date.now() / 1000) + D * 30,
    is_enabled: 1,
  },
  {
    id: 'C2',
    title: '新客體驗 8 折',
    code: 'NEWBIE80',
    percent: 80,
    due_date: Math.floor(Date.now() / 1000) + D * 90,
    is_enabled: 1,
  },
];

// ===== localStorage helpers =====

function read(key, seed) {
  try {
    const raw =
      typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    if (raw) return JSON.parse(raw);
  } catch {
    /* fall through to seed */
  }
  const fresh = JSON.parse(JSON.stringify(seed));
  try {
    localStorage.setItem(key, JSON.stringify(fresh));
  } catch {
    /* ignore quota / SSR */
  }
  return fresh;
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

// ===== Public API =====

export function getProducts() {
  return read(KEYS.products, SEED_PRODUCTS);
}

export function createProduct(data) {
  const list = getProducts();
  const id = `P-${Date.now().toString(36)}`;
  const item = { id, ...data };
  list.push(item);
  write(KEYS.products, list);
  return item;
}

export function updateProduct(id, data) {
  const list = getProducts();
  const idx = list.findIndex((p) => String(p.id) === String(id));
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...data, id: list[idx].id };
  write(KEYS.products, list);
  return list[idx];
}

export function deleteProduct(id) {
  const list = getProducts().filter((p) => String(p.id) !== String(id));
  write(KEYS.products, list);
  return true;
}

export function getOrders() {
  return read(KEYS.orders, buildSeedOrders());
}

export function updateOrder(id, data) {
  const list = getOrders();
  const idx = list.findIndex((o) => String(o.id) === String(id));
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...data, id: list[idx].id };
  write(KEYS.orders, list);
  return list[idx];
}

export function deleteOrder(id) {
  const list = getOrders().filter((o) => String(o.id) !== String(id));
  write(KEYS.orders, list);
  return true;
}

export function deleteAllOrders() {
  write(KEYS.orders, []);
  return true;
}

export function getCoupons() {
  return read(KEYS.coupons, SEED_COUPONS);
}

export function createCoupon(data) {
  const list = getCoupons();
  const id = `C-${Date.now().toString(36)}`;
  const item = { id, ...data };
  list.push(item);
  write(KEYS.coupons, list);
  return item;
}

export function updateCoupon(id, data) {
  const list = getCoupons();
  const idx = list.findIndex((c) => String(c.id) === String(id));
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...data, id: list[idx].id };
  write(KEYS.coupons, list);
  return list[idx];
}

export function deleteCoupon(id) {
  const list = getCoupons().filter((c) => String(c.id) !== String(id));
  write(KEYS.coupons, list);
  return true;
}

// 上傳圖片時 round-robin，讓示範看起來不像同一張
export function getNextUploadImage() {
  let idx = 0;
  try {
    idx = parseInt(localStorage.getItem(KEYS.uploadIdx) || '0', 10) || 0;
  } catch {
    /* ignore */
  }
  const url = UPLOAD_IMAGES[idx % UPLOAD_IMAGES.length];
  try {
    localStorage.setItem(KEYS.uploadIdx, String((idx + 1) % 1_000_000));
  } catch {
    /* ignore */
  }
  return url;
}

// 登出 / 「重置 demo 資料」按鈕用 — 把 demo 期間的所有 localStorage 痕跡清掉
export function resetDemoData() {
  const all = [
    ...Object.values(KEYS),
    'enso_inventory_logs', // AdminInventory
    'enso_device_overrides', // AdminDevices ConfigModal
    'enso_demo_seen_tour', // onboarding modal
  ];
  all.forEach((k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  });
}
