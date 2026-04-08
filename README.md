# ENSO 智慧倉儲與營運數據監控系統

這不只是一個電商後台，而是一個結合**工業物聯網 (IoT)** 與**商業決策分析 (BI)** 的高價值資產管理系統。
我將傳統的電商訂單系統，升級為具備「智慧倉儲監控」能力的前端營運儀表板，專門負責控管對環境極度敏感的頂級香氛（如芽莊沈香、老山檀香）資產。

---

## 💡 核心亮點 (Key Highlights)

- **🚀 實時 IoT 數據可視化 (Real-time IoT Dashboard)**
  - 運用前端資料模擬技術（Custom Hook + clearInterval 內存優化），實作類似 **MQTT / WebSocket** 的高頻率即時溫濕度與煙霧數據流。
  - 當數據異常時（如濕度超過 60%）自動觸發 `Alert` 危險警報狀態，展現實時前端交互處理能力。

- **📊 商業決策思維與數據聚合 (Data Hierarchy & BI)**
  - **總覽面板 (Overview)：** 給營運總監的第一視角，利用 `Recharts` 繪製 YoY 營收趨勢圖 (AreaChart) 與產品佔比 (PieChart)，並即時展示 A/B 倉加權平均狀態。
  - **設備監管中心 (Diagnostic View)：** 給硬體維修工程師排查問題用。精細列出位於「沈香儲藏室」、「老山檀香架」等單一感測器的連線狀態 (Heartbeat)、測值與電池電量。

- **✨ 現代化品牌格調 (Fine-tuned UI/UX)**
  - 拋棄傳統僵硬的後台模板，統一採用 **Inter** 現代字體。
  - 導入深色模式巧思、毛玻璃質感導航、與流暢的 Bootstrap 自定義樣式，打造符合 ENSO 高級香氛品牌定位的 Premium 體驗。

- **📱 完整響應式設計 (Fully Responsive)**
  - 所有管理頁面支援手機瀏覽，無橫向捲動。
  - 表格手機版自動隱藏次要欄位（`d-none d-md-table-cell`），保留核心操作欄位。
  - 卡片在手機以 2 欄排列，標題字體使用 `clamp()` 隨螢幕自動縮放。

---

## 🛠️ 技術棧 (Tech Stack)

| 類別 | 套件 / 版本 |
|------|------------|
| 框架 | React 19 + Vite 7 |
| 路由 | React Router 7（Hash Router） |
| 狀態管理 | Redux Toolkit |
| HTTP | Axios（JWT Cookie 攔截器） |
| UI | Bootstrap 5 + Bootstrap Icons |
| 表單 | React Hook Form |
| 圖表 | Recharts |
| 通知 | SweetAlert2 |
| 部署 | gh-pages |

---

## 📈 IoT 面板架構設計邏輯

為解決傳統後台「資訊過載」的問題，本儀表板嚴格遵守**關注點分離 (Separation of Concerns)** 原則：

1. **聚合型指標 (KPI)：** 頁面上方保留企業最在意的「總營收、客訴率、環境健康度」。
2. **終端狀態偵測：** 設備列表能判別 `Online` 與 `Offline`，模擬真實 MQTT Heartbeat 心跳包中斷的工業場景。
3. **即時日誌 (Live Log)：** 在總覽畫面右下角實作 Terminal 風格的即時訊息流，掌握倉庫各節點回報狀態。

---

## 🚀 快速開始 (Quick Start)

### 環境需求
- Node.js 18+
- npm 9+

### 安裝與啟動

```bash
# 1. Clone 專案
git clone [your-repo-url]

# 2. 安裝依賴
npm install

# 3. 建立環境變數檔
# 在根目錄建立 .env，填入以下內容：
# VITE_API_BASE=https://ec-course-api.hexschool.io/v2
# VITE_API_PATH=your-api-path

# 4. 啟動開發伺服器
npm run dev
```

訪問 `http://localhost:5173/#/login`

### 指令說明

```bash
npm run dev      # 啟動開發伺服器（Vite HMR）
npm run build    # 打包正式版本
npm run preview  # 本地預覽正式版本
npm run lint     # ESLint 檢查
npm run deploy   # 部署至 GitHub Pages（自動執行 build）
```

---

## 📁 專案結構

```
src/
├── assets/
│   ├── index.css               # 全域字體、scrollbar 樣式
│   ├── style.css               # 登入頁樣式
│   └── utils/filter.js         # currency() 數字格式化
├── components/
│   ├── FullPageLoading.jsx      # 全螢幕 loading overlay
│   ├── MessageToast.jsx         # Toast 通知元件
│   ├── Pagination.jsx           # 分頁元件
│   ├── ProductModal.jsx         # 商品新增/編輯/刪除 Modal
│   └── ProtectedRoute.jsx       # JWT 驗證路由守衛
├── hooks/
│   └── useMessage.js            # showSuccess / showError hook
├── layout/
│   ├── AdminLayout.jsx          # 後台框架（Header + Nav + Footer）
│   └── FrontendLayout.jsx       # 前台框架
├── router.jsx                   # Hash Router 路由設定
├── service/
│   ├── api.js                   # Axios 實例（JWT 攔截器）
│   ├── adminOrders.js           # 訂單 CRUD API
│   └── adminProducts.js         # 商品 CRUD + 圖片上傳 API
├── slices/messageSlice.js       # Toast Redux slice（自動 3 秒清除）
├── store/store.js               # Redux store
├── utils/validation.js          # React Hook Form 共用驗證規則
└── views/
    ├── Login.jsx
    ├── admin/
    │   ├── AdminHome.jsx        # 總覽面板（KPI + 圖表 + IoT 日誌）
    │   ├── AdminProducts.jsx    # 商品管理
    │   ├── AdminOrders.jsx      # 訂單管理
    │   ├── AdminInventory.jsx   # 庫存管理
    │   ├── AdminCoupon.jsx      # 優惠券管理
    │   └── AdminDevices.jsx     # 倉儲感測器監管
    └── front/
        └── NotFound.jsx
```

---

## 🔐 API 與認證

所有後台 API 使用 `src/service/api.js` 的 `apiAuth` Axios 實例：

- **Request 攔截器**：自動從 Cookie（`myToken` → fallback `hexToken`）讀取 JWT 並注入 `Authorization` header
- **Response 攔截器**：401 → 自動導向 `#/login`；5xx → 顯示錯誤 alert

```js
import { apiAuth } from '../service/api';
const res = await apiAuth.get(`/api/${API_PATH}/admin/products`);
```

---

## 🌐 部署

正式環境 base path 設定於 `vite.config.js`：

```js
base: '/vite-reacthomework-finalweek-backEnd/'
```

```bash
npm run deploy  # build → 推送至 gh-pages branch
```

---

© 2025 ENSO Incense Smart Warehouse Dashboard. All Rights Reserved.
