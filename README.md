# ENSO 智慧倉儲與營運數據監控系統

這不只是一個電商後台，而是一個結合**工業物聯網 (IoT)**、**商業決策分析 (BI)** 與 **AI 營運助理**的高價值資產管理系統。
我將傳統的電商訂單系統，升級為具備「智慧倉儲監控」與「AI 協作」能力的前端營運儀表板，專門負責控管對環境極度敏感的頂級香氛（如芽莊沈香、老山檀香）資產。

---

## 💡 核心亮點 (Key Highlights)

- **🚀 實時 IoT 數據可視化 (Real-time IoT Dashboard)**
  - 運用前端資料模擬技術（Custom Hook + clearInterval 內存優化），實作類似 **MQTT / WebSocket** 的高頻率即時溫濕度與煙霧數據流。
  - 當數據異常時（如濕度超過 60%）自動觸發 `Alert` 危險警報狀態，展現實時前端交互處理能力。

- **📊 商業決策思維與數據聚合 (Data Hierarchy & BI)**
  - **總覽面板 (Overview)：** 給營運總監的第一視角，利用 `Recharts` 繪製 YoY 營收趨勢圖 (AreaChart) 與產品佔比 (PieChart)，並即時展示 A/B 倉加權平均狀態。
  - **設備監管中心 (Diagnostic View)：** 給硬體維修工程師排查問題用。精細列出位於「沈香儲藏室」、「老山檀香架」等單一感測器的連線狀態 (Heartbeat)、測值與電池電量。

- **🤖 AI 營運助理「小典」(AI Agent — 使者)**
  - 內建可獨立運作的 AI chat agent，串接 ENSO 前台 (Next.js) 的 agent 後端。
  - 以**工具呼叫 (tool use)** 介接「客訴單建立」、「候選案件查詢」等業務事件，後台可即時看到 agent 每一輪對話、使用的工具與產出的候選案件。
  - 適合用來展示「後台人員 × LLM 協作」場景，非必要功能，可獨立於 HexSchool 後台之外開關。

- **✨ 現代化品牌格調 (Fine-tuned UI/UX)**
  - 拋棄傳統僵硬的後台模板，統一採用 **Inter** 現代字體。
  - 導入深色模式巧思、毛玻璃質感導航、與流暢的 Bootstrap 自定義樣式，打造符合 ENSO 高級香氛品牌定位的 Premium 體驗。

- **📱 完整響應式設計 (Fully Responsive)**
  - 所有管理頁面支援手機瀏覽，無橫向捲動。
  - 表格手機版自動隱藏次要欄位（`d-none d-md-table-cell`），保留核心操作欄位。
  - 卡片在手機以 2 欄排列，標題字體使用 `clamp()` 隨螢幕自動縮放。

---

## 🧭 後台功能導覽

| 路由 | 模組 | 說明 |
|------|------|------|
| `/admin` | 總覽 | KPI、營收圖表、IoT 即時日誌 |
| `/admin/product` | 商品 | CRUD + 多圖上傳 + 香氛自訂欄位（前/中/後調、場景） |
| `/admin/order` | 訂單 | 付款/未付款篩選、訂單細節編輯（React Hook Form 即時重算總額） |
| `/admin/inventory` | 庫存 | 自訂 `inventory` 欄位、低庫存警示、localStorage 調整歷史 |
| `/admin/coupon` | 札記（優惠券） | 折扣碼管理 |
| `/admin/devices` | 監管 | 倉儲感測器 Heartbeat、電池、測值診斷 |
| `/admin/agent` | 使者 | AI chat agent、工具呼叫事件、候選案件列表 |

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
| 部署 | Vercel（主） / GitHub Pages（備） |

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
git clone https://github.com/hoganalin/ENSO-BackEnd.git
cd ENSO-BackEnd

# 2. 安裝依賴
npm install

# 3. 建立 .env（複製 .env.example）
cp .env.example .env

# 4. 啟動開發伺服器
npm run dev
```

訪問 `http://localhost:5173/#/login`

### 環境變數

根目錄 `.env`（請勿 commit，`.gitignore` 已排除）：

```env
# HexSchool 課程 API
VITE_API_BASE=https://ec-course-api.hexschool.io/v2
VITE_API_PATH=your-api-path

# AI Agent 後端（可選，不設定則 /admin/agent 頁面會連線失敗，其他功能正常）
# 本機開發時指向另一個 repo (ENSO-Frontend-demo / Next.js) 的 dev server
VITE_AGENT_API_BASE=http://localhost:3000
```

> `VITE_AGENT_API_BASE` 指向**另一個 Next.js 專案**（ENSO-Frontend-demo）的 `/api/events` 等 endpoint，不是 API key。
> 若只 demo HexSchool 相關功能（商品／訂單／庫存／優惠券），可以不設此變數。

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
│   ├── index.css                  # 全域字體、scrollbar 樣式
│   ├── style.css                  # 登入頁樣式
│   └── utils/filter.js            # currency() 數字格式化
├── components/
│   ├── FullPageLoading.jsx        # 全螢幕 loading overlay
│   ├── MessageToast.jsx           # Toast 通知元件
│   ├── Pagination.jsx             # 分頁元件
│   ├── ProductModal.jsx           # 商品新增/編輯/刪除 Modal
│   ├── SingleProductModal.jsx     # 單品查看 Modal
│   ├── ProtectedRoute.jsx         # JWT 驗證路由守衛
│   └── admin/                     # Agent 頁面專用子元件
├── hooks/
│   └── useMessage.js              # showSuccess / showError hook
├── layout/
│   ├── AdminLayout.jsx            # 後台框架（Header + Nav + Footer）
│   └── FrontendLayout.jsx         # 前台框架
├── router.jsx                     # Hash Router 路由設定
├── service/
│   ├── api.js                     # Axios 實例（JWT 攔截器）
│   ├── adminOrders.js             # 訂單 CRUD API
│   ├── adminProducts.js           # 商品 CRUD + 圖片上傳 API
│   ├── coupon.js                  # 優惠券 API
│   ├── agentEvents.js             # Agent 事件串流（使者頁用）
│   ├── candidateCases.js          # 候選案件查詢
│   ├── xiaodianChat.js            # 小典 chat API
│   ├── xiaodianPersona.js         # 小典 persona 設定
│   └── xiaodianTools.js           # 小典工具呼叫定義
├── slices/messageSlice.js         # Toast Redux slice（自動 3 秒清除）
├── store/store.js                 # Redux store
├── utils/validation.js            # React Hook Form 共用驗證規則
└── views/
    ├── Login.jsx
    ├── admin/
    │   ├── AdminHome.jsx          # 總覽面板（KPI + 圖表 + IoT 日誌）
    │   ├── AdminProducts.jsx      # 商品管理
    │   ├── AdminOrders.jsx        # 訂單管理
    │   ├── AdminInventory.jsx     # 庫存管理
    │   ├── AdminCoupon.jsx        # 優惠券 / 札記
    │   ├── AdminDevices.jsx       # 倉儲感測器監管
    │   └── AdminAgent.jsx         # AI Agent「使者」
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

### Vercel（主要）

1. Import GitHub repo 到 Vercel。
2. 在 **Project Settings → Environment Variables** 加入：
   - `VITE_API_BASE` = `https://ec-course-api.hexschool.io/v2`
   - `VITE_API_PATH` = 你的 HexSchool API path
   - `VITE_AGENT_API_BASE` = production 上 agent 後端的網址（若無 agent demo 可省略）
3. Vercel 偵測到 push 會自動 build。

### GitHub Pages（備援）

正式環境 base path 設定於 `vite.config.js`：

```js
base: '/vite-reacthomework-finalweek-backEnd/'
```

```bash
npm run deploy  # build → 推送至 gh-pages branch
```

> Vercel 部署不需要這個 base path（Vercel 走自己的 domain），此設定僅供 GitHub Pages 使用。

---

© 2025 ENSO Incense Smart Warehouse Dashboard. All Rights Reserved.
