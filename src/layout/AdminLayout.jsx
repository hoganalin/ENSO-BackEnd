import axios from 'axios';
import { NavLink, Outlet } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

import useMessage from '../hooks/useMessage';
import MessageToast from '../components/MessageToast';

const API_BASE = import.meta.env.VITE_API_BASE;
const API_PATH = import.meta.env.VITE_API_PATH;
const AdminLayout = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useMessage();
  const logout = async () => {
    try {
      const response = await axios.post(`${API_BASE}/logout`);

      showSuccess('登出成功');
      navigate('/login');
    } catch (error) {
      showError('登出失敗');
    }
  };
  return (
    <div className="w-100 min-vh-100 d-flex flex-column overflow-x-hidden">
      <MessageToast />
      <header
        className="position-relative text-white"
        style={{
          backgroundImage:
            'url(https://images.unsplash.com/photo-1773937464832-f43fde4fa71e?q=80&w=2064&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          minHeight: '140px',
        }}
      >
        {/* 深色遮罩 */}
        <div
          className="position-absolute top-0 start-0 w-100 h-100"
          style={{
            background:
              'linear-gradient(135deg, rgba(15,15,15,0.92) 0%, rgba(30,30,30,0.85) 100%)',
          }}
        />
        <div className="container position-relative" style={{ zIndex: 1 }}>
          <div className="d-flex justify-content-between align-items-center pt-4 pb-2">
            <div>
              <h1
                className="m-0 fw-bold"
                style={{
                  fontSize: '1.75rem',
                  letterSpacing: '2px',
                }}
              >
                🌿 ENSO 後臺管理
              </h1>
              <small className="text-white-50" style={{ letterSpacing: '1px' }}>
                專業線香營運數據監控系統
              </small>
            </div>
            <button
              className="btn btn-outline-light rounded-pill px-4 py-2"
              onClick={logout}
              style={{
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.3)',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.15)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
              }}
            >
              登出
            </button>
          </div>

          <nav className="d-flex gap-2 pb-3 mt-2">
            <NavLink
              className={({ isActive }) =>
                `text-decoration-none px-4 py-2 rounded-pill fw-bold ${
                  isActive ? 'text-dark' : 'text-white-50'
                }`
              }
              style={({ isActive }) => ({
                fontSize: '0.95rem',
                letterSpacing: '1px',
                background: isActive
                  ? 'rgba(255,255,255,0.9)'
                  : 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(6px)',
                border: isActive ? 'none' : '1px solid rgba(255,255,255,0.12)',
                transition: 'all 0.3s ease',
              })}
              to="/admin"
              end
              // 非常重要：確保只有精準匹配 /admin 才顯示 Active
              // 網址是 /admin ➡️ 亮
              // 網址是 /admin/product ➡️ 不亮（因為後面還有 /product，不算結束）
            >
              📈 總覽面板
            </NavLink>

            <NavLink
              className={({ isActive }) =>
                `text-decoration-none px-4 py-2 rounded-pill fw-bold ${
                  isActive ? 'text-dark' : 'text-white-50'
                }`
              }
              style={({ isActive }) => ({
                fontSize: '0.95rem',
                letterSpacing: '1px',
                background: isActive
                  ? 'rgba(255,255,255,0.9)'
                  : 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(6px)',
                border: isActive ? 'none' : '1px solid rgba(255,255,255,0.12)',
                transition: 'all 0.3s ease',
              })}
              to="/admin/product"
            >
              📦 產品列表
            </NavLink>

            <NavLink
              className={({ isActive }) =>
                `text-decoration-none px-4 py-2 rounded-pill fw-bold ${
                  isActive ? 'text-dark' : 'text-white-50'
                }`
              }
              style={({ isActive }) => ({
                fontSize: '0.95rem',
                letterSpacing: '1px',
                background: isActive
                  ? 'rgba(255,255,255,0.9)'
                  : 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(6px)',
                border: isActive ? 'none' : '1px solid rgba(255,255,255,0.12)',
                transition: 'all 0.3s ease',
              })}
              to="/admin/order"
            >
              📋 訂單列表
            </NavLink>

            <NavLink
              className={({ isActive }) =>
                `text-decoration-none px-4 py-2 rounded-pill fw-bold ${
                  isActive ? 'text-dark' : 'text-white-50'
                }`
              }
              style={({ isActive }) => ({
                fontSize: '0.95rem',
                letterSpacing: '1px',
                background: isActive
                  ? 'rgba(255,255,255,0.9)'
                  : 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(6px)',
                border: isActive ? 'none' : '1px solid rgba(255,255,255,0.12)',
                transition: 'all 0.3s ease',
              })}
              to="/admin/inventory"
            >
              📊 庫存管理
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `text-decoration-none px-4 py-2 rounded-pill fw-bold ${
                  isActive ? 'text-dark' : 'text-white-50'
                }`
              }
              style={({ isActive }) => ({
                fontSize: '0.95rem',
                letterSpacing: '1px',
                background: isActive
                  ? 'rgba(255,255,255,0.9)'
                  : 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(6px)',
                border: isActive ? 'none' : '1px solid rgba(255,255,255,0.12)',
                transition: 'all 0.3s ease',
              })}
              to="/admin/coupon"
            >
              🏷️ 優惠券管理
            </NavLink>
          </nav>
        </div>
      </header>
      <main
        style={{
          backgroundColor: '#f5f7fa',
          minHeight: 'calc(100vh - 140px - 70px)',
        }}
        className="py-4"
      >
        <Outlet />
      </main>
      <footer
        className="text-center py-4"
        style={{
          background: 'linear-gradient(to top, #1a1a2e, #16213e)',
          color: 'rgba(255,255,255,0.4)',
          fontSize: '0.85rem',
          letterSpacing: '1px',
        }}
      >
        <p className="mb-0">© 2025 後臺管理系統 ・ All Rights Reserved</p>
      </footer>
    </div>
  );
};
export default AdminLayout;
