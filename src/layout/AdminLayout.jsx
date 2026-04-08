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
      // 1. 取得當前的 token
      const token = document.cookie
        .split('; ')
        .find((row) => row.startsWith('myToken='))
        ?.split('=')[1];

      // 2. 如果不是參觀者, Demo Token，才呼叫真實的後端登出 API
      if (token !== 'enso-demo-token') {
        await axios.post(`${API_BASE}/logout`);
      }

      // 3. 無論是真實登出或是參觀者登出，都必須在前端手動清除 Cookie
      document.cookie =
        'myToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      delete axios.defaults.headers.common.Authorization;

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
          <div className="d-flex justify-content-between align-items-center pt-3 pt-md-4 pb-2">
            <div>
              <h1
                className="m-0 fw-bold"
                style={{
                  fontSize: 'clamp(1.1rem, 4vw, 1.75rem)',
                  letterSpacing: '1px',
                }}
              >
                🌿 ENSO 後臺管理
              </h1>
              <small
                className="text-white-50 d-none d-md-block"
                style={{ letterSpacing: '1px' }}
              >
                專業線香營運數據監控系統
              </small>
            </div>

            <button
              className="btn btn-outline-light rounded-pill"
              onClick={logout}
              style={{
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.3)',
                transition: 'all 0.3s ease',
                fontSize: '0.8rem',
                padding: '4px 14px',
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

          <nav className="d-flex flex-wrap gap-1 gap-md-2 pb-3 mt-2">
            {[
              { to: '/admin', label: '📈 總覽面板', end: true },
              { to: '/admin/product', label: '📦 產品列表' },
              { to: '/admin/order', label: '📋 訂單列表' },
              { to: '/admin/inventory', label: '📊 庫存管理' },
              { to: '/admin/coupon', label: '🏷️ 優惠券管理' },
              { to: '/admin/devices', label: '🌡️ 倉儲監管' },
            ].map(({ to, label, end }) => (
              <NavLink
                key={to}
                className={({ isActive }) =>
                  `text-decoration-none rounded-pill fw-bold ${
                    isActive ? 'text-dark' : 'text-white-50'
                  }`
                }
                style={({ isActive }) => ({
                  fontSize: '0.75rem',
                  letterSpacing: '0.5px',
                  padding: '5px 12px',
                  background: isActive
                    ? 'rgba(255,255,255,0.9)'
                    : 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(6px)',
                  border: isActive
                    ? 'none'
                    : '1px solid rgba(255,255,255,0.12)',
                  transition: 'all 0.3s ease',
                })}
                to={to}
                end={end}
              >
                {label}
              </NavLink>
            ))}
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
