---
paths:
  - 'src/service/**'
---

# API 服務層規則

## 呼叫 HexSchool API

- 一律使用 `apiAuth`（Axios instance 於 `src/service/api.js`），不得在 service 檔 `import axios from 'axios'` 直接打。理由：`apiAuth` 有 JWT 攔截器、統一錯誤處理、demo mock 機制。
- API 路徑一律用模板字串 `/api/${API_PATH}/admin/{resource}`；`API_PATH` 從 `./api` 匯入。
- GET 列表帶 `?page=` query string；預設值 `page = 1`。
- POST / PUT 的 body 用 `{ data }` 包一層（HexSchool 規範），不要直接傳 body。

## 呼叫 Agent 後端（ENSO-Frontend-demo / Next.js）

- 一律使用原生 `fetch`，**不要**用 `apiAuth`。理由：跨 repo call 不應附帶 `hexToken`，也不該套 demo mock。
- Base URL 從 `import.meta.env.VITE_AGENT_API_BASE` 讀，fallback `http://localhost:3000`。
- fetch options 帶 `mode: 'cors'` 與 `headers: { Accept: 'application/json' }`。
- 失敗時 `throw new Error('<endpoint> <status>: <body 前 200 字>')`，方便 UI 層顯示與除錯。

## Service 函式寫法

- 一個檔管一個資源（adminOrders.js、adminProducts.js）；跨資源請另開檔。
- 匯出具名函式：`export const getXxx = (...) => ...`，不要 default export。
- 簡單的 wrapper 直接回 axios response（consumer 自行取 `res.data`）。**例外**：coupon.js 已採「回 `response.data`」style — 新檔請與 adminProducts / adminOrders 對齊，或文件註明。

## 回應格式處理

- HexSchool 統一回 `{ success, <resource>, pagination }` 或 `{ success: false, message }`。
- Business error（4xx 帶 message）由 View 層 `catch` 用 `showError(err.response?.data?.message || '操作失敗')` 處理。
- 401 / 5xx 已在 `apiAuth` 的 response interceptor 全域處理，service 層不要重複處理。

## Demo Mode

- 不要在 service 層加 demo 判斷 — demo mock 只在 `apiAuth` 的 interceptor 層做。
- 新增 admin 資源類型時，記得在 `api.js` 的 demo mock 區塊補對應 URL 的 mock data，否則該頁面在 demo mode 下會空白。

## Agent 事件 API

- 聚合函式（`calculateKpis`、`getIntentDistribution`、`calculateFunnel` 等）必須是純函式：input events array → 算完回 plain object，**不 mutate 參數**、**不打 API**。
- Tool executor 全部回 `{ ok: true, data } | { ok: false, error }`。chat loop 會幫忙 `JSON.stringify` 塞進 tool_result，executor 不用自己處理。
- 加新的 xiaodian tool：同時改 `xiaodianPersona.js`（schema + label）與 `xiaodianTools.js`（executor + TOOL_REGISTRY）。漏一邊 Claude 呼叫會失敗或 UI label 空白。
