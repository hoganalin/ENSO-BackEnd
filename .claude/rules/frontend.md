---
paths:
  - 'src/views/**'
  - 'src/components/**'
  - 'src/layout/**'
---

# 前端（元件 / 頁面 / 版型）規則

## 元件撰寫

- React 19 + 函式元件；**不寫 class component**。
- 使用 `useState` / `useEffect` / `useRef` 等 hooks；自訂 hooks 放 `src/hooks/`。
- 單一檔案預設一個 default export（元件本身），helper 若需重用請提到 utils 或 hooks。
- props 用解構賦值 (`{ isLoading, onChangePage }`)；不寫 PropTypes（專案未安裝）。

## 表單處理

- **React Hook Form**：用於 Login 登入、AdminOrders 訂單編輯（需要 `watch()` 即時重算）。
- **Controlled state (`useState`)**：其他 Modal、Inventory 調整。
- 同一個元件**不混用** RHF 與 controlled。改寫時整塊換，不要一半 RHF 一半 useState。
- Validation rule 共用的放 `src/utils/validation.js`。只有一處用的就地定義。

## Toast 訊息

- 不要 `alert()` business error — 用 `useMessage()` hook：
  ```js
  const { showSuccess, showError } = useMessage();
  showSuccess('訂單已更新');
  ```
- `window.alert` 只保留給 `apiAuth` 的 401 / 5xx 攔截器用（系統層級）。
- Toast 會 3 秒自動清除，不用手動清。

## Loading 狀態

- 頁面初始載入用 `<FullPageLoading isLoading={boolean} />` 渲染全螢幕 overlay。
- 不要自己寫 loading 畫面 — 專案已有 `react-loader-spinner`，用現成的。

## Modal

- 使用 Bootstrap 5 JS API：`useRef` 取 DOM → `new bootstrap.Modal(ref.current)` → `.show()` / `.hide()`。
- 不要自己搭 modal（背景遮罩、ESC 關閉、focus trap BS 都處理了）。
- Inventory / Login 等純 React 自繪的 modal 是例外（需要特殊動畫），新 modal 請優先走 BS JS API。

## 樣式系統（混用兩套，禁止加第三套）

1. **Bootstrap classes**：`btn`, `form-control`, `table`, `modal`, `d-flex`, `d-md-table-cell` 等
2. **自訂 Tailwind-like utility 與色票**：
   - `bg-[#FAF9F6]`（米白背景）
   - `text-[#111111]`（主文字）
   - `text-[#984443]`（朱紅 — 錯誤 / 強調）
   - `text-[#735C00]`（深黃 — 警告）
   - `text-[#3A4D39]`（墨綠 — 成功）
   - `border-[#D1C7B7]`（灰米邊框）
   - `transition-kyoto`（專案自訂 transition class）

新增顏色請先考慮上列色票。真的需要新色要進 DEVELOPMENT.md 色票表。

## 響應式

- 手機斷點：Bootstrap `md`（≥768px）為主。
- 表格次要欄位用 `d-none d-md-table-cell` 在手機隱藏；核心欄位（名稱、操作）一律保留。
- 卡片手機版以 2 欄排列（`grid-cols-2 md:grid-cols-3` 或 Bootstrap grid）。
- 標題字體可用 `clamp()` 做流體縮放。
- **全站無橫向捲動**（`overflow-x: hidden` 僅限特殊 case，不要全域加）。

## 新增路由要改三處

漏改任一處就壞：

1. [src/router.jsx](../../src/router.jsx)：`/admin` children 加入路由物件
2. [src/layout/AdminLayout.jsx](../../src/layout/AdminLayout.jsx)：`NAV_ITEMS` 陣列加入 `{ to, label, end? }`
3. `docs/FEATURES.md`：功能表格加一列

若 NAV_ITEMS ≥ 7 項，檢查 AdminLayout 手機 nav 的 `max-h-[32rem]` 是否足夠（每項約 50px）。

## XSS 與使用者內容

- 不用 `dangerouslySetInnerHTML`。需要插 HTML 時改用 React element。
- `img src={...}` 若來自 API，請信任 HexSchool / GCS domain；未知來源的 url 不應直接 render 成 image。

## 效能

- 列表分頁用 `<Pagination pagination onChangePage />`；不要自己重做。
- 避免在 render body 做 `.filter().map().sort()` 連鎖運算，先 `useMemo` 或在 effect 裡算好放 state。
- setInterval（AdminHome IoT log、AdminDevices heartbeat）必須在 cleanup 清掉，否則 unmount 後繼續跑。
