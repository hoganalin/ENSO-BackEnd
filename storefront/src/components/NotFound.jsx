import { Link } from "react-router";

function NotFound() {
  return (
    <main className="not-found-page">
      <div className="not-found-page__panel">
        <p>404</p>
        <h1>這個片刻<br />還沒有被點亮。</h1>
        <span>你找的頁面不存在，或已移到別的地方。</span>
        <Link to="/" className="btn btn-dark">回到首頁 <i className="bi bi-arrow-right" aria-hidden="true" /></Link>
      </div>
    </main>
  );
}

export default NotFound;
