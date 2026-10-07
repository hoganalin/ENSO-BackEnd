import { Link } from "react-router";

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div className="footer__intro">
          <Link to="/" className="footer__wordmark">ENSO</Link>
          <p>把香氣留給閱讀、伸展、睡前，還有每個想讓生活亮一點的片刻。</p>
          <span>DIFFERENT DAYS, A BRIGHTER YOU</span>
        </div>

        <nav className="footer__links" aria-label="頁尾導覽">
          <div>
            <h2>SHOP</h2>
            <Link to="/product">線香系列</Link>
            <Link to="/cart">購物車</Link>
          </div>
          <div>
            <h2>ENSO</h2>
            <Link to="/about">品牌故事</Link>
            <Link to="/faq">常見問題</Link>
          </div>
          <div>
            <h2>HELP</h2>
            <Link to="/contact">聯絡我們</Link>
            <Link to="/login">會員登入</Link>
          </div>
        </nav>
      </div>
    </footer>
  );
}

export default Footer;
