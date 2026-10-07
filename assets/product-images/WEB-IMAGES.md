# ENSO 網頁圖片版本

日期：2026-09-30

三十張概念圖已各製作三種 WebP 尺寸，共九十張。已建立 public/products/enso-v1 複本供本機展示模式使用，正式商品資料未修改，未上傳或部署。

## 尺寸與用途

| 版本 | 尺寸 | 張數 | 合計大小 | 每張大小 | 建議用途 |
| --- | --- | --- | --- | --- | --- |
| full | 1122 × 1402 | 三十張 | 5.77 MiB | 128～335 KiB | 商品詳情、圖庫、後台上傳 |
| card | 560 × 700 | 三十張 | 1.69 MiB | 40～97 KiB | 商品卡片 |
| thumb | 240 × 300 | 三十張 | 0.42 MiB | 9～21 KiB | 後台列表縮圖 |

三十張 PNG 原稿共 65.2 MiB。完整尺寸 WebP 比原稿減少 91.14％。九十張 WebP 合計約 7.88 MiB，網站應按顯示用途選取，不能一次載入全部版本。

## 品質與保留原則

- 全部保持原比例，未裁切、未放大、未重繪。
- WebP 為有損壓縮，細微紙紋可能較柔和，並非逐像素無損。
- 全部輸出完成解碼及尺寸檢查，原稿 SHA-256 前後一致。
- 目視抽查琥珀黃昏主圖與茉莉月夜細節的原稿／完整圖，以及晨林中圖、龍血縮圖、白鼠尾草比例中圖、春分情境縮圖，未見新增裁切或明顯破圖。不是九十張逐一人工驗收。
- 圖片文字與配件仍是生成式概念，不代表實體商品資料核准。
- 網頁版不攜帶提示詞中繼資料，提示詞仍保留在 PNG 原稿與 prompts 目錄。
- [網頁素材清單](web-manifest.json)記錄來源、替代文字、尺寸、大小、用途及校驗碼。

## 圖片預覽

以下使用中圖預覽，點選開啟完整尺寸 WebP。原稿仍可從[原始素材目錄](README.md)查看。

### 琥珀黃昏

| 主圖 | 包裝細節 | 生活情境 | 材質情境 | 比例情境 |
| --- | --- | --- | --- | --- |
| [![琥珀黃昏主圖概念圖](web-v1/amber-twilight/amber-twilight-main-v1-card.webp)](web-v1/amber-twilight/amber-twilight-main-v1-full.webp) | [![琥珀黃昏包裝細節概念圖](web-v1/amber-twilight/amber-twilight-detail-v1-card.webp)](web-v1/amber-twilight/amber-twilight-detail-v1-full.webp) | [![琥珀黃昏生活情境概念圖](web-v1/amber-twilight/amber-twilight-lifestyle-v1-card.webp)](web-v1/amber-twilight/amber-twilight-lifestyle-v1-full.webp) | [![琥珀黃昏材質情境概念圖](web-v1/amber-twilight/amber-twilight-material-v1-card.webp)](web-v1/amber-twilight/amber-twilight-material-v1-full.webp) | [![琥珀黃昏比例情境概念圖](web-v1/amber-twilight/amber-twilight-scale-v1-card.webp)](web-v1/amber-twilight/amber-twilight-scale-v1-full.webp) |

### 晨林沈靜

| 主圖 | 包裝細節 | 生活情境 | 材質情境 | 比例情境 |
| --- | --- | --- | --- | --- |
| [![晨林沈靜主圖概念圖](web-v1/forest-morning/forest-morning-main-v1-card.webp)](web-v1/forest-morning/forest-morning-main-v1-full.webp) | [![晨林沈靜包裝細節概念圖](web-v1/forest-morning/forest-morning-detail-v1-card.webp)](web-v1/forest-morning/forest-morning-detail-v1-full.webp) | [![晨林沈靜生活情境概念圖](web-v1/forest-morning/forest-morning-lifestyle-v1-card.webp)](web-v1/forest-morning/forest-morning-lifestyle-v1-full.webp) | [![晨林沈靜材質情境概念圖](web-v1/forest-morning/forest-morning-material-v1-card.webp)](web-v1/forest-morning/forest-morning-material-v1-full.webp) | [![晨林沈靜比例情境概念圖](web-v1/forest-morning/forest-morning-scale-v1-card.webp)](web-v1/forest-morning/forest-morning-scale-v1-full.webp) |

### 龍血沉香

| 主圖 | 包裝細節 | 生活情境 | 材質情境 | 比例情境 |
| --- | --- | --- | --- | --- |
| [![龍血沉香主圖概念圖](web-v1/dragon-resin/dragon-resin-main-v1-card.webp)](web-v1/dragon-resin/dragon-resin-main-v1-full.webp) | [![龍血沉香包裝細節概念圖](web-v1/dragon-resin/dragon-resin-detail-v1-card.webp)](web-v1/dragon-resin/dragon-resin-detail-v1-full.webp) | [![龍血沉香生活情境概念圖](web-v1/dragon-resin/dragon-resin-lifestyle-v1-card.webp)](web-v1/dragon-resin/dragon-resin-lifestyle-v1-full.webp) | [![龍血沉香材質情境概念圖](web-v1/dragon-resin/dragon-resin-material-v1-card.webp)](web-v1/dragon-resin/dragon-resin-material-v1-full.webp) | [![龍血沉香比例情境概念圖](web-v1/dragon-resin/dragon-resin-scale-v1-card.webp)](web-v1/dragon-resin/dragon-resin-scale-v1-full.webp) |

### 白鼠尾草淨化

| 主圖 | 包裝細節 | 生活情境 | 材質情境 | 比例情境 |
| --- | --- | --- | --- | --- |
| [![白鼠尾草淨化主圖概念圖](web-v1/white-sage/white-sage-main-v1-card.webp)](web-v1/white-sage/white-sage-main-v1-full.webp) | [![白鼠尾草淨化包裝細節概念圖](web-v1/white-sage/white-sage-detail-v1-card.webp)](web-v1/white-sage/white-sage-detail-v1-full.webp) | [![白鼠尾草淨化生活情境概念圖](web-v1/white-sage/white-sage-lifestyle-v1-card.webp)](web-v1/white-sage/white-sage-lifestyle-v1-full.webp) | [![白鼠尾草淨化材質情境概念圖](web-v1/white-sage/white-sage-material-v1-card.webp)](web-v1/white-sage/white-sage-material-v1-full.webp) | [![白鼠尾草淨化比例情境概念圖](web-v1/white-sage/white-sage-scale-v1-card.webp)](web-v1/white-sage/white-sage-scale-v1-full.webp) |

### 茉莉月夜

| 主圖 | 包裝細節 | 生活情境 | 材質情境 | 比例情境 |
| --- | --- | --- | --- | --- |
| [![茉莉月夜主圖概念圖](web-v1/jasmine-night/jasmine-night-main-v1-card.webp)](web-v1/jasmine-night/jasmine-night-main-v1-full.webp) | [![茉莉月夜包裝細節概念圖](web-v1/jasmine-night/jasmine-night-detail-v1-card.webp)](web-v1/jasmine-night/jasmine-night-detail-v1-full.webp) | [![茉莉月夜生活情境概念圖](web-v1/jasmine-night/jasmine-night-lifestyle-v1-card.webp)](web-v1/jasmine-night/jasmine-night-lifestyle-v1-full.webp) | [![茉莉月夜材質情境概念圖](web-v1/jasmine-night/jasmine-night-material-v1-card.webp)](web-v1/jasmine-night/jasmine-night-material-v1-full.webp) | [![茉莉月夜比例情境概念圖](web-v1/jasmine-night/jasmine-night-scale-v1-card.webp)](web-v1/jasmine-night/jasmine-night-scale-v1-full.webp) |

### 春分雨露

| 主圖 | 包裝細節 | 生活情境 | 材質情境 | 比例情境 |
| --- | --- | --- | --- | --- |
| [![春分雨露主圖概念圖](web-v1/spring-dew/spring-dew-main-v1-card.webp)](web-v1/spring-dew/spring-dew-main-v1-full.webp) | [![春分雨露包裝細節概念圖](web-v1/spring-dew/spring-dew-detail-v1-card.webp)](web-v1/spring-dew/spring-dew-detail-v1-full.webp) | [![春分雨露生活情境概念圖](web-v1/spring-dew/spring-dew-lifestyle-v1-card.webp)](web-v1/spring-dew/spring-dew-lifestyle-v1-full.webp) | [![春分雨露材質情境概念圖](web-v1/spring-dew/spring-dew-material-v1-card.webp)](web-v1/spring-dew/spring-dew-material-v1-full.webp) | [![春分雨露比例情境概念圖](web-v1/spring-dew/spring-dew-scale-v1-card.webp)](web-v1/spring-dew/spring-dew-scale-v1-full.webp) |

## 使用與重製

上傳主圖及四張圖庫時選 full 版本，目前每張均低於後台三 MB 限制。現有 API 只接受主圖與圖庫網址，card 和 thumb 不額外塞入 imagesUrl。展示模式圖片元件已依用途選擇對應來源，正式 API 與自訂圖片網址維持原值。

轉檔程式位於 [tools/build-web-images.mjs](tools/build-web-images.mjs)，使用 Node.js 與 Sharp。若環境已安裝 Sharp，可執行 node 後接腳本路徑。也可用 --sharp 指定現有 Sharp 套件的絕對目錄，不需要修改專案依賴。

程式先核對原稿校驗碼，發現同名輸出就停止，不覆蓋已產生圖片。再次轉檔應另設新版本目錄。執行成功時將完整檢查結果以 JSON 輸出，現存 web-manifest.json 為本次結果。

正式上架前仍需確認各款圖片與命名，取得公開網址並備份原 URL。這個壓縮步驟不代表上架或部署已完成。
