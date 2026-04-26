# TESTING

## 現況：沒有自動化測試

本專案**沒有配置任何測試框架**（Vitest / Jest / Playwright 都沒裝），`package.json` 沒有 `test` script。

## 為什麼沒測試

這是 HexSchool 課程後端作業 + 面試作品集，開發節奏以「快速迭代 + UI 驗證」為主。加上：

- 大部分資料來自 HexSchool 公用 API（mock 有點意義不大）
- Agent loop 的行為主要在 ENSO-Frontend-demo (Next.js) 這邊驗，那邊有 `testCases.ts` 跑 eval runs
- 前端純展示型邏輯（IoT 模擬、Recharts）測試 ROI 低

## 手動驗證 Checklist

每次大改動後跑這份：

### 登入流程
- [ ] `/login` 輸入錯誤 email → 看到 email 驗證訊息
- [ ] 點「🚀 參觀者一鍵體驗」→ 直接進 `/admin`
- [ ] demo mode 下 `/admin/product` 看到 3 筆 mock products
- [ ] demo mode 下 `/admin/order` 看到 2 筆 mock orders
- [ ] demo mode 下 `/admin/coupon` 看到 2 筆 mock coupons
- [ ] 點登出 → 回到 `/login`，cookie 清空

### 商品 CRUD
- [ ] 列表載入 + pagination 換頁
- [ ] 搜尋框輸入商品名 → 即時篩選
- [ ] 建立新商品 → Modal 開啟 → 填完存檔 → 列表出現新商品
- [ ] 編輯 → 改價格 → 存檔 → 列表價格更新
- [ ] 刪除 → 確認 Modal → 列表移除
- [ ] 圖片上傳 → 選檔 → 預覽出現 → 送出後 imageUrl 存入 product

### 訂單
- [ ] 列表 + 已付款 / 未付款 篩選
- [ ] 開訂單詳情 → 改某商品 qty → 總額即時重算（`watch()` 行為）
- [ ] 存檔後列表總額更新

### 庫存
- [ ] KPI 卡顯示正確（當頁 total / low / out 計數）
- [ ] 開庫存調律 Modal
- [ ] 選「進貨入庫」+ 輸入數量 → 預期圓滿即時更新
- [ ] 選「出庫損耗」+ 數量 > 現有庫存 → 實際存量應為 0（不是負數）
- [ ] 送出 → toast 顯示成功 + 列表庫存更新
- [ ] 再次開同一商品 Modal → 歷史紀錄顯示剛才的操作
- [ ] 清 `localStorage.enso_inventory_logs` → 歷史消失（預期）

### AI Agent（需 Next.js backend 啟動）
- [ ] 打開 `/admin/agent`，event stream 有資料
- [ ] 對 chat 問「最近對話量」→ 應觸發 `get_sales_summary` tool
- [ ] tool call 顯示在 assistant message 下方
- [ ] 問「客訴有哪些」→ 觸發 `get_recent_complaints`
- [ ] 關掉 Next.js backend → 重整頁面 → 看到連線失敗提示
- [ ] Candidate 列表：點某個 case → approve → 狀態更新

### 響應式
- [ ] 視窗縮到 < 768px → header nav 變漢堡選單
- [ ] 漢堡展開 → 7 個 nav 項目全看得到（不被 `max-h` 切掉）
- [ ] 表格隱藏次要欄位（`d-none d-md-table-cell`）
- [ ] Modal 在手機版仍可完整操作

### Build 正常
- [ ] `npm run build` 成功，無 esbuild / CSS error
- [ ] `npm run preview` 能跑，所有路由可訪問
- [ ] `npm run lint` 無錯

## 若要引入 Vitest（未來）

推薦順序（ROI 由高至低）：

1. **service 層純函式** — agentEvents.js 的 `calculateKpis`、`getIntentDistribution`、`calculateFunnel`、candidateCases.js 的 `buildTestCaseSnippet`、`normalizeTag`。這些全是純函式，測試寫起來最爽。
2. **xiaodian tools** — `getSalesSummary` 等 5 支 executor。mock `fetchAgentEvents` 即可。
3. **Redux slice** — `messageSlice` 的 reducer（新增 / 移除 / 清除）。
4. **React 元件** — 成本高，非必要不測。

建議步驟：

```bash
npm i -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

`vite.config.js` 加 `test` 區塊：

```js
export default defineConfig({
  // ...
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
  },
});
```

`package.json` scripts 加：

```json
"test": "vitest",
"test:ui": "vitest --ui"
```

## 常見陷阱

- **Demo mode 讓 E2E 測試看起來「過」但實際沒打 API** — 如果將來寫 E2E，記得**不要用** `enso-demo-token`。
- **ProductModal 用 Bootstrap JS 直接操作 DOM**（`new bootstrap.Modal(ref.current)`），React Testing Library 測會踩坑 — modal 開關要用 BS API 觸發，不是 fireEvent。
- **`watch()` 在 RHF 裡會每次變動都 re-render**，AdminOrders 訂單編輯的即時總額依賴這個，測試時別 mock 掉。
