---
paths: []
---

# 安全性規則

## API Key / Secret

- **絕對不要** hardcode Anthropic / OpenAI / Google API key 到 `src/` 任何檔案。Vite 會把整個 src 打包進 bundle，等於公開到網路。
- Vite `VITE_*` 前綴的環境變數會被打進 client bundle — 不要在 `VITE_*` 放 API key。
- API key 只能放在 **Next.js repo (ENSO-Frontend-demo) 的後端環境變數**，經由 `/api/agent` proxy 轉發。
- `.env` 不 tracked；`.env.example` tracked。若要分享環境變數結構，改 `.env.example`。

## Token 儲存

- JWT 存在 cookie（`myToken`），不要改成 localStorage — XSS 風險較高。
- Cookie 目前沒設 `Secure` / `HttpOnly` / `SameSite`（HexSchool 課程限制）。正式產品改用後端 session 或 httpOnly cookie。
- Demo token (`enso-demo-token`) 是 sentinel 值，不是真 JWT — 不要在 E2E / production 用。

## 輸入驗證

- **表單驗證在前端做 UX，不能當安全防線**。HexSchool API 自己會驗。
- 使用者輸入若要組進 URL query string，用 `URLSearchParams`（`agentEvents.js` 已示範），不要手組字串 — 避免 `&`、`=`、中文字未編碼。
- 數字輸入用 `parseInt(value, 10)` 或 `Number(...)`；NaN 要處理。

## XSS

- 不用 `dangerouslySetInnerHTML`。
- React element 內插值已自動 escape，可安全渲染使用者輸入。
- 圖片 `src` 若來自外部，信任 whitelist（HexSchool / GCS）；不要直接 render 任意 URL。

## SQL / NoSQL Injection

- 本專案**無資料庫**，不適用。
- HexSchool API 自己處理。

## CORS

- Agent 後端的 fetch 都帶 `mode: 'cors'`；Next.js 那邊需配合設 `Access-Control-Allow-Origin`。
- localhost dev：Next.js 在 :3000、Vite 在 :5173，跨 port 算跨域 — 確認 Next.js 的 CORS 設定允許 dev origin。

## 錯誤訊息揭露

- View 層 `showError` 的訊息可帶 HexSchool 回的 `err.response?.data?.message`（對使用者有幫助）。
- 不要 show stack trace / 內部路徑 / DB error 給使用者。
- `console.error` debug 訊息在 production 不影響安全，但在面試 demo 時打開 DevTools 會看到，自行斟酌。

## 第三方相依

- `npm install` 新套件前，快速查 `npm audit` / GitHub repo 活躍度 / 週下載量。
- 不裝 deprecated 套件（react-use 目前 maintained，OK）。
- `gh-pages` 之類只在 dev 用的套件放 devDependencies。

## CSP / Referer

- 目前無 CSP header（Vercel 預設無）。若加上要記得允許 `fonts.googleapis.com`、`storage.googleapis.com`、`ec-course-api.hexschool.io`、agent backend domain。
- Vercel Next.js 後端應驗 referer，只允許 `https://your-frontend.vercel.app` 呼叫 `/api/agent`（非本 repo 範疇，但相關）。

## 上線前必檢查

跑 `/pre-demo-check` skill，重點：

- [ ] Git 歷史無 `sk-ant-`、`sk-proj-`、Google API key
- [ ] `.env` 不在 git tracking
- [ ] `dist/` bundle 不含 `sk-ant`
- [ ] Vercel 環境變數已設
- [ ] HexSchool 密碼不在 README / docs 任何範例裡
