import { Link } from 'react-router';
export default function Contact() {
  return <section className="shop-page"><h1>關於聯絡與回饋</h1><p>ENSO 目前是面試展示作品，尚未設置客服信箱或訊息寄送服務，因此此頁不收集個人資料。</p><p>若正在面試中體驗，可以直接向作品作者提出問題。購物流程使用虛構收件資料，不會通知客服或安排出貨。</p><Link to="/product">繼續探索商品</Link></section>;
}
