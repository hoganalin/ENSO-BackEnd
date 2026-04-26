# CHANGELOG

格式參考 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/)；版本採 [SemVer](https://semver.org/lang/zh-TW/)。
日期格式：YYYY-MM-DD。

## [Unreleased]

### Added

- 文件系統初始化：`docs/README.md`、`ARCHITECTURE.md`、`DEVELOPMENT.md`、`FEATURES.md`、`TESTING.md`、`CHANGELOG.md`
- `.claude/settings.json` 基礎設定（sandbox + allowed domains）
- `AdminDevices` 真實導出：CSV / JSON / TSV 三種格式 Blob 下載，CSV/TSV 帶 BOM Excel 不亂碼
- `AdminDevices` 配置永久化：`enso_device_overrides` localStorage，重整保留閾值與更新頻率

### Changed

- `AdminHome` KPI、月度趨勢、熱門商域、待辦事項全面改用 `getAdminProducts` + `getAdminOrders` + `fetchCandidates` 真實資料計算（IoT live log 與環境狀態仍為前端模擬）
- 全站 RWD：`AdminProducts` / `AdminInventory` / `AdminCoupon` / `AdminOrders` / `AdminDevices` 頁首 `text-5xl` 與 KPI 卡片 `text-6xl`、`p-10` 改為手機降級（`text-3xl md:text-5xl`、`p-6 md:p-10`）；header 內按鈕加 `shrink-0` 與字級降級避免擠壓

### Security

- `.env` 從 git 追蹤移除；`.gitignore` 加入 `.env` / `.env.local` / `.env.*.local` / `.vercel`
- `.env.example` 建立

### Fixed

- `AdminLayout.jsx` 重複 `export default` 導致 Vercel build 失敗

## 歷史紀錄（從 git log 反推）

這些條目是事後補登，精確時間以 `git log` 為準。

### feat: implement admin dashboard views and inventory management system

- 新增 `AdminHome`、`AdminOrders`、`AdminInventory`（含 localStorage 歷史）、`AdminDevices` 四個後台頁
- 新增 `Pagination`、`FullPageLoading` 共用元件
- `MessageToast` + `useMessage` hook（Redux 3 秒自動清除）

### feat: implement admin dashboard with coupon management and core routing structure

- 建立 `AdminCoupon`、`coupon.js` service
- 路由架構定型（Hash Router + ProtectedRoute + AdminLayout）

### feat: AI Agent「使者」模組（小典 / xiaodian）

- 新增 `/admin/agent` 路由 + `AdminAgent.jsx`
- `agentEvents.js` — 橋接 Next.js `/api/events`，含 KPI、intent 分類、funnel 計算
- `candidateCases.js` — candidate case CRUD + `buildTestCaseSnippet` 產生 TS regression case 片段
- `xiaodianPersona.js` / `xiaodianTools.js` / `xiaodianChat.js` — 商家視角 agent，5 支 tool、5 輪 tool-use loop

### feat: Vite base path + predeploy for GitHub Pages

- `vite.config.js` 的 `base: '/vite-reacthomework-finalweek-backEnd/'`
- `npm run deploy` via `gh-pages -d dist`

## 版本規則

| 類型                       | 版號變動 |
| -------------------------- | -------- |
| 破壞性變更 / 移除功能      | MAJOR    |
| 新功能（向後相容）         | MINOR    |
| Bug 修復 / 文件 / refactor | PATCH    |

專案目前未發布正式版（`package.json` version `0.0.0`），所有變更只記錄在此。
