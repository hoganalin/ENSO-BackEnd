import { Link } from 'react-router';
export default function About() {
  return <section className="shop-page"><h1>讓香氣，貼近日常。</h1><p>ENSO 是以閱讀、伸展、靜心與一天收尾為靈感的概念品牌作品。奶油米色、深藍包裝與明亮色彩，呈現年輕而有活力的生活想像。</p><h2>從選香到營運</h2><p>這份作品不只呈現商品，也展示購物車、訂單、商品圖片與庫存管理如何交換資料。所有價格皆以新臺幣標示，訂單只用於系統操作示範。</p><h2>關於商品與圖片</h2><p>六款香氣及其包裝為概念設計，不代表已生產或上市。本站未宣稱天然成分、低煙專利、療效或實際銷售成果。</p><Link to="/product">探索六款概念香氣</Link></section>;
}
