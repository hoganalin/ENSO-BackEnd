# CLAUDE.md

## 專案概述

ENSO 智慧倉儲與營運數據監控系統 — React 19 + Vite 7 的後台管理 SPA，結合 HexSchool 課程 API CRUD、前端 IoT 模擬與 LLM agent 協作（串到另一個 Next.js repo）。

## 常用指令

```bash
npm run dev       # Vite dev server
npm run build     # Production build
npm run preview   # 本地預覽 production build
npm run lint      # ESLint
npm run deploy    # 推 dist 到 gh-pages branch（Vercel 是主要部署，此為備）
```

沒有 `test` script — 無測試框架，見 `@./docs/TESTING.md`。

## 關鍵規則

- **所有後台 API 必須走 `apiAuth`（[src/service/api.js](src/service/api.js)）**，不要 `import axios` 直接打。`apiAuth` 攔截器會注入 JWT、處理 401/5xx、並在 demo mode 回 mock data。
- **跨 repo call 用 fetch 而非 apiAuth**（agent 後端的呼叫）— 見 [src/service/agentEvents.js](src/service/agentEvents.js) 開頭註解：避免 interceptor 意外帶 hexToken。
- **庫存是 product 自訂欄位**，不是 HexSchool 原生端點。改庫存走 `updateAdminProduct`；歷史只存 `localStorage.enso_inventory_logs`，不同步 API。
- **Demo token 是 `enso-demo-token`**，`ProtectedRoute` 與 `apiAuth` 都會攔截 — 進 admin 不打 `/user/check`、所有 API 回 mock。不要在正式 E2E 測試用這個 token。
- 功能開發使用 `docs/plans/` 記錄計畫；完成後移至 `docs/plans/archive/`，同步更新 `docs/FEATURES.md` 與 `docs/CHANGELOG.md`。

## 必要遵守項目

- **不要 hardcode API key** — 前端 bundle 會被打包公開。Anthropic / OpenAI key 必須只放在 Next.js repo 的後端環境變數。
- **新增路由要同步改三處**：[src/router.jsx](src/router.jsx) children、[src/layout/AdminLayout.jsx](src/layout/AdminLayout.jsx) `NAV_ITEMS`、`docs/FEATURES.md`。
- **React Hook Form 與 controlled state 並存** — Login、AdminOrders 訂單編輯用 RHF；其他用 useState。不要混用。
- **CSS 只允許 Bootstrap + 自訂 Tailwind-like utility**（`bg-[#xxx]` 色票）— 不要再引入 styled-components / emotion。
- **提交前跑 `npm run build`** — Vercel build 失敗過好幾次（重複 export、CSS @import 順序），本地 build 能過再 push。

## 詳細文件

- `@./docs/README.md` — 項目介紹與快速開始
- `@./docs/ARCHITECTURE.md` — 目錄結構、資料流、認證、API 層、demo mock 設計、agent loop
- `@./docs/DEVELOPMENT.md` — 命名規則、環境變數、新增功能步驟、計畫歸檔流程
- `@./docs/FEATURES.md` — 每個後台模組的行為細節與特殊設計
- `@./docs/TESTING.md` — 測試現況（無）、手動驗證 checklist
- `@./docs/CHANGELOG.md` — 變更日誌
