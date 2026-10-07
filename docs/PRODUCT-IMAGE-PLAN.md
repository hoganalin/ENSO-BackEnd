# ENSO 商品圖片規劃

## 最新狀態（2026-10-02）

六款共三十張完整 WebP 已匯入自建本機 PostgreSQL uploads，商品透過本機 API 的 /uploads/:id 載入。這不是公開部署，以下較早段落中「未寫入 API」為當時紀錄。

- 六款均為未上架草稿，庫存零，不複製展示庫存。
- 售價沿用既有台幣數字：琥珀黃昏 980、晨林沈靜 1280、龍血沉香 1980、白鼠尾草淨化 280、茉莉月夜 200、春分雨露 520。
- 圖片為概念素材。成分、產地、規格與包裝英文名稱仍待確認，草稿不使用未驗證的原料宣稱。
- 三十張 API 圖片與 WebP 素材逐一核對 SHA-256 相符。原 PNG 與 public 複本校驗通過，未被刪除或覆蓋。
- 1440、1024、768、390 寬度確認六款各五張預覽載入，重新整理仍存在，編輯視窗與頁面未出現水平溢位。
- 匯入流程、可重跑保護及本機備份見 [自建後端說明](../server/README.md)。

## 視覺提案進度

2026-09-30 使用者回覆「可」，核准[六款系列視覺提案](visual-proposals/README.md)的包裝系列感、識別色與情境，可開始製作獨立主圖及圖庫。拼版不直接裁切作為正式主圖，沒有寫入商品 API。實際產出另以素材清單記錄。

## 共通規格

- 主圖：直式 4:5，商品包裝或主體置中偏上，保留足夠留白。
- 圖庫：最多五張，依序安排包裝細節、生活情境、香氣或材質特寫、比例與使用情境。
- 後台縮圖：固定比例容器，避免因列表高度變化而裁切商品主體。
- 替代文字：使用「商品名稱＋圖片用途」，例如「琥珀黃昏商品主圖」。
- 現有前台圖片原檔保留，不直接刪除或覆蓋；替換前先建立商品與圖片的對應。

## 商品方向

| 商品 | 主圖方向 | 情境語言 |
| --- | --- | --- |
| 琥珀黃昏 | Golden Hour、琥珀、木質、夕陽與深藍包裝 | 閱讀、午後、沉澱 |
| 晨林沈靜 | 清晨山林、綠意、濕潤空氣與柔和自然光 | 早晨、呼吸、安定 |
| 龍血沉香 | 深色樹脂、夜間、沉穩木質與強烈對比 | 夜晚、專注、儀式 |
| 白鼠尾草淨化 | 白色植物、明亮留白與空間淨化 | 整理空間、清新、重啟 |
| 茉莉月夜 | 月光、白色花朵與柔和藍色 | 睡前、放鬆、柔和 |
| 春分雨露 | 春季雨水、嫩綠與露珠 | 春日、清新、自然 |

## 資料對應

商品主圖寫入 `imageUrl`，其他圖片依序寫入 `imagesUrl`。商品編輯畫面需要同時顯示主圖預覽、圖庫欄位、替代文字與圖片載入失敗狀態。

## 現有資產盤點

以下檔案保留在原前台專案，這次沒有移動、刪除、覆蓋或批次上架。

| 前台相對路徑 | 用途與處理 |
| --- | --- |
| assets/products/enso-golden-hour-package.png | Golden Hour 包裝原圖，作為深藍盒裝系列的參考 |
| assets/plates/incense-package.png | 包裝視覺參考，保留原稿 |
| assets/plates/sunlit-room.png | 夕陽生活情境參考，不能當作所有商品的實拍照 |
| assets/plates/dock-product.png | 前台購買區商品圖，保留原稿 |
| src/images/hero1.jpg 至 hero4.jpg／hero3.png | 既有情境素材，未更動 |
| src/images/空間淨化.png、放鬆紓壓.png、冥想香氣.png | 原有用途分類素材，未更動 |

舊版 demoStore 六款商品曾共用三張雲端圖片。目前本機展示模式已接入各款獨立概念主圖及四張圖庫，正式 API 圖片不變。舊雲端來源保留於相容更新規則，沒有刪除雲端或前台原檔。

## 六款交付對應表

2026-09-30 已產出六款共三十張獨立概念圖。每款一張主圖及四張圖庫，保留第五個圖庫欄位給日後補充。素材保存於 assets/product-images，各款有獨立資料夾，尚未取得公開 URL 或寫入 API。

[查看三十張圖片預覽與提示詞](../assets/product-images/README.md)／[素材對應清單](../assets/product-images/manifest.json)。

| 商品 | 檔名前綴 | imageUrl | imagesUrl 順序 |
| --- | --- | --- | --- |
| 琥珀黃昏 | amber-twilight | amber-twilight-main-v1.png | detail、lifestyle、material、scale |
| 晨林沈靜 | forest-morning | forest-morning-main-v1.png | detail、lifestyle、material、scale |
| 龍血沉香 | dragon-resin | dragon-resin-main-v1.png | detail、lifestyle、material、scale |
| 白鼠尾草淨化 | white-sage | white-sage-main-v1.png | detail、lifestyle、material、scale |
| 茉莉月夜 | jasmine-night | jasmine-night-main-v1.png | detail、lifestyle、material、scale |
| 春分雨露 | spring-dew | spring-dew-main-v1.png | detail、lifestyle、material、scale |

圖庫檔名使用同款前綴，例如 amber-twilight-lifestyle-v1.png。以上是本機檔名，不可直接作為正式 imageUrl。Golden Hour 與琥珀黃昏目前只能視為視覺方向對應，包裝名稱、成分與規格須經確認，不能直接宣稱為同一款真實商品。

這批為生成式概念圖，並非實拍。系列方向已確認，不等同於每張圖片、英文命名或真實商品資料核准。道具不代表配件或成分，比例圖不保證實際尺寸。材質圖偏情境展示，精準微距資訊仍需另行準備。

## 拍攝或製圖規格

- 目標規格為 1600 × 2000px、4：5、sRGB、WebP／JPG。本次實際產出三十張 1122 × 1402px PNG，接近四比五，不宣稱已達目標解析度，也未放大或轉檔。
- PNG 為保留原稿，合計約 65.2 MiB。已另存九十張 WebP，包含完整尺寸、中圖及縮圖各三十張。完整尺寸合計約 5.77 MiB，減少 91.14％。所有檔案解碼及尺寸檢查通過，部分代表圖片已目視抽查，仍待逐款選用。詳見[網頁圖片規格與預覽](../assets/product-images/WEB-IMAGES.md)。
- 包裝保持深藍、白字與一致排版，商品各自使用琥珀、森林綠、樹脂紅、鼠尾草白、月光藍、嫩綠識別色。
- 商品主體保留四周安全留白，不把品名、包裝頂端或線香裁掉。
- 不在素材中加入未驗證的療效、天然認證、容量、燃燒時長或產地宣稱。
- 前台情境圖可 cover，後台列表與編輯主圖用 contain；不要用裁切修補不同包裝。
- 上架前逐款確認名稱、原料與圖像一致，檢查網址可公開載入，再寫入 imageUrl／imagesUrl。
- 舊圖 URL 與原檔保留至新圖確認完成，不進行整批覆蓋。

## 本機展示接入

- 網頁用圖複本位於 public/products/enso-v1，共九十張 WebP，與網頁素材清單校驗碼一致。PNG 原稿不放入 public。
- 展示商品資料保留 imageUrl 與 imagesUrl 格式，填入完整尺寸圖片網址。列表及庫存使用縮圖，商品編輯主圖使用中圖，圖庫預覽使用縮圖。
- 圖片網址配合 Vite base，支援本機根目錄及建置的 /ENSO-BackEnd/ 子路徑。
- 只在展示模式、且來源完全符合已知本機圖檔時選用尺寸版本，不重寫正式 API 或自訂網址。
- 舊展示資料僅更新 ID、名稱、主圖皆符合預設，且未自行新增圖庫的六款商品。其他欄位及自行編輯的圖片不覆蓋，不補回已刪商品。
- 更新前備份至 localStorage 的 enso_demo_products_before_images_v1，成功後用 enso_demo_image_version 記錄版本。儲存失敗時保留既有資料。不必重置整份展示資料。
- 展示上傳仍為模擬，輪流回傳六款本機主圖，不把使用者選取檔案傳到雲端。
- 商品頁標示概念圖片，所有金額以新台幣 NT$ 表示。既有價格數字不換算，正式商品、帳號及交易資料未寫入。
