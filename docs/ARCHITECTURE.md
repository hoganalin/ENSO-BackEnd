# ARCHITECTURE

## 目錄結構

```
src/
├── main.jsx                  # ReactDOM root，掛 Provider + StrictMode
├── App.jsx                   # RouterProvider wrapper
├── router.jsx                # createHashRouter，所有路由定義
│
├── layout/
│   ├── AdminLayout.jsx       # 後台外層：Header nav（7 項）+ Outlet + Footer + logout
│   └── FrontendLayout.jsx    # 前台外層（目前 stub）
│
├── views/
│   ├── Login.jsx             # 帳密登入 + demo 一鍵體驗
│   ├── admin/
│   │   ├── AdminHome.jsx     # 總覽 KPI + Recharts + IoT 即時日誌
│   │   ├── AdminProducts.jsx # 商品 CRUD
│   │   ├── AdminOrders.jsx   # 訂單檢視 + 編輯
│   │   ├── AdminInventory.jsx# 庫存調整（自訂 inventory 欄位 + localStorage 歷史）
│   │   ├── AdminCoupon.jsx   # 優惠券 CRUD
│   │   ├── AdminDevices.jsx  # 模擬倉儲感測器 heartbeat
│   │   └── AdminAgent.jsx    # AI agent chat + event stream + candidate cases
│   └── front/
│       └── NotFound.jsx      # 404
│
├── components/
│   ├── FullPageLoading.jsx   # 全螢幕 spinner overlay（isLoading prop）
│   ├── MessageToast.jsx      # 渲染 Redux message state 的 toast
│   ├── Pagination.jsx        # 受控分頁，onChangePage(page) callback
│   ├── ProductModal.jsx      # 商品 Modal（create / edit / delete by modalType prop）
│   ├── SingleProductModal.jsx# 商品預覽 Modal
│   ├── ProtectedRoute.jsx    # 進後台前呼叫 /api/user/check，401 → /login
│   └── admin/                # AdminAgent 專用子元件（chat UI、event cards）
│
├── hooks/
│   └── useMessage.js         # showSuccess / showError 封裝 Redux dispatch
│
├── service/                  # 所有 API 呼叫集中於此
│   ├── api.js                # Axios 實例 + 攔截器 + demo mock
│   ├── adminProducts.js      # HexSchool 商品 CRUD + 圖片上傳
│   ├── adminOrders.js        # HexSchool 訂單 CRUD
│   ├── coupon.js             # HexSchool 優惠券 CRUD
│   ├── agentEvents.js        # fetch → Next.js /api/events + KPI/funnel 計算
│   ├── candidateCases.js     # fetch → /api/candidate-cases + TS snippet generator
│   ├── xiaodianChat.js       # 小店 agent 對話 loop（tool-use 迴圈）
│   ├── xiaodianPersona.js    # 小店 system prompt + tool schemas
│   └── xiaodianTools.js      # 小店的 5 支 tool executor
│
├── slices/messageSlice.js    # Toast 訊息 Redux slice（3 秒自動清除）
├── store/store.js            # configureStore — 只有 message reducer
│
├── utils/validation.js       # EmailValidation RHF rule
├── assets/
│   ├── index.css             # 全域字體、scrollbar、Kumiko 背景
│   ├── style.css             # 登入頁樣式
│   └── utils/filter.js       # currency(value) → 千分位 NTD
```

## 啟動流程

```
main.jsx
  └─ <StrictMode>
       └─ <Provider store={store}>       ← Redux message slice
            └─ <App>
                 └─ <RouterProvider router={router}>  ← Hash router
                      ├─ / → <FrontendLayout>         → Login / NotFound
                      └─ /admin → <ProtectedRoute>    ← 呼叫 /api/user/check
                                    └─ <AdminLayout>  ← nav + Outlet
                                         └─ <AdminHome>... (7 個 admin view)
```

## 路由總覽

路由定義在 [src/router.jsx](../src/router.jsx)。全部用 Hash Router（`/#/xxx`）。

| Path | Layout | View | 認證 |
|---|---|---|---|
| `/` | FrontendLayout | `<Navigate to="/login">` | 公開 |
| `/login` | FrontendLayout | Login | 公開 |
| `/admin` | ProtectedRoute → AdminLayout | AdminHome | 需 token |
| `/admin/product` | 同上 | AdminProducts | 需 token |
| `/admin/order` | 同上 | AdminOrders | 需 token |
| `/admin/inventory` | 同上 | AdminInventory | 需 token |
| `/admin/coupon` | 同上 | AdminCoupon | 需 token |
| `/admin/devices` | 同上 | AdminDevices | 需 token |
| `/admin/agent` | 同上 | AdminAgent | 需 token |
| `*` | — | NotFound | 公開 |

## 認證機制

### Token 來源
登入成功後，token 寫入 cookie `myToken`（HexSchool 舊課程程式碼曾用 `hexToken`，[api.js](../src/service/api.js) 做 fallback）。

### 攔截點

| 時機 | 位置 | 行為 |
|---|---|---|
| 進 `/admin` 前 | [ProtectedRoute](../src/components/ProtectedRoute.jsx) | `POST /api/user/check`，401 則 render `<Navigate to="/login">` |
| 每次 API request | `apiAuth` request interceptor | 從 cookie 撈 token 塞進 `Authorization` header |
| 每次 API response | `apiAuth` response interceptor | 401 → `alert` + `location.hash = '#/login'`；5xx → alert |

### Demo 模式攔截（關鍵設計）

`ProtectedRoute` 與 `apiAuth` 都額外判斷 **token === `'enso-demo-token'`**：

1. `ProtectedRoute`：不打 `/api/user/check`，直接放行。
2. `apiAuth` **request interceptor**：`Promise.reject({ isDemoMock: true, config })`。
3. `apiAuth` **response interceptor** 的 error handler：看到 `isDemoMock` 就根據 `config.url` 的 `/admin/products` / `/admin/orders` / `/admin/coupons` 回對應 mock data（延遲 300ms 假裝是網路請求），用 `Promise.resolve()` 轉回正常 response。

這樣 demo mode 下所有 admin 頁面不需網路就能看到假資料，面試展示不會因為後端掛掉而開天窗。

## 資料流

```
User action
   │
   ▼
View (AdminXxx.jsx)
   │
   ├──► service/adminXxx.js ──► apiAuth (Axios) ──► HexSchool API
   │                                │
   │                                └──► demo mock (若 token === enso-demo-token)
   │
   ├──► service/agentEvents.js ──► fetch ──► Next.js /api/events
   │
   └──► useMessage().showSuccess/Error ──► messageSlice ──► MessageToast
```

Redux 只管 toast 訊息，沒有其他全域狀態。View 內部 state 用 `useState`；表單用 React Hook Form（Login、AdminOrders 編輯）或 controlled state（其他）。

## API 層

### Base URLs

| 用途 | 環境變數 | 預設 fallback |
|---|---|---|
| HexSchool 課程 API | `VITE_API_BASE` | — |
| Hexschool path（租戶） | `VITE_API_PATH` | — |
| Agent 後端（Next.js） | `VITE_AGENT_API_BASE` | `http://localhost:3000` |

所有 HexSchool endpoint 格式：`/api/${API_PATH}/admin/{resource}`。

### 為什麼 agent 用 fetch、不用 Axios

刻意避開 `apiAuth` interceptor。[agentEvents.js](../src/service/agentEvents.js) 頂部註解說明：跨 repo call 不該帶 `hexToken`、也不該套 demo mock 邏輯。

### HexSchool API 路由

| Service | 方法 | Endpoint |
|---|---|---|
| `getAdminProducts(page)` | GET | `/admin/products?page={page}` |
| `createAdminProduct(data)` | POST | `/admin/product` body=`{data}` |
| `updateAdminProduct(id, data)` | PUT | `/admin/product/{id}` body=`{data}` |
| `deleteAdminProduct(id)` | DELETE | `/admin/product/{id}` |
| `uploadAdminImage(formData)` | POST | `/admin/upload` (multipart) |
| `getAdminOrders(page)` | GET | `/admin/orders?page={page}` |
| `updateAdminOrder(id, data)` | PUT | `/admin/order/{id}` body=`{data}` |
| `deleteAdminOrder(id)` | DELETE | `/admin/order/{id}` |
| `deleteAllAdminOrders()` | DELETE | `/admin/orders/all` |
| `getCoupons(page)` | GET | `/admin/coupons?page={page}` |
| `createCoupon(data)` | POST | `/admin/coupon` |
| `updateCoupon(id, data)` | PUT | `/admin/coupon/{id}` |
| `deleteCoupon(id)` | DELETE | `/admin/coupon/{id}` |

HexSchool 統一回應格式（由 API 控制，**不是本專案定義**）：

```js
{ success: true, products: [...], pagination: {...} }
// 或
{ success: false, message: '錯誤訊息' }
```

### Agent 後端 API（Next.js repo：ENSO-Frontend-demo）

不是本 repo 實作，但本 repo 的 service 會呼叫它：

| Service | 方法 | Endpoint | 用途 |
|---|---|---|---|
| `fetchAgentEvents` | GET | `/api/events?limit&kind&since` | 拿 agent 對話事件、handoff、eval_run |
| `sendXiaodianMessage` → `callAgentApi` | POST | `/api/agent` body=`{messages, systemPrompt, tools, agentId}` | 前端不直接打 Anthropic；走 Next.js proxy，避免 API key 洩漏 |
| `fetchCandidates` | GET | `/api/candidate-cases?status&agentId` | 從 Live Trace promote 出來的待審 regression case |
| `updateCandidateStatus` | PATCH | `/api/candidate-cases` body=`{id, status}` | proposed → approved / exported / archived |

## 小店（xiaodian）AI Agent loop

定義於 [xiaodianPersona.js](../src/service/xiaodianPersona.js) + [xiaodianTools.js](../src/service/xiaodianTools.js) + [xiaodianChat.js](../src/service/xiaodianChat.js)。

```
sendXiaodianMessage(priorMessages, userText)
   │
   ├─ append user message
   │
   └─ loop (max 5 rounds):
        callAgentApi  ──POST──►  /api/agent  ──►  Anthropic Messages API
                                                   │
                                  ◄── response ────┘
                                  {text, toolCalls, stopReason}
        │
        ├─ append assistant message
        │
        ├─ if stopReason === 'tool_use':
        │     for each toolCall: executeXiaodianTool(name, input)
        │     append tool message
        │     continue  ─────────────────┐
        │                                │
        └─ else: break                   │
                                         │
                                         └─► 下一輪
```

**5 輪上限**：防止 Claude 無限呼叫 tool。`MAX_ROUNDS = 5`。

### 可用 tools（商家視角，只讀事件流，不能改商品/訂單）

| Tool | 用途 |
|---|---|
| `get_sales_summary` | 24h 對話量、handoff 數、平均 tool 使用、最新 eval pass rate |
| `get_top_intents` | 使用者意圖分佈 top-N |
| `get_agent_performance` | 小禾 / 小香 / 小管 三位前台 agent 表現對照 |
| `get_recent_complaints` | 最新一次 eval_run 的 failed cases |
| `get_eval_history` | 歷次 eval_run pass rate 時間軸 |

Tool executor 都是純函式，從 `fetchAgentEvents` 抓事件後在前端聚合計算，不另外打 API。

## 環境變數

| 變數 | 必要 | 預設 | 用途 |
|---|---|---|---|
| `VITE_API_BASE` | 是 | — | HexSchool API base URL |
| `VITE_API_PATH` | 是 | — | HexSchool 租戶 path |
| `VITE_AGENT_API_BASE` | 否 | `http://localhost:3000` | Agent 後端（Next.js）base URL |

`.env.example` 是 committed；`.env` 不 tracked（`.gitignore`）。詳見 [DEVELOPMENT.md](./DEVELOPMENT.md#env)。

## 資料持久化

本專案**沒有自己的資料庫**。

- HexSchool API：商品、訂單、優惠券都在他們家的後端。
- `localStorage`：庫存調整歷史 key=`enso_inventory_logs`，最多 200 筆，僅顯示用，**不同步到 API**。見 [AdminInventory.jsx](../src/views/admin/AdminInventory.jsx) 的 `getLogs` / `appendLog`。
- Cookie：`myToken`（登入 token）、`enso-demo-token`（demo 模式 sentinel）。

## 部署

### Vercel（主）

- 自動 build：push 到 `main` branch 即觸發。
- 環境變數需在 Vercel Dashboard 設定（見 [DEVELOPMENT.md](./DEVELOPMENT.md)）。
- Vite base path **不需改**（走自家 domain）。

### GitHub Pages（備）

- `npm run deploy` → `predeploy` 跑 `npm run build` → `gh-pages -d dist` push 到 `gh-pages` branch。
- 需保留 [vite.config.js](../vite.config.js) 的 `base: '/vite-reacthomework-finalweek-backEnd/'`。
