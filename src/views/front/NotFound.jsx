import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container mt-5 text-center">
      <h1 className="display-1 fw-bold text-muted">404</h1>
      <p className="lead">找不到頁面</p>
      <Link to="/login" className="btn btn-primary rounded-pill px-4">
        回到首頁
      </Link>
    </div>
  );
}
