# ENSO 智慧倉儲與營運數據監控系統

高級香氛電商後台 + IoT 儀表板 + AI 營運助理。同時演示「HexSchool 課程 API CRUD」、「前端 IoT 模擬」與「LLM agent 協作」三塊能力。

## 技術棧

| 類別 | 套件 | 版本 |
|---|---|---|
| 框架 | React + Vite | 19 / 7 |
| 路由 | react-router-dom（Hash Router） | 7 |
| 狀態 | Redux Toolkit + react-redux | 2 / 9 |
| HTTP | Axios + fetch（agent 用 fetch） | 1.13 |
| 表單 | React Hook Form | 7 |
| UI | Bootstrap 5 + 自訂 Tailwind 風格 class | 5.3 |
| 圖表 | Recharts | 3 |
| 通知 | SweetAlert2 + Redux toast slice | 11 |
| Linter | ESLint 9 + Prettier 3 | — |
| 部署 | Vercel（主）/ gh-pages（備） | — |

React Hook Form 負責**登入表單**跟**訂單編輯表單**；其餘表單（庫存調整、商品編輯）用 controlled state。

> 沒有測試框架。詳見 [TESTING.md](./TESTING.md)。

## 快速開始

```bash
git clone https://github.com/hoganalin/ENSO-BackEnd.git
cd ENSO-BackEnd
npm install
cp .env.example .env
# 編輯 .env 填入 VITE_API_PATH
npm run dev
```

瀏覽器開 `http://localhost:5173/#/login`，點「🚀 參觀者一鍵體驗」不需帳密即可進後台（demo mode，所有 API 走 mock）。

## 常用指令

| 指令 | 用途 |
|---|---|
| `npm run dev` | Vite dev server + HMR |
| `npm run build` | production build → `dist/` |
| `npm run preview` | 本地預覽 production build |
| `npm run lint` | ESLint 全專案 |
| `npm run deploy` | build 後 push 到 `gh-pages` branch |

沒有 `test` script（無測試）。

## 文件索引

| 文件 | 內容 |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 目錄結構、資料流、認證、API 層架構、demo mode 攔截器設計 |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | 命名規則、環境變數、新增功能步驟、計畫歸檔流程 |
| [FEATURES.md](./FEATURES.md) | 每個後台模組的功能行為與特殊設計 |
| [TESTING.md](./TESTING.md) | 測試現況（無）、手動驗證 checklist |
| [CHANGELOG.md](./CHANGELOG.md) | 變更日誌 |
| [plans/](./plans/) | 開發中計畫；完成後移至 `plans/archive/` |

## 需要知道的關鍵事實

1. **Hash Router** — 所有路由是 `/#/xxx`（因為舊版 gh-pages 不支援 HTML5 history，Vercel 沿用同路由慣例）
2. **`apiAuth` 攔截器含 demo mock** — 見 [src/service/api.js](../src/service/api.js)；token 等於 `enso-demo-token` 時整個 request 被 reject 並回 mock data
3. **AI agent 功能串到另一個 repo** — `VITE_AGENT_API_BASE` 指向 ENSO-Frontend-demo (Next.js) 的 `/api/events`、`/api/agent`、`/api/candidate-cases`
4. **庫存是自訂欄位** — HexSchool API 沒有庫存端點；`inventory` 當成 product 的自訂欄位存，調整歷史僅存 localStorage
