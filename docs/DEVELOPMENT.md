# DEVELOPMENT

## 命名規則

| 類別 | 慣例 | 範例 |
|---|---|---|
| React 元件檔 | `PascalCase.jsx` | `AdminInventory.jsx`、`ProductModal.jsx` |
| Hook 檔 | `useXxx.js` camelCase | `useMessage.js` |
| Service 檔 | camelCase，動詞+名詞或模組名 | `adminProducts.js`、`agentEvents.js` |
| Redux slice | `xxxSlice.js` | `messageSlice.js` |
| Utility | camelCase | `validation.js`、`filter.js` |
| CSS module | `Component.module.css` | `AdminAgent.module.css` |
| 常數 | `UPPER_SNAKE_CASE` | `LOW_STOCK_THRESHOLD`、`MAX_ROUNDS` |
| 環境變數 | `VITE_` 前綴（Vite 暴露到前端的強制規則） | `VITE_API_BASE` |
| HexSchool 欄位 | snake_case（API 決定，不改） | `is_enabled`、`origin_price`、`due_date` |

## 模組系統

`package.json` 有 `"type": "module"`，全專案 ESM。
import 順序走 `eslint-plugin-simple-import-sort` 自動排序，分組：

1. React / 第三方 lib
2. 本專案絕對/相對 import
3. CSS

## 環境變數 (`.env`)

### 必填

| 變數 | 預設 | 用途 | 若留空會怎樣 |
|---|---|---|---|
| `VITE_API_BASE` | — | 自建 API base，本機 http://127.0.0.1:3001 | 真實 API 無法連線，展示模式不受影響 |
| `VITE_API_PATH` | — | 商店 path，本機 enso | 真實管理路由無法連線 |

### 選填

| 變數 | 預設 | 用途 | 若留空會怎樣 |
|---|---|---|---|
| `VITE_API_MODE` | 未設定 | self-hosted 啟用自建後端的操作限制與庫存紀錄 | 維持舊 API 相容顯示 |
| `VITE_ENABLE_DEMO` | true | 展示模式入口 | false 可關閉入口，但伺服器仍須自行驗證所有管理請求 |

### 在 Vercel 設定

前端在 **Project Settings → Environment Variables** 設定公開的 API URL、path 與 mode。後端資料庫與管理員密碼只設在 API 主機，不放進 Vite。不同環境應使用不同 API 與資料庫，不能直接部署指向本機的 dist。

### 安全注意

- `.env` **不 tracked**。`.gitignore` 已列入。
- `.env.example` **tracked**，作為 clone 後參考。
- server/.env 含資料庫與管理員密碼，必須保持忽略且不可輸出到紀錄。VITE_ 變數會進入瀏覽器程式碼，只能放公開設定。

## 新增 API 呼叫

1. 在 [src/service/](../src/service/) 建立或修改對應檔。
2. 管理 API 使用 apiAuth，由攔截器統一處理 Token 與展示模式。隱藏功能不在目前開發範圍。
3. 匯出具名函式（`export const getXxx = (...) => ...`）。
4. 不要在 View 裡 `import axios` 直接打 — 走 service 層。

```js
// 正確
import { apiAuth, API_PATH } from './api';
export const getFoo = (id) => apiAuth.get(`/api/${API_PATH}/admin/foo/${id}`);

// 錯誤（沒 JWT、沒 demo mock）
import axios from 'axios';
axios.get(`.../foo/${id}`);
```

## 新增後台頁面

1. 在 [src/views/admin/](../src/views/admin/) 建 `AdminXxx.jsx`。
2. 在 [src/router.jsx](../src/router.jsx) 的 `/admin` children 加路由。
3. 在 [src/layout/AdminLayout.jsx](../src/layout/AdminLayout.jsx) 的 `NAV_ITEMS` 加 nav entry。若 nav 項目 ≥ 7 個，手機版的 `max-h-[32rem]` 要一併檢查。
4. 需要 toast 就 `useMessage()`。需要 loading 就渲 `<FullPageLoading isLoading={...} />`。

## 新增 Redux state

目前 store 只有 `message` slice。若要加第二個：

1. 在 [src/slices/](../src/slices/) 建 `xxxSlice.js`。
2. 在 [src/store/store.js](../src/store/store.js) 的 `reducer` 物件加 `xxx: xxxReducer`。
3. View 用 `useSelector` / `useDispatch` 或封裝成 hook（仿 [useMessage.js](../src/hooks/useMessage.js)）。

## 表單

兩種風格並存：

| 風格 | 使用時機 | 範例 |
|---|---|---|
| React Hook Form | 表單欄位較多 / 需要 validation / 要 `watch()` 即時計算 | [Login.jsx](../src/views/Login.jsx)、AdminOrders 訂單編輯 |
| Controlled state (`useState`) | 快速表單、少欄位、無 validation 需求 | [AdminInventory.jsx](../src/views/admin/AdminInventory.jsx) 的庫存調整 Modal、ProductModal |

共用 validation rule 放 [src/utils/validation.js](../src/utils/validation.js)。目前只有 `EmailValidation`。

## 樣式系統

主要使用 `src/assets/index.css` 的 ENSO 設計 token、共用元件類別與 Tailwind CSS 4。Bootstrap 保留供相容元件使用，放在低優先序的 bootstrap 樣式層，不再以舊版 Bootstrap Modal 建立新視窗。

共用表單使用 workspace-field，互動視窗使用原生 Dialog 元件，圖片使用 ProductImage。品牌色彩、元件與斷點請依 [ENSO 後台設計系統](ENSO-ADMIN-DESIGN.md)，不再沿用舊版日式視覺規則。

## Linter & Formatter

```bash
npm run lint      # eslint .
# 無 lint:fix script — 要改的話自己跑 npx eslint . --fix
```

ESLint config：扁平 config 版（`eslint.config.js`），含 react / react-hooks / react-refresh / import / simple-import-sort plugin。

Prettier 有裝但無 `format` script；IDE 用儲存即格式化。

## 計畫歸檔流程

1. 計畫檔案命名：`docs/plans/YYYY-MM-DD-<feature-name>.md`
2. 文件結構：User Story → Spec → Tasks
3. 功能完成後：移至 `docs/plans/archive/`
4. 更新 [FEATURES.md](./FEATURES.md) 和 [CHANGELOG.md](./CHANGELOG.md)

範例：

```markdown
# 2026-04-23 — Admin Agent 商家視角

## User Story
作為 ENSO 品牌運營者，我想要在後台...

## Spec
- 新增 `/admin/agent` 路由
- 串接 Next.js repo 的 `/api/agent` proxy
- ...

## Tasks
- [ ] xiaodianPersona.js — system prompt + 5 tools
- [ ] xiaodianChat.js — tool-use loop（MAX_ROUNDS=5）
- [ ] AdminAgent.jsx — chat UI + event stream
```

## Git Commit 規範

目前無強制規則，但近期 commit 呈現此 pattern（type: 描述）：

| Type | 用途 |
|---|---|
| `feat` | 新功能 |
| `fix` | Bug 修復 |
| `chore` | 雜項（gitignore、config、依賴） |
| `docs` | 文件 |
| `refactor` | 重構無行為變更 |
| `style` | 格式化 |

見 [src/../.claude/agents/git-committer.md](../.claude/agents/git-committer.md)（如果已建立）。
# 完整展示開發補充

購物副本位於 storefront，具有自己的 package.json。修改前後台後，在根目錄執行 npm run build:showcase，再於 server 執行 npm run showcase，以同源 3002 驗证。伺服器入口不自動監看 build。原本 5175 管理開發模式仍可使用，不要把該模式的 localStorage demo 與新的 PostgreSQL 展示混為一談。

完整啟動、功能邊界與部署變數見 [面試展示指南](INTERVIEW-DEMO.md)。
