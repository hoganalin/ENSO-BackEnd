# 架構

## 完整面試展示（2026-10-05）

showcase.js 同源提供 /shop/ 購物前台、/ 管理介面、/demo-api/:id API。ShowcaseGate 建立三十分鐘隔離資料區，shared/showcase.js 保存目前分頁的展示憑證。公開商品及購物車呼叫同一套 Express 路由，管理 Token 與訪客 Token 分別驗證。每次建立使用獨立 schema 與固定 search_path，schema 名稱由伺服器產生且白名單驗證，不接受使用者 SQL 識別字。

storefront Redux 管理購物車伺服器狀態。Checkout 保存送單代碼與確認金額，斷線時可重試原單，價格變動則重新確認。不是從 localStorage 假造訂單成功。資料清理及安全限制見 [展示指南](INTERVIEW-DEMO.md)。以下 Cookie 與 localStorage 段落描述仍保留的原管理模式，不是完整展示的認證方式。

## 執行流程

main.jsx → Redux Provider → App → Hash Router → ProtectedRoute → AdminLayout → 管理頁。

路由由 src/router.jsx 定義，根路由導向登入。七個管理頁為總覽、商品、訂單、庫存、優惠券、金流與設備。舊的 /admin/agent 導回 /admin，舊元件保留在原始碼，但不在目前導覽與總覽資料流程中使用。

## 資料流程

畫面呼叫 service/adminProducts.js、adminOrders.js 或 coupon.js，經 service/api.js 的 Axios 實例送往既有 API。正式請求使用 Cookie 中的 Token 加入 Authorization。ProtectedRoute 驗證管理員狀態。

展示 Token enso-demo-token 會啟用攔截器，操作交由 service/demoStore.js，使用 localStorage 保存商品、訂單與優惠券。正式與展示路徑共用元件和 service 介面，不改 API payload。示範上傳只回傳原有圖片網址。

Redux 僅管理通知。Login 與訂單使用 React Hook Form，其餘表單使用 React state。

## 登入與連線失敗

session.js 集中讀取及清除 Cookie、建立登入 Cookie 與分類登入錯誤訊息。保持登入時兼容秒與毫秒的有效期限，拒絕失敗或缺少 Token 的登入回應。

ProtectedRoute 只有收到 success 為 true 才放行。驗證拒絕或 401／403 會清除登入 Cookie 並回到登入；連線故障及服務暫時失效則保留 Cookie，提供重新確認按鈕。卸載頁面時取消尚未完成的驗證請求。

登入、狀態驗證、登出及管理 API 設有十五秒逾時。管理 API 401 會清除登入資料並導回登入，其他失敗交給頁面或表單提示，不再跳出阻塞操作的原生 alert。這些是前端處理，不能取代伺服器權限檢查。

## 商品與圖片

ProductModal 保留 imageUrl、imagesUrl 以及既有產品欄位。送出時轉換價格、庫存及啟用值型別，過濾空圖庫網址並限制五張。ProductImage 以失敗的 URL 為狀態，換成不同 URL 後可以重新載入。

Dialog 使用原生 HTML dialog 的 showModal、Escape 與焦點管理，關閉後恢復先前焦點及頁面捲動。商品、訂單、庫存、優惠券、設備及導覽說明共用此元件。

## 樣式

assets/index.css 定義 ENSO 色彩與共用表格、表單、對話框、響應式。Bootstrap 在獨立且較低優先序的 cascade layer，避免覆蓋 Tailwind 工具類。Login 使用 CSS Module，不依賴舊式裝飾背景。Tailwind 由本機 PostCSS 編譯，不再載入 Play CDN。字型與部分圖示仍使用外部樣式資源，因此不能宣稱全站已可離線使用。

## 重要邊界

- 圖片 API 回傳 URL，前端不自行儲存檔案或更改伺服器格式。
- 庫存仍透過更新商品 API，沒有獨立 inventory endpoint。
- 庫存調整紀錄只存目前瀏覽器，沒有跨裝置同步。
- 總覽只取得第一頁商品和訂單，圖表必須標示資料範圍。
- 金流不合成缺少的付款方式，最多取得十頁訂單。
- 設備狀態、校準、歷史測值為前端模擬，不具真實 MQTT 或 WebSocket 連線。
- 自建 API 位於 server，使用 Express 與 PostgreSQL。詳細合約及資料保護規則見 [後端說明](../server/README.md)。

## 自建後端（2026-10-01）

React service → Express 驗證與欄位檢查 → PostgreSQL 交易與參數化 SQL。前端 VITE_API_MODE=self-hosted 啟用對應訂單限制與伺服器庫存紀錄，展示 Token 仍只走 localStorage。

server/src/app.js 管理 HTTP、中介層、登入與圖片。catalog.js 處理商品、庫存紀錄與優惠券，orders.js 處理訂單及庫存交易。migrations 記錄資料表版本，scripts 提供獨立本機初始化與管理員建立。測試在隨機 schema 隔離執行，不覆蓋 public 資料。

2026-10-02 新增 storefront.js 作為公開唯讀商品路由，沿用同一 products 資料表，只查詢 is_enabled 為 true 且 deleted_at 為空的資料。公開序列化使用獨立欄位白名單，不重用包含內部資訊的管理用 productView。商品分頁在唯讀 repeatable-read 交易取得總數與結果，分類以 SQL 參數傳入。管理路由的驗證不變，購物前台尚未切換新 API。

同日新增 guestCart.js，使用獨立 X-Guest-Token，不與管理員 session 混用。guest_sessions 的列鎖序列化單一訪客的購物車及送單，checkout_requests 保存每位訪客的送單代碼與有效內容摘要。訪客及管理員共用 orders.js 的 createOrder，在相同交易內依穩定商品 ID 順序鎖庫存、計算價格、建立訂單及紀錄異動。訪客操作不冒用管理員身分，inventory_logs 的 actor_id 與 guest_id 由資料庫約束限定恰好一種。

送單成功後才刪除該訪客購物車，重試先查持久化回執，避免重複扣庫存或誤清新購物車。訪客送單預設不開放，僅提供本機功能驗證，不包含支付或配送成本計算。migrate.js 依序執行尚未記錄的 SQL migration，既有資料透過增量 migration 保留。

自建登入不是 JWT，而是資料庫可撤銷的不透明 session Token。前端為相容既有介面仍存可由 JavaScript 讀取的 Cookie，伺服器要求 Authorization 標頭。公開部署前仍需評估 HttpOnly／CSRF、HTTPS 及多角色權限。

自建模式庫存仍使用商品更新端點，但增加 version 防止覆蓋，異動與庫存紀錄在同一交易完成。後台會透過 inventory/logs 讀取伺服器紀錄，取代此模式下的本機紀錄。其他上述展示或舊 API 限制不應解讀為自建模式的伺服器行為。
