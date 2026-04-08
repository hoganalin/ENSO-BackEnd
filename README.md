# ENSO 智慧倉儲與營運數據監控系統

這不只是一個電商後台，而是一個結合**工業物聯網 (IoT)** 與**商業決策分析 (BI)** 的高價值資產管理系統。
我將傳統的電商訂單系統，升級為具備「智慧倉儲監控」能力的前端營運儀表板，專門負責控管對環境極度敏感的頂級香氛（如芽莊沈香、老山檀香）資產。

---

## 💡 核心亮點 (Key Highlights)

- **🚀 實時 IoT 數據可視化 (Real-time IoT Dashboard)**
  - 運用前方資料模擬技術（Custom Hook + clearInterval 內存優化），實作類似 **MQTT / WebSocket** 的高頻率即時溫濕度與煙霧數據流。
  - 當數據異常時（如濕度超過 60%）自動觸發 `Alert` 危險警報狀態，展現實時前端交互處理能力。

- **📊 商業決策思維與數據聚合 (Data Hierarchy & BI)**
  - **總覽面板 (Overview)：** 給營運總監的第一視角，利用 `Recharts` 繪製 YoY 營收趨勢圖 (AreaChart) 與產品佔比 (PieChart)，並即時展示 A/B 倉加權平均狀態。
  - **設備監管中心 (Diagnostic View)：** 給硬體維修工程師排查問題用。精細列出位於「沈香儲藏室」、「老山檀香架」等單一感測器的連線狀態 (Heartbeat)、測值與電池電量。

- **✨ 現代化品牌格調 (Fine-tuned UI/UX)**
  - 拋棄傳統僵硬的後台模板，統一採用 **Inter** 現代字體。
  - 導入深色模式巧思、毛玻璃質感導航、與流暢的 Tailwind/Bootstrap 自定義 CSS 變數，打造符合 ENSO 高級香氛品牌定位的 Premium 體驗。

---

## 🛠️ 技術棧 (Tech Stack)

此專案專注於發揮現代化前端框架的最大效能：

- **核心架構：`React 19`** - 運用併發模式渲染，確保大量且高頻率的 IoT 圖表更新不會阻斷主執行緒。
- **路由管理：`React Router 7`** - 導入深層嵌套路由機制，配合 `end` 屬性解決側邊列的精準路徑匹配 (Exact Match) 難題。
- **資料可視化：`Recharts`** - 摒棄直接操作 Canvas，利用組件化的方式實心 SVG 圖表，大幅提昇維護性。
- **響應式與切版：`Bootstrap 5` + `Vanilla CSS`** - 全設備兼容，確保儀表板在平板與手機端皆具高度易讀性 (Scannability)。
- **操作回饋：`SweetAlert2` + `React-Toastify`** - 取代原生的 `alert`，提供專業且非阻斷式的使用者回饋。

---

## 📈 IoT 面板架構設計邏輯

為解決傳統後台「資訊過載」的問題，本儀表板嚴格遵守**關注點分離 (Separation of Concerns)** 原則：

1. **聚合型指標 (KPI)：** 頁面上方保留企業最在意的「總營收、客訴率、環境健康度」。
2. **終端狀態偵測：** 設備列表能判別 `Online` 與 `Offline`，如果終端設備超過 30 秒沒有發送 MQTT Heartbeat 心跳包，即中斷連線並自動變灰，模擬真實工業場景。
3. **即時日誌 (Live Log)：** 在總覽畫面右下角實作 Terminal 風格的即時訊息流，掌握倉庫各節點感回報狀態。

---

## 🚀 快速開始 (Quick Start)

1. **Clone 專案：**
   ```bash
   git clone [your-repo-url]
   ```
2. **安裝依賴套件：**
   ```bash
   npm install
   ```
3. **啟動 Vite 開發伺服器：**
   ```bash
   npm run dev
   ```
4. **準備迎接華麗的資料流動畫！** 訪問 `http://localhost:5173/#/admin`

---

© 2025 ENSO Incense Smart Warehouse Dashboard. All Rights Reserved.
