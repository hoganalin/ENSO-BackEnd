# FEATURES

## 功能清單

| 模組             | 路由               | 狀態                                                    | 資料來源                                                      |
| ---------------- | ------------------ | ------------------------------------------------------- | ------------------------------------------------------------- |
| 登入 / Demo 登入 | `/login`           | ✅                                                      | HexSchool `POST /admin/signin` / cookie sentinel              |
| 總覽 盤面        | `/admin`           | ✅                                                      | 前端模擬 IoT + Recharts                                       |
| 商品 物產        | `/admin/product`   | ✅                                                      | HexSchool `/admin/products`                                   |
| 訂單 帳冊        | `/admin/order`     | ✅                                                      | HexSchool `/admin/orders`                                     |
| 庫存 庫存        | `/admin/inventory` | ✅                                                      | HexSchool product.inventory + localStorage                    |
| 優惠券 札記      | `/admin/coupon`    | ✅                                                      | HexSchool `/admin/coupons`                                    |
| 設備 監管        | `/admin/devices`   | ✅                                                      | 前端模擬感測器 heartbeat                                      |
| AI Agent 使者    | `/admin/agent`     | ✅                                                      | Next.js `/api/events` + `/api/agent` + `/api/candidate-cases` |
| 前台商店         | `/`                | — 由獨立 repo 處理（本專案僅 admin，`/` 重導 `/login`） | —                                                             |

## 登入

### 兩種登入方式

| 方式          | 行為                                                                 |
| ------------- | -------------------------------------------------------------------- |
| 帳密登入      | `POST /admin/signin` → 回 `{token, expired}` → 寫入 cookie `myToken` |
| Demo 一鍵體驗 | 不打 API，直接寫入 `myToken=enso-demo-token`，expires=1 天           |

demo token 觸發 `apiAuth` 與 `ProtectedRoute` 的 mock 機制（見 [ARCHITECTURE.md](./ARCHITECTURE.md#demo-模式攔截關鍵設計)）。

### 表單驗證

React Hook Form + `EmailValidation`（`/^\S+@\S+$/i` + 必填）+ 密碼必填。`mode: 'onChange'`，`isValid` 為 false 時提交鈕 disabled。

### 錯誤處理

`catch → showError('提交表單失敗')`；400/401 細節訊息由 `apiAuth` response interceptor 的 alert 處理。

## 商品管理（AdminProducts）

### 功能

- 列表（pagination + client-side search/filter）
- 搜尋欄：同時 match `title` 與 `category`
- 篩選：全部 / 啟用 / 停用
- 新增 / 編輯 / 刪除 → 開 Bootstrap Modal（`ProductModal`）

### Modal 設計

- 一個元件處理 create / edit / delete，由 `modalType` prop 切換（`'create' | 'edit' | 'delete'`）
- 用 controlled state，**不用 React Hook Form**
- Bootstrap Modal 用 `useRef` + `new bootstrap.Modal(ref.current)`（直接操作 BS JS API）

### 自訂欄位

HexSchool product 標準欄位外，**多塞了 ENSO 業務欄位**：

| 欄位          | 型別       | 用途                              |
| ------------- | ---------- | --------------------------------- |
| `scenes`      | `string[]` | 使用情境（如 冥想 / 助眠 / 禮贈） |
| `top_smell`   | `string`   | 前調                              |
| `heart_smell` | `string`   | 中調                              |
| `base_smell`  | `string`   | 後調                              |
| `feature`     | `string`   | 產品特色描述                      |
| `inventory`   | `number`   | 庫存量（供 AdminInventory 用）    |

這些是**前端自訂**，HexSchool API 不驗證 schema — 它把 `data` 整包存下來。

### 圖片上傳

`uploadAdminImage(formData)` → multipart POST `/admin/upload` → 回傳 image URL → 塞進 `tempData.imageUrl`。`imagesUrl[]` 陣列在最後一欄填入時自動新增下一欄，最多 5 張。

## 訂單管理（AdminOrders）

### 功能

- 列表（HexSchool pagination）
- Client-side 搜尋：match `user.name` 或 order id
- 已付款 / 未付款 filter
- 訂單詳情 Modal：可編輯顧客 info（name / email / address / tel）與商品 qty

### 即時總額重算

Modal 內用 React Hook Form 的 `watch()` 監聽所有 products 的 `qty` 變動 → 重算 `total = Σ(qty × price)`。這是少數用到 RHF `watch` 做即時計算的表單。

## 庫存管理（AdminInventory）

HexSchool API **沒有庫存 endpoint**。庫存當成 product 的自訂欄位，走 `updateAdminProduct`。

### 調整流程

1. 列表顯示 `product.inventory`（沒有就當 0）
2. 點「庫存調律」開 Modal
3. 選「進貨入庫」或「出庫損耗」+ 數量 + 緣由（5 個 preset：進貨入庫 / 盤點調整 / 退貨回庫 / 破損報廢 / 樣品出借，或自填）
4. 提交 → `updateAdminProduct(id, {...selectedProduct, inventory: newInventory, ...})`
5. 寫入 localStorage `enso_inventory_logs`（非 API）

### 商業邏輯

- `LOW_STOCK_THRESHOLD = 10`
- **UI 警示**：<10 顯示「低庫存」黃標；=0 顯示「缺貨」紅標
- **扣庫存下限**：`Math.max(0, current - qty)`，不允許負庫存
- **KPI 卡片**（顯示於頁頂，以當頁計算，不是全店）：
  - `當前儲備總量` = `products.length`
  - `低庫存警戒線` = 0 < inventory < 10 的件數
  - `缺貨品項統計` = inventory = 0 的件數

### localStorage 歷史（display-only）

| Key        | `enso_inventory_logs`                        |
| ---------- | -------------------------------------------- | --------------------------------------------------------- |
| 資料結構   | `{id, product_id, product_title, type: 'add' | 'subtract', quantity, before, after, note, created_at}[]` |
| 上限       | 最新 200 筆（`.slice(0, 200)`）              |
| 同步到 API | ❌ 不同步，純前端                            |
| 顯示位置   | Modal 內該商品最近 5 筆                      |

清掉 localStorage = 歷史消失，是預期行為（demo 用途）。

## 優惠券管理（AdminCoupon）

標準 CRUD：HexSchool `/admin/coupon(s)`。欄位：`title`, `code`, `percent`, `due_date`（unix timestamp）, `is_enabled`（1/0）。

和其他 service 不同，[coupon.js](../src/service/coupon.js) 寫法是 `async/await` + `return response.data`（直接回 data，不回整個 axios response）。Consumer 用法會跟 products/orders service 不一樣，注意。

## 設備監管（AdminDevices）

前端模擬感測器清單，但**參數調律與資料導出已是真實行為**：

- 每個感測器顯示 online/offline、電池、最後測值
- 「全域配置 / 配置」Modal 儲存的閾值與更新頻率寫入 `localStorage` key `enso_device_overrides`，重新整理仍保留
- 「數據文存導出」依選擇的天數產生逐筆遙測資料（每節點每日 8 點），輸出真實 `.csv` / `.json` / `.tsv` 並透過 Blob 下載；CSV/TSV 帶 BOM，Excel 雙擊不會中文亂碼
- 「校準」仍是純動畫展示，不寫資料

## 總覽盤面（AdminHome）

KPI 卡片與圖表都串接真實 API。從 `getAdminProducts` + `getAdminOrders` + `fetchCandidates({status:'proposed'})` 在 mount 時並行抓取後 `useMemo` 計算：

| 卡片         | 公式                                        |
| ------------ | ------------------------------------------- |
| 累計營收     | `Σ order.total where is_paid`               |
| 平均客單價   | `累計營收 / 已付款訂單數`                   |
| 付款轉換率   | `已付款訂單 / 總訂單`                       |
| 倉儲環境狀態 | 仍是前端 setInterval 模擬（IoT 沒真實 API） |

- **月度銷售趨勢**：依 `order.create_at` 將已付款訂單分桶到最近 6 個月；同月份去年資料填到 `lastYear` 欄位
- **熱門商域 PieChart**：依商品在已付款訂單中的 `qty` 加總取 Top 4
- **待辦事項**：候選 case (proposed) 前 2 + 低庫存（<10 件）前 3，安全 / 缺貨自動標 High
- **IoT Live Log**：仍是 setInterval 模擬（純前端裝飾）

無資料時顯示「載入中…」或「目前無待辦事項」，避免空白。

## 前台商店

由另一個獨立 repo 處理。本專案 `/` 直接重導到 `/login`，`FrontendLayout` 是空殼（只渲 `MessageToast` + `<Outlet />`）。

## AI Agent 使者（AdminAgent）

商家視角（xiaodian）的 AI chat agent。**需要 ENSO-Frontend-demo (Next.js) 後端啟動**。

### 頁面組成

1. **Chat panel**：使用者問問題 → agent loop 最多 5 輪 tool-use → 呈現 assistant 回覆
2. **Event stream**：live trace log，顯示最近 N 筆 agent events（conversation_turn / handoff / eval_run）
3. **Candidate cases**：從 live trace promote 出來的待審 regression case，可 approve / export / archive

### 可呼叫的 tools（5 支，見 [xiaodianPersona.js](../src/service/xiaodianPersona.js)）

| Tool                    | 問話範例                           |
| ----------------------- | ---------------------------------- |
| `get_sales_summary`     | 「最近表現怎樣」「今天對話量多少」 |
| `get_top_intents`       | 「大家都在問什麼」「流量結構」     |
| `get_agent_performance` | 「哪個 agent 比較慢」              |
| `get_recent_complaints` | 「哪些情況沒搞定」「客訴」         |
| `get_eval_history`      | 「品質有沒有進步」「趨勢」         |

### Agent Loop 細節

- `MAX_ROUNDS = 5`（[xiaodianChat.js:27](../src/service/xiaodianChat.js#L27)）
- tool executor 都是純函式，從單一 `fetchAgentEvents(limit=1000)` 抓完後本地聚合 — 不會每支 tool 重打 API
- 每個 tool 回傳 `{ ok: true, data } | { ok: false, error }`，chat loop 會 `JSON.stringify` 塞進 Anthropic 的 `tool_result` block

### Candidate → Regression Case 匯出

`buildTestCaseSnippet(candidate)` 會產生可貼進 Next.js repo `testCases.ts` 的 TS object literal（含 `id`, `name`, `userMessage`, `expectedAgent`, `tags`, `checks` 含 TODO 註解）。

`tags` 會 normalize：`happy` → `happy-path`、`edge` → `edge-case`，並限制在 `ALLOWED_TAGS` 內。`checks` 故意只放 `responseNotEmpty()` + TODO 註解 — 因為每個 case 要檢查什麼是 domain-specific，自動產容易出錯。

### 錯誤情境

| 場景                                          | 行為                                                                                                       |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `VITE_AGENT_API_BASE` 沒設 / Next.js 後端沒開 | fetch 失敗 → 頁面顯示「請確認 ENSO 前台已啟動」                                                            |
| agent loop 跑滿 5 輪仍在 tool_use             | finalText fallback：「小店暫時沒有回覆文字。可能 tool 回傳的資料不足以回答，或者連續 5 輪都在呼叫 tool。」 |
| 單一 tool 例外                                | executor catch → `{ok: false, error: message}`，塞進 tool_result 的 `is_error: true`                       |

## 共用元件與 Hook

### `<FullPageLoading isLoading={bool} />`

全螢幕半透明 overlay + spinner（`react-loader-spinner`）。任何頁面在 `isLoading` 時渲染。

### `<Pagination pagination onChangePage />`

受控元件。`pagination` 物件格式對齊 HexSchool：

```js
{
  (current_page, total_pages, has_pre, has_next);
}
```

`onChangePage(page)` 會在使用者點擊時觸發，由 parent 呼叫 API 換頁。

### `<MessageToast />`

渲染 Redux `message` state 的 toast。全域只渲一次，通常放在 layout root（[AdminLayout.jsx:48](../src/layout/AdminLayout.jsx#L48)）。

### `useMessage()` hook

```js
const { showSuccess, showError } = useMessage();
showSuccess('訂單已更新'); // 3 秒後自動清除
```

底層是 `createAsyncMessage` thunk：dispatch `createMessage` → `setTimeout(removeMessage, 3000)`。

## 錯誤處理慣例

| 錯誤層                          | 處理位置                                                   |
| ------------------------------- | ---------------------------------------------------------- | --- | ------------ |
| 401 未授權                      | `apiAuth` response interceptor → `alert` + 導 `/login`     |
| 5xx 伺服器錯誤                  | `apiAuth` response interceptor → `alert`                   |
| Business error (4xx 帶 message) | View 層 `catch`，用 `showError(err.response?.data?.message |     | '操作失敗')` |
| Demo mock 遺失 URL pattern      | 預設回 `{ success: true }`（見 `api.js` 的 fallback）      |
