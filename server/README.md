# ENSO 自建管理 API

完整面試展示另有 scripts/showcase.js 入口，串接 repository 內 storefront 購物前台，提供三十分鐘 PostgreSQL 隔離空間。啟動、部署及測試界線見 [完整展示指南](../docs/INTERVIEW-DEMO.md)。本文件下方「本機管理 API」的結帳開關與 Cookie 認證，不等同新的隔離展示入口。

Node.js、Express 5 與 PostgreSQL 17 的本機後端。提供管理員登入、商品、圖片上傳、訂單、庫存紀錄及優惠券。與 React 後台共用此 repository，但有獨立 package.json 與鎖定檔。

## 本機啟動

前置需求為 Node.js 22.12 以上、npm 與已啟動的 Docker。以下命令在 server 目錄執行。

```sh
npm ci
npm run init:local
npm run db:up
npm run migrate
npm run seed
npm start
```

init:local 只在首次執行，建立具有隨機資料庫密碼與管理員密碼的 server/.env。若檔案已存在會拒絕覆寫。seed 僅新增不存在的管理員，不更改既有密碼、不建立假營收或商品。

預設 API 為 http://127.0.0.1:3001，健康檢查為 /health。資料庫僅綁定本機 55439，使用獨立 enso-api-local Compose 專案及持久 volume，不共用其他專案資料庫。

另一個終端機在 repository 根目錄，將 .env.example 複製為 .env.local，然後執行：

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 5175 --strictPort
```

開啟 http://127.0.0.1:5175/#/login。管理員帳號與密碼在本機 server/.env 的 BOOTSTRAP_ADMIN_EMAIL、BOOTSTRAP_ADMIN_PASSWORD，請自行在編輯器查看，不要貼至聊天、提交 Git 或填入 VITE 變數。

新建資料庫一開始沒有商品與訂單，seed 不會自動匯入商品。此工作區已於 2026-10-02 明確執行六款概念商品草稿匯入，全部未上架、庫存零，沒有建立訂單。

## 六款商品草稿匯入

```sh
npm run catalog:preview
npm run catalog:import
npm run catalog:verify
```

preview 只預覽，不寫入。import 僅允許本機 enso_local，將既有六款名稱與台幣價格寫入為未上架草稿，庫存設為零，不複製示範庫存、訂單或營收。每款一張主圖加四張圖庫，三十張完整 WebP 寫入 uploads，再由 API 提供圖片網址。原始 PNG、WebP 與前台資產不變更。

匯入前會依 manifest 驗證原圖、WebP 及 public 複本的校驗碼、格式與尺寸。整批使用同一資料庫交易，有錯誤會全部回滾。穩定商品 ID 與交易鎖防止重跑或同時執行造成重複資料，遇到相同 ID 或品名會跳過，包含已修改及已軟刪除的商品，不會覆寫或復原它們。

verify 使用既有本機 API 及 5175 前端，以新瀏覽器工作階段登入，唯讀檢查初始草稿資料、三十張 API 圖片校驗碼，以及 1440、1024、768、390 寬度的六款編輯預覽。只建立並撤銷該次登入 session，不修改商品。日後人工變更草稿的價格、名稱或狀態後，這項初始驗收可能不再成立，不應為通過測試而還原商品。

2026-10-02 本機匯入前已建立資料庫備份，存於忽略的 .impeccable/review/catalog-import-20261002-004635/enso-before-catalog.dump。備份含私密資料，不可提交 Git。需復原時先另行確認目標，不能直接覆蓋之後新增的資料。

## 資料與安全設計

- 密碼採隨機 salt 加 scrypt 雜湊。登入回傳八小時有效的隨機不透明 Token，資料庫只存 SHA-256 摘要。不是 JWT。登出撤銷 session，停用帳號會立即拒絕既有 session。
- 為相容既有畫面，Token 仍由前端存 Cookie，並透過 Authorization 標頭傳送。這不是 HttpOnly Cookie，仍有 XSS 竊取風險，公開部署前須評估同源 HttpOnly session、CSRF 與 CSP 設定。
- 所有管理路由要求驗證。這一階段只有單店管理員角色，沒有多商店、客服、倉管分級權限。
- 使用參數化 SQL、Zod 伺服器驗證、CORS 來源白名單、Helmet 與流量限制。IP 流量限制是單程序記憶體儲存，多實例部署前需要共用儲存與可信代理設定。
- 金額在資料庫以台幣「分」的整數儲存，API 以元輸入輸出。訂單總額使用原始價格快照與折扣重算，不採信客戶端傳來的 total 或商品價格。
- 商品、優惠券及訂單編輯帶 version，陳舊版本回傳 409，避免靜默覆蓋別人的更新。
- 訂單建立、數量修改、取消與庫存異動在同一交易執行，鎖定相關商品列，失敗回滾。已付款訂單不允許改數量、取消或直接改回未付款。
- 商品刪除是軟刪除。未付款訂單刪除實際為取消並回補庫存，保留資料。批次清空訂單回傳 409，不提供退款功能。
- 圖片要求管理員、每次一張且不超過 3 MB，實際解碼檢查 JPG／PNG／WebP，限制像素並轉為 WebP，去除原始 metadata，存於 PostgreSQL bytea。圖片 URL 可公開讀取，不可上傳私密資料。此設計供小型本機作品，正式上線需規劃儲存配額、物件儲存與備份。
- 庫存變更由伺服器保存管理員、原因及前後數量。後台自建 API 模式會顯示伺服器最近五筆紀錄，展示模式保留 localStorage。

## API 合約

預設 shop path 為 enso，管理路由前綴為 /api/enso/admin。JSON 寫入沿用 `{ "data": { ... } }`，回應具有 success，列表具有 pagination。每頁二十筆。

| Method | Path | 用途 |
| --- | --- | --- |
| GET | /health | 資料庫連線檢查 |
| POST | /admin/signin | username 與 password，回傳 token、expired |
| POST | /api/user/check | 管理員 session 驗證 |
| POST | /logout | 撤銷目前 session |
| GET | /api/enso/products | 公開商品分頁，可用 page 與 category 精確分類篩選 |
| GET | /api/enso/products/all | 全部已上架商品，供現有前台建立分類選單 |
| GET | /api/enso/product/:id | 公開商品詳情，未上架及軟刪除均回傳 404 |
| POST、DELETE | /api/enso/guest/session | 建立或撤銷訪客工作階段，撤銷需訪客 Token |
| GET、POST | /api/enso/cart | 讀取自己的購物車或增加品項數量 |
| PUT、DELETE | /api/enso/cart/:id | 設定數量或移除自己的購物車品項 |
| DELETE | /api/enso/carts | 清空自己的購物車 |
| POST | /api/enso/order | 訪客建立未付款訂單，預設關閉，需版本、金額確認及重試代碼 |
| GET | /api/enso/admin/products | 商品分頁 |
| POST | /api/enso/admin/product | 建立商品 |
| PUT、DELETE | /api/enso/admin/product/:id | 更新或軟刪除商品 |
| POST | /api/enso/admin/upload | multipart 欄位 file-to-upload |
| GET | /uploads/:id | 公開讀取已驗證圖片 |
| GET | /api/enso/admin/inventory/logs | 庫存紀錄，可用 product_id 查最近五筆 |
| GET | /api/enso/admin/orders | 未取消訂單分頁 |
| POST | /api/enso/admin/order | 管理員建立訂單，非公開結帳端點 |
| PUT、DELETE | /api/enso/admin/order/:id | 修改或取消未付款訂單 |
| GET | /api/enso/admin/coupons | 優惠券分頁 |
| POST | /api/enso/admin/coupon | 建立優惠券 |
| PUT、DELETE | /api/enso/admin/coupon/:id | 更新或刪除優惠券 |

建立訂單 data 包含 user（name、email、tel、address）及 items（product_id、qty 陣列），可選 coupon_code 與 message。建立後扣庫存。更新訂單沿用 products 物件與 version，只能改既有品項數量，不能竄改價格或品項 ID。管理前端目前沒有建立訂單表單。

### 公開商品查詢（2026-10-02）

公開查詢不需要管理員 Token，只回傳已上架且未刪除的商品。列表與詳情以相同欄位白名單輸出，包含台幣價格、主圖、圖庫與香氣文案，不包含精確庫存、庫存備註、編輯版本或未知的內部 details 欄位。is_in_stock 代表目前是否有庫存，不代表已保留庫存或可完成付款。已上架但售完的商品仍可顯示，is_in_stock 為 false。

分頁每頁二十筆，排序固定為 created_at 由新到舊，再依 id，pagination 另含 total_items。空資料回傳空陣列、total_pages 為一；超出頁數回傳空陣列。category 省略或空字串表示全部，其餘精確比對。分類查詢使用 SQL 參數，不拼接使用者輸入。分頁資料與總數在同一唯讀一致性快照取得。

回應採 no-store，商品下架後下一次請求立即隱藏。這不會撤回使用者已下載的文字或圖片，uploads 仍是公開的不可變圖片網址，不能當作私密草稿檔案儲存。

目前本機六款商品全部是草稿，因此公開列表回傳零筆是預期結果，不能為了畫面有商品而自動上架。商品查詢端點已符合現有前台 services/product.js 的路徑與主要回應形狀，但前台環境變數仍維持原設定，尚未切換或完成購物 UI 整合。新的訪客 Token 與送單確認欄位未接好前不能直接替換整站 API_BASE。/products/all 是小型目錄的相容端點，大量商品上線前須改成分類專用端點或增量查詢。

### 訪客購物車與未付款訂單（2026-10-02）

新增 002_guest_checkout migration，npm run migrate 按檔名順序執行未套用的版本，整批交易受 advisory lock 保護，重跑不重複建表。既有管理員訂單與庫存紀錄保留。庫存紀錄的操作者可為管理員或訪客，資料庫限制兩者必須且只能提供一種。訪客不是假管理員。

先 POST /api/enso/guest/session 取得隨機 token 與 expired。其後的購物車與送單請求使用 X-Guest-Token 標頭，不能使用管理員 Token 代替。工作階段固定三十天，資料庫只存 Token 雜湊。DELETE guest/session 使其失效，不刪除訂單稽核資料。前端需負責安全保存 Token、到期提示與重建購物車，不能自動重送失敗訂單。此版本沒有會員帳號、跨裝置恢復或到期資料清理排程。

GET cart 回傳 data，包含 carts、total、final_total、total_cents、version 與 can_checkout。價格以台幣元顯示，total_cents 是台幣分。cart 項目有自己的 id、product_id、qty、公開 product、total、final_total、available。下架品項保留供刪除，但不再顯示原商品內容，can_checkout 為 false。

POST cart 的 data 為 product_id 與 qty，重複商品累加數量。PUT cart/:id 的 data 相同，但改成指定數量。最多五十種商品，每種一至一千件，加入時不得超過現有庫存。購物車不預留或扣除庫存，送單時會再次檢查。每位訪客的購物車讀寫及送單以資料庫列鎖序列化，其他訪客的 cart id 無法讀寫。

訪客送單預設回傳 503。只有本機驗證時，才設定 ENABLE_GUEST_CHECKOUT=true 並重啟 API。NODE_ENV=production 拒絕啟用，這不是正式營運上線配置。此工作區未開啟該設定，也未改動購物前台環境變數。

開啟後 POST order 需提供 Idempotency-Key，格式為新的 UUID，body 格式如下：

```json
{
  "data": {
    "user": {
      "name": "測試收件人",
      "email": "customer@example.test",
      "tel": "0900000000",
      "address": "測試地址"
    },
    "message": "",
    "cart_version": 2,
    "expected_total_cents": 98000
  }
}
```

cart_version 與 expected_total_cents 必須來自使用者確認的最新購物車回應。伺服器從資料庫讀取品項與單價，不採信客戶端 items、total、is_paid。版本或金額不一致回傳 409，前端應重新取得購物車，讓使用者確認後使用新 UUID 送出。不能自動接受新的價格。

同一訪客、相同 UUID 及相同有效內容的重試，回傳原 orderId 及送單時總額，不再次扣庫存或清空後來新增的購物車。同一 UUID 改了有效內容則回傳 409。訂單、庫存、異動紀錄、重試紀錄與清空購物車在同一交易提交，任何失敗全部回滾。成功回傳 201，重試回傳 200，具有 orderId、total、payment_required 與 replayed。這是送單回執，不是目前付款或取消狀態查詢，也不回傳收件人資料。

本機版本僅計商品小計，未納入運費、稅額、訪客優惠碼、支付、發票、寄信或自動取消逾期未付款訂單。前台不得顯示付款完成、付款方法已串接或出貨保證。未付款庫存需由管理員確認取消後回補。正式公開前還需要訪客身分與反濫用策略、付款及出貨規則、訂單逾期處理、隱私保留政策、共用 rate-limit 儲存及安全部署驗收。CORS 不是身分驗證，不能取代這些措施。

訪客建立與送單各限制每個 IP 每分鐘十次，另受全域流量限制。Token 是持有者憑證，不能寫入 URL、日誌、公開文件或 Git；目前未使用 Cookie 自動認證訪客，未開啟 credentials CORS。允許來源仍由 CORS_ORIGINS 控制。

## 驗證

```sh
npm run lint
npm test
npm run test:browser
npm audit
```

瀏覽器整合測試另需要根目錄 npm ci 及 npx playwright install chromium。test:browser 啟動 5178 與隨機 API 連接埠，沒有模擬 API，實際讀寫 PostgreSQL。測試使用隨機專用 schema，執行完只刪除自己建立的測試 schema，保留 public 資料。測試拒絕遠端或非 enso_local 資料庫。

2026-10-01：後端 Lint、六項 PostgreSQL 整合測試及 1440／390 寬度實際瀏覽器流程通過。測試涵蓋登入、圖片、商品儲存、庫存原因與持久化、訂單付款標記及 session 撤銷。前端原本十四項單元與十二項攔截 API 瀏覽器測試仍保留。

## 尚未完成與部署界線

公開商品、訪客購物車及建立未付款訂單 API 已實作並通過本機資料庫測試。storefront 副本已串接結帳 UI，另建立隔離展示、GitHub Actions 設定與 Dockerfile.showcase。支付回呼、退款、運費、電子郵件、設備連線、帳號管理、密碼重設、多角色權限與公開部署尚未提供，遠端 CI 尚未執行。這是可執行的展示作品，不是已完成金流的正式電商。

開發 .env.local 含本機 API 地址，不能直接拿建置產物部署。公開部署時需另設定 HTTPS API、CORS、前端環境變數、資料庫權限、備份與圖片容量政策。不要執行 compose down -v，否則會刪除本機資料庫 volume。

實作參考：[Express 安全實務](https://expressjs.com/zh-tw/advanced/best-practice-security/)、[node-postgres 參數化查詢](https://node-postgres.com/features/queries)。
