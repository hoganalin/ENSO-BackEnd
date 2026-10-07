# ENSO 面試展示指南

此版本把 React 購物前台、React 營運後台及 Express／PostgreSQL API 放在同一 repository。原本前台資料夾不覆寫，本版在 storefront 目錄獨立維護。

## 本機完整啟動

需要 Node.js 22.12 以上與 Docker。先在 repository 根目錄執行以下命令。首次安裝才執行 init:local，既有 server/.env 不要覆寫。

```sh
npm ci
npm ci --prefix storefront
npm ci --prefix server
cd server
npm run init:local
npm run db:up
npm run migrate
cd ..
npm run build:showcase
cd server
npm run showcase
```

開啟 http://127.0.0.1:3002/shop/，點「開始完整體驗」。這是本機網址，不能直接寄给面試官。server/.env 已存在時跳過 init:local。展示入口不需要管理員密碼，也不需要執行 seed 或匯入正式商品。

## 三分鐘操作路線

1. 商品列表搜尋「琥珀黃昏」，查看主圖與四張圖庫。
2. 加入購物車，調整數量，重新整理確認資料仍在。
3. 使用預填虛構收件資料，建立未付款訂單。不要填真實個資。
4. 點「到後台查看這筆訂單」，檢查收件資料、數量、台幣小計。
5. 取消未付款訂單，開啟庫存頁確認回補及異動原因。
6. 在商品頁修改價格或上架狀態，回前台重新整理確認同步。

## 真實實作與展示界線

| 項目 | 狀態 |
| --- | --- |
| 商品查詢、圖片、CRUD、購物車、訂單、庫存、優惠券管理 | 真實 API 與 PostgreSQL 資料 |
| 送單防重、庫存交易與版本衝突 | 伺服器檢查與資料庫交易 |
| 商品價格及數量 | 展示資料，以 NT$ 計價，不表示正式販售 |
| 付款標記、營收彙整 | 依展示訂單狀態計算，沒有實際收款 |
| 設備監控 | 模擬資料，未接感測器 |
| 會員、客服寄信、支付、物流、發票 | 未提供，介面清楚說明 |
| GitHub Actions | 已建立設定，需推送後取得遠端執行結果 |
| 公開網址 | 尚未部署本版，不以舊版網址替代 |

## 隔離與安全

每次開始建立隨機 PostgreSQL schema，六款商品各有十二件展示庫存。管理員與訪客各用獨立隨機 Token，資料庫僅保存摘要，瀏覽器以 sessionStorage 保存持有者憑證，不放進 URL。此設計適合無真實個資的示範，不是正式會員登入方案。關閉分頁或離開展示無法恢復原憑證。

空間三十分鐘到期，即拒絕 API 存取。服務運作時每分鐘清除到期且已登記的展示 schema。服務休眠或停機期間不保證立即實體刪除，重啟後恢復清理。最多同時十個空間，每 IP 每小時最多建立六次，API 每分鐘一百八十次。限流使用單程序記憶體，重新啟動會重設，不能直接擴展為多實例。

展示商品最多三十筆、訂單四十筆、優惠券二十筆、上傳十張，單張上限 3 MB。容量檢查不是跨請求原子配額，不視為惡意大量併發防護。正式公開需獨立資料庫、單實例、資源配額與監控，不共用其他專案正式資料。

同一瀏覽器分頁從前台切換後台，使用同一展示空間。公開商品查詢不需管理員權限，管理修改需管理員 Token。跨空間憑證不能操作別人的購物車或管理資料。未開啟原本 public 商品草稿的下單。

結帳保存送單代碼與內容，斷線重試會回傳原訂單，避免再次扣庫存。價格或購物車版本變更時要求重新確認，不自行接受新價格。

## 部署方式與待辦

已提供 Dockerfile.showcase。需另外建立專用 PostgreSQL，帳號需能在該資料庫建立及刪除 schema。不要使用其他應用程式的資料庫、超級使用者或正式顧客資料。資料庫連線加密依供應商配置，不在程式內關閉憑證驗證。

```sh
docker build -f Dockerfile.showcase -t enso-showcase .
```

環境變數：DATABASE_URL、SHOWCASE_PUBLIC_URL（實際 HTTPS 網站 origin，不含路徑）、PORT（平台提供，預設 3002）。只有部署在一層已知可信代理後才設 TRUST_PROXY=1。執行入口為 node server/scripts/showcase.js，不是原本管理 API 的 start。

尚需在目標平台確認方案費用、資料庫容量、休眠與保留限制，完成公開 HTTPS 網址、另一部裝置及 Safari 實測，再將 URL 加入履歷。Docker 配置不等同已部署。

## 面試說明重點

這是 AI 輔助開發與人工驗證的作品。可以說明需求拆解、資料契約、庫存交易、錯誤重試與測試結果，不應宣稱所有程式均獨立手寫、已有正式銷售、真實金流或企業級多租戶隔離。

主要程式入口：server/src/guestCart.js（購物車與防重）、server/src/orders.js（訂單與庫存）、server/src/showcase.js（隔離展示）、storefront/src/components/Checkout.jsx（確認與重試）。本版語言為 JavaScript／JSX，未使用 TypeScript 或 ORM。
