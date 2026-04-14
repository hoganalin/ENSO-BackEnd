# ENSO 後臺管理系統 — 面試技術報告

> **專案背景**：ENSO 是一個以高端線香、沈香為主題的電商平台。此後臺管理系統為該品牌的內部營運工具，涵蓋商品管理、訂單追蹤、庫存調度、優惠券發行，以及模擬 IoT 智慧倉儲監控功能。

---

## 一、技術棧 (Tech Stack)

| 層面 | 技術選型 | 說明 |
|---|---|---|
| 框架 | React 19 + Vite | 最新 React 版本，Vite 極速 HMR |
| 路由 | React Router 7 (Hash Router) | SPA Hash 模式，相容 GitHub Pages 部署 |
| 狀態管理 | Redux Toolkit | 全域 Toast 通知 (`messageSlice`) |
| HTTP 層 | Axios (帶 interceptor) | JWT 自動注入、401/5xx 統一錯誤處理 |
| 表單 | React Hook Form | 僅用於訂單編輯，減少不必要 re-render |
| UI 框架 | Bootstrap 5 | Modal 透過 Bootstrap JS API 直接操作 DOM |
| 圖表 | Recharts | AreaChart (趨勢線) + PieChart (佔比) |
| 通知 | SweetAlert2 | 刪除操作二次確認 |
| 部署 | GitHub Pages + gh-pages | base path `/vite-reacthomework-finalweek-backEnd/` |

---

## 二、系統架構圖

```
src/
├── router.jsx               # 路由設定 (Hash Router)
├── layout/
│   ├── AdminLayout.jsx      # 後臺 Shell (Header Nav + Outlet + Footer)
│   └── FrontendLayout.jsx   # 前台 Shell
├── components/
│   ├── ProtectedRoute.jsx   # 路由守衛 (JWT 驗證)
│   ├── ProductModal.jsx     # 商品 CRUD Modal (create / edit / delete)
│   ├── Pagination.jsx       # 受控分頁元件
│   ├── FullPageLoading.jsx  # 全頁 Spinner
│   └── MessageToast.jsx     # Redux 驅動的 Toast 通知
├── views/admin/
│   ├── AdminHome.jsx        # 總覽面板 (KPI + 圖表 + IoT 模擬)
│   ├── AdminProducts.jsx    # 商品管理
│   ├── AdminOrders.jsx      # 訂單管理
│   ├── AdminInventory.jsx   # 庫存管理
│   ├── AdminCoupon.jsx      # 優惠券管理
│   └── AdminDevices.jsx     # 智慧倉儲感測器面板
├── service/
│   ├── api.js               # Axios instance + interceptors
│   ├── adminProducts.js     # 商品 CRUD API
│   └── adminOrders.js       # 訂單 CRUD API
├── store/store.js           # Redux store
├── slices/messageSlice.js   # Toast 狀態 slice
└── hooks/useMessage.js      # Toast 封裝 Hook
```

---

## 三、功能模組說明

### 3.1 路由守衛 (ProtectedRoute)

所有 `/admin/*` 路由都包在 `ProtectedRoute` 中。進入時呼叫 HexSchool 的驗證端點，若 API 回傳 401 則立即導向 `/login`，確保未授權使用者無法存取後台任何頁面。

```jsx
// 核心邏輯
useEffect(() => {
  axios.post(`${API_BASE}/user/check`)
    .catch(() => navigate('/login'));
}, []);
```

**面試亮點**：說明此模式是「Client-side Guard」，與 Server-side redirect 的差異，以及為何選用 `useEffect` + `navigate` 而非 `loader`。

---

### 3.2 API 層設計 (Axios Interceptors)

`src/service/api.js` 建立了一個帶攔截器的 Axios instance：

- **Request interceptor**：從 Cookie 讀取 JWT Token (`myToken`，fallback `hexToken`)，自動附加至每個請求的 Authorization header。
- **Response interceptor**：
  - 401 → 自動導向 `#/login`
  - 5xx → `window.alert` 顯示伺服器錯誤

**面試亮點**：這樣的設計讓所有 Service 模組不需自己處理 Auth，符合 DRY 原則，且維護時只需修改一個地方。

---

### 3.3 總覽面板 (AdminHome) — IoT 模擬

**功能**：
- 4 個 KPI 卡片（營收、倉儲環境、客單價、品牌好評率）
- Recharts `AreaChart` 年度銷售 YoY 對比
- Recharts `PieChart` 熱門商品類別佔比
- 待處理營運事項清單（優先級標示 High / Medium / Low）
- 模擬 MQTT 即時日誌 Console

**IoT 模擬實作**：
```jsx
useEffect(() => {
  const interval = setInterval(() => {
    setSensors(prev => ({
      tempA: +(prev.tempA + (Math.random() - 0.5) * 0.2).toFixed(1),
      humidityA: Math.min(100, Math.max(0, prev.humidityA + (Math.random()-0.5))),
      lastUpdate: new Date().toLocaleTimeString(),
    }));
  }, 3000); // 每 3 秒模擬一次 MQTT 推送
  return () => clearInterval(interval); // cleanup 避免記憶體洩漏
}, []);
```

**面試亮點**：展示 `useEffect` cleanup function 的必要性；說明此模式可無縫替換為真實 WebSocket / MQTT over WebSocket 連線，架構不需改變。

---

### 3.4 商品管理 (AdminProducts)

**功能**：
- 分頁顯示商品清單（API pagination）
- 前端即時搜尋（名稱 / 分類）+ 上架 / 下架篩選
- 單一 `ProductModal` 元件承擔 create / edit / delete 三種模式（`modalType` prop 切換）
- 圖片上傳（multipart form-data），回傳 URL 直接填入 `imageUrl`
- `imagesUrl[]` 支援最多 5 張，最後一格填滿後自動擴展

**商品資料結構（含品牌特有欄位）**：
```js
{
  title, category, origin_price, price, unit,
  description, content,
  scenes: ['', '', ''],    // 使用情境 (最多 3 種)
  top_smell, heart_smell, base_smell, // 香調三角
  feature,                 // 特色描述
  inventory: 0,            // 庫存數量 (存於 API 自定義欄位)
  imageUrl, imagesUrl: [''] // 主圖 + 最多 5 張輔圖
}
```

**Modal 管理方式**：
```jsx
// 用 useRef 持有 Bootstrap Modal instance，避免 React state 觸發不必要重渲染
const productModalRef = useRef(null);
const myModal = useRef(null);

useEffect(() => {
  myModal.current = new bootstrap.Modal(productModalRef.current);
  return () => myModal.current?.dispose(); // 記憶體清理
}, []);
```

**面試亮點**：解釋為何用 Bootstrap JS API 而非第三方 Modal 套件，以及 `useRef` 操作 DOM 而非 `useState` 的選擇理由。

---

### 3.5 訂單管理 (AdminOrders)

**功能**：
- 分頁取得訂單，前端搜尋 + 付款狀態篩選
- 訂單詳情 Modal：使用 **React Hook Form** 讓管理員編輯購買者資料與商品數量
- `watch()` 即時監聽數量變動，動態重新計算訂單總金額
- 支援單筆刪除 / 清空全部訂單

**React Hook Form 用於訂單編輯的理由**：訂單欄位多（購買者姓名、電話、地址、備註、各商品數量），RHF 的 uncontrolled 模式可大幅減少 re-render 次數，相較 `useState` 效能更優。

---

### 3.6 庫存管理 (AdminInventory)

**功能**：
- 以商品列表形式顯示庫存現況
- 顏色提示：庫存 = 0 → 紅色「缺貨」、< 10 → 黃色「低庫存」、≥ 10 → 綠色「庫存充足」
- 調整 Modal：選擇「加入」或「扣除」，輸入數量與原因（預設 5 種），送出後呼叫 `updateAdminProduct` 將庫存寫回 API
- 調整紀錄儲存於 `localStorage`（key: `enso_inventory_logs`，最多保留 200 筆，newest-first）

**設計決策**：HexSchool API 無庫存專屬端點，因此 `inventory` 以商品自定義欄位儲存，並在調整後整筆 PATCH 商品資料。

```js
const LOW_STOCK_THRESHOLD = 10;
const getStockBadge = (inventory) => {
  if (inventory === 0) return { color: 'danger', label: '缺貨' };
  if (inventory < LOW_STOCK_THRESHOLD) return { color: 'warning', label: '低庫存' };
  return { color: 'success', label: '庫存充足' };
};
```

**面試亮點**：說明在 API 限制下如何用「自定義欄位 + 前端 localStorage」的方式實現完整庫存功能，以及此方案的取捨（localStorage 僅限本機，不跨裝置）。

---

### 3.7 優惠券管理 (AdminCoupon)

**功能**：
- 列出所有優惠券（折扣碼、折扣比例、有效期限、啟用狀態）
- 新增 / 編輯 / 刪除優惠券
- 呼叫 HexSchool Coupon API 進行 CRUD

---

### 3.8 智慧倉儲感測系統 (AdminDevices)

**功能**：
- 顯示分佈於倉庫 A / B 區的實體 IoT 感測器清單
- 呈現感測器 ID、類型、安置位置、連線狀態、當前測值、電量進度條
- Offline 設備以「訊號異常」紅色標示，電量 < 20% 進度條轉紅

**與 AdminHome 的關係**：AdminHome 顯示的倉儲數據是由此頁各感測器數值加權平均後的總覽，兩者形成「詳細 → 總覽」的資訊架構。

---

## 四、全域狀態管理 (Redux Toolkit)

系統只有一個 Redux slice：`messageSlice`，專責全域 Toast 通知。

```
dispatch(showSuccess('操作成功'))
  → state.message.type = 'success'
  → MessageToast 元件讀取並顯示
  → 3 秒後 thunk auto-clear
```

使用 `useMessage()` Hook 封裝 dispatch，讓各頁面元件不需直接依賴 Redux，降低耦合。

---

## 五、部署架構

- **平台**：GitHub Pages
- **方式**：`npm run deploy` → `vite build` → `gh-pages -d dist`
- **路由模式**：Hash Router（`#/admin/product`），因 GitHub Pages 無法處理 SPA HTML5 History fallback
- **Base Path**：`/vite-reacthomework-finalweek-backEnd/`（配置於 `vite.config.js`）

---

## 六、可延伸討論的面試問題

| 問題 | 建議回答方向 |
|---|---|
| 為何選 Redux 而不用 Context？ | 當前規模用 Context 也可以；選 Redux 是為了 devtools 可觀察性與未來擴充（購物車、使用者資料） |
| ProtectedRoute 有什麼安全問題？ | Client-side guard 不能完全防護，真正的安全需要 API 端每個請求都驗 Token |
| `useRef` vs `useState` 持有 Modal？ | Modal instance 不是渲染資料，用 `useState` 會造成多餘 re-render，`useRef` 是正確選擇 |
| localStorage 庫存紀錄的限制？ | 不跨裝置、不跨瀏覽器、無伺服器備份；若需跨裝置應改為 API 端儲存 |
| 如何讓 IoT 模擬替換為真實資料？ | 將 `setInterval` 替換為 `new WebSocket(url)` + `ws.onmessage` 即可，state 結構完全相同 |

---

*最後更新：2026-04-07*
