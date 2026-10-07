# ENSO 電商與營運工作台

以香氛品牌為情境的全端作品。React 購物前台可選購商品、管理購物車、建立未付款訂單，營運後台可管理商品圖片、訂單及庫存。Express／PostgreSQL 負責驗證、持久化、庫存交易與送單防重。設備為模擬資料，未連接銀行或收款服務。

**面試操作入口：** 依 [完整展示指南](docs/INTERVIEW-DEMO.md) 啟動後，開啟 http://127.0.0.1:3002/shop/。每位訪客取得三十分鐘隔離空間，不修改原始商品草稿。這是本機網址，本版尚未公開部署。

## 技術與範圍

| 類別 | 使用技術 |
| --- | --- |
| 語言 | JavaScript、JSX、CSS、SCSS、SQL |
| 前端 | React 19、Vite 7、React Router 7（Hash Router） |
| 樣式 | Tailwind CSS 4、CSS Modules、Bootstrap 5（相容元件，隔離在低優先序樣式層） |
| API | Axios、既有管理 API、Cookie Token 驗證 |
| 自建後端 | Node.js、Express 5、PostgreSQL 17、pg、Zod、Multer、Sharp |
| 表單與狀態 | React Hook Form、React state、Redux Toolkit（通知） |
| 圖表與通知 | Recharts、SweetAlert2、Redux 通知 |
| 展示資料 | 完整展示為 PostgreSQL 隔離 schema，另保留舊後台 localStorage 預覽模式 |
| 本機測試 | Node.js test runner、Playwright（桌機與手機 Chromium） |

目錄：src 為管理後台，storefront 為 React／Vite／Redux Toolkit／React Hook Form／Bootstrap 購物前台，server 為自建 API。原本前台資料夾保留，本 repository 的副本已串接自建 API。資料格式與安全限制見 [後端說明](server/README.md)。

原始 public 資料區的六款商品仍保持未上架、庫存零，不對外接單。完整展示另建可操作商品副本，展示 checkout 明確開放，原管理 API 的訪客結帳仍預設關閉。自建 session 使用隨機不透明 Token，不是 JWT。未提供真實付款、配送或會員系統。

## 快速開始

使用 Node.js 22.12 以上版本，並安裝 npm。

```sh
git clone https://github.com/hoganalin/ENSO-BackEnd.git
cd ENSO-BackEnd
npm ci
```

先依 [後端說明](server/README.md) 啟動本機 API。複製 `.env.example` 為 `.env.local`，預設 API 為本機 3001、商店路徑 enso。前端預設允許來源為 5175，啟動時請明確指定連接埠。

```sh
npm run dev -- --host 127.0.0.1 --port 5175 --strictPort
```

開啟終端機顯示的網址並加上 `/#/login`。點選「進入展示模式」即可操作，不需 API 或正式帳號。實際資料庫模式需要使用本機建立的管理員帳號登入。

不要將帳密、Token 或私密金鑰填進 VITE 環境變數，這些變數會出現在瀏覽器端程式碼中。

## 功能導覽

| 路由 | 功能 |
| --- | --- |
| `/login` | 管理員登入、展示入口 |
| `/admin` | 第一頁訂單與商品摘要、營收圖表、待付款與低庫存提醒 |
| `/admin/product` | 商品新增、編輯、刪除、上架狀態、主圖與最多五張圖庫預覽 |
| `/admin/order` | 搜尋、付款狀態篩選、收件資訊及商品數量編輯 |
| `/admin/inventory` | 庫存查詢、增加／扣減、最近五筆本機調整紀錄 |
| `/admin/coupon` | 優惠碼、折後比例、到期日與啟用狀態 |
| `/admin/payment-ledger` | 帶有付款方式的訂單彙整與模擬交易圖表 |
| `/admin/devices` | 模擬設備清單、本機設定與示範資料匯出 |

`/admin/agent` 僅保留導回總覽的相容路由，不在導覽中公開，也不重新啟用。

## 圖片管理

- `imageUrl` 是商品主圖，`imagesUrl` 是圖庫，最多五張。
- 主圖可貼上網址或上傳 JPG、PNG、WebP。介面限制單檔 3 MB。
- 圖庫支援網址、預覽與移除。尚未加入圖庫檔案批次上傳。
- 直式容器以 contain 保留商品主體，載入失敗會顯示文字替代狀態。
- 展示模式的上傳回傳既有示範圖，不會將所選檔案送到雲端。
- 六款商品已各製作主圖及四張概念圖庫，並接入本機展示模式。列表使用縮圖，編輯預覽使用中圖，PNG 原稿及既有前台圖片完整保留。正式商品資料未替換。詳見 [商品圖片規劃](docs/PRODUCT-IMAGE-PLAN.md)。
- 金額以新台幣（NT$）顯示，沿用既有價格數字，不進行匯率換算。

## 已知限制

- 搜尋與總覽數值以已取得的頁面資料計算，不能視為全店營運報表。
- 展示模式包含六款商品、十二筆訂單。CRUD 保存在目前瀏覽器，重置展示資料或登出會清回初始資料。
- 展示模式庫存調整歷史存 localStorage。自建後端使用交易、版本檢查及伺服器庫存紀錄，包含異動管理員與原因。
- 自建後端依訂單價格快照及折扣重算金額，拒絕修改已付款訂單數量，取消未付款訂單會回補庫存。不提供批次清空或退款。
- 付款狀態按鈕只更新紀錄，不會收款或退款。
- 設備資料與校準為模擬，匯出的歷史測值也不是實際感測紀錄。
- 手機商品頁採卡片，其餘資料表可以在表格容器內左右滑動。

## 驗證與文件

```sh
npm run lint
npm test
npm run build
npm run preview
```

`npm run verify` 依序執行 lint、單元測試與正式建置。本機預覽若使用 GitHub Pages 的 base，請執行 `npm run preview -- --base /ENSO-BackEnd/`，並開啟 `/ENSO-BackEnd/#/login`。單元測試及展示模式檢查不等同正式 API 或 CI 驗收。

瀏覽器測試第一次使用先執行 `npx playwright install chromium`，之後執行 `npm run test:browser`。此命令會自動啟動 4176 連接埠的隔離測試預覽，攔截所有 API 並阻擋外部請求，不需要真實帳密。測試建置寫入 `.browser-build/`，不覆蓋正式 `dist/`。完整本機檢查使用 `npm run test:all`，可讀報告使用 `npx playwright show-report`。

2026-10-01 完成相容版本更新，依鎖定檔重新安裝後，`npm audit` 回報零項已知警示。這不等同完整安全驗收，正式 API 與部署仍需另行驗證。詳見 [交付與上線前清單](HANDOFF.md)。

- [功能與資料限制](docs/FEATURES.md)
- [架構與 API 資料流](docs/ARCHITECTURE.md)
- [檢查項目與驗證範圍](docs/TESTING.md)
- [產品目的](PRODUCT.md)
