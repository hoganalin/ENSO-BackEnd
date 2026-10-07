# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

品牌營運者、倉儲與客服團隊，使用後台處理商品、訂單、庫存、優惠券、金流與設備狀態。

## Product Purpose

ENSO 後台是品牌營運工作台，讓團隊能在同一個介面快速掌握營收與庫存，維護商品資料，處理訂單，並追蹤營運設備狀態。

## Operating Context

使用者會在桌機處理大量資料，也會在平板或手機查看庫存、訂單與低庫存提醒。展示模式使用 localStorage 保留 CRUD 結果。新增的本機自建模式使用 Express、PostgreSQL 與可撤銷的 session Token，不是 JWT；尚未公開部署。

## Capabilities and Constraints

- 保留目前 React、Vite、React Router、Redux Toolkit、Axios 與既有 API 資料格式。
- 商品主圖使用 `imageUrl`，圖庫使用 `imagesUrl`，最多五張圖庫圖片。
- 後台管理頁包含總覽、商品、訂單、庫存、優惠券、金流與設備。
- `/admin/agent` 維持隱藏並導回總覽。
- 介面需要支援載入中、錯誤、空資料、成功、停用與低庫存狀態。

## Brand Commitments

- ENSO 前台的奶油米色、深藍、螢光黃綠與橘紅色是後台的品牌基礎。
- 後台使用直白的營運用語，優先確保掃讀與操作效率。
- 現有 ENSO 商品圖片原檔必須保留，後續透過商品圖片對應表管理。

## Evidence on Hand

- 現有後台 React 頁面、API service、demoStore 與商品 CRUD 流程。
- 前台 ENSO 圖片資產位於 `C:\Users\Rogan\OneDrive\文件\sideproject\vite-reacthomework-finalweek-main\vite-reacthomework-finalweek-main\assets`。
- 六個 demo 商品：琥珀黃昏、晨林沈靜、龍血沉香、白鼠尾草淨化、茉莉月夜、春分雨露。

## Product Principles

1. 先讓營運人員快速完成任務，再呈現品牌個性。
2. 商品圖片要能被辨識、管理與延伸，而不是只有裝飾。
3. 狀態、錯誤與下一步要在幾秒內被理解。
4. 桌機資料密度與手機可操作性必須同時成立。
