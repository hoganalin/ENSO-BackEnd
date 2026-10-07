import { useEffect, useState } from 'react';

import axios from 'axios';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { clearWorkspace } from '../../shared/showcase';
import Dialog from '../components/admin/Dialog';
import MessageToast from '../components/MessageToast';
import useMessage from '../hooks/useMessage';
import { resetDemoData } from '../service/demoStore';
import { AUTH_TIMEOUT, clearSessionCookies, getApiBase, isShowcase, readSessionToken } from '../service/session';

const TOUR_KEY = 'enso_demo_seen_tour';

const TOUR_STEPS = [
  { title: '總覽', desc: '查看營收、訂單、商品與低庫存提醒。' },
  { title: '商品與圖片', desc: '管理商品資料、主圖與最多五張圖庫圖片。' },
  { title: '訂單與庫存', desc: '處理訂單、調整庫存並保留 demo 操作結果。' },
  { title: '設備', desc: '查看倉儲感測器心跳、電池與測值狀態。' },
];

const API_BASE = getApiBase();

const NAV_ITEMS = [
  { to: '/admin', label: '總覽', end: true },
  { to: '/admin/product', label: '商品' },
  { to: '/admin/order', label: '訂單' },
  { to: '/admin/inventory', label: '庫存' },
  { to: '/admin/coupon', label: '優惠券' },
  { to: '/admin/payment-ledger', label: '金流' },
  { to: '/admin/devices', label: '設備' },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useMessage();
  const [isNavOpen, setIsNavOpen] = useState(false);

  const isDemoSession =
    typeof document !== 'undefined' &&
    document.cookie
      .split('; ')
      .some((row) => row === 'myToken=enso-demo-token');

  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (!isDemoSession) return;
    try {
      if (!localStorage.getItem(TOUR_KEY)) setShowTour(true);
    } catch {
      /* 儲存空間不可用時仍可正常使用後台。 */
    }
  }, [isDemoSession]);

  const closeTour = () => {
    setShowTour(false);
    try {
      localStorage.setItem(TOUR_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const handleResetDemo = () => {
    if (!window.confirm('重置展示資料？這會清掉所有新增與編輯，回到初始狀態。')) return;
    resetDemoData();
    showSuccess('展示資料已重置');
    setTimeout(() => window.location.reload(), 600);
  };

  const logout = async () => {
    try {
      const token = readSessionToken();

      if (token !== 'enso-demo-token') {
        await axios.post(`${API_BASE}/logout`, null, { timeout: AUTH_TIMEOUT });
      } else {
        resetDemoData();
      }

      clearSessionCookies();
      if (isShowcase) { clearWorkspace(); window.location.assign('/shop/#/'); return; }
      delete axios.defaults.headers.common.Authorization;
      showSuccess('已登出');
      navigate('/login');
    } catch {
      showError('登出失敗，請稍後再試');
    }
  };

  return (
    <div translate="no" className="admin-shell">
      <MessageToast />
      {isShowcase && <div className="admin-demo-banner"><span>獨立面試展示，三十分鐘後到期。不收款、不出貨。設備為模擬資料。</span><a href="/shop/#/">返回購物前台</a></div>}

      {isDemoSession && (
        <div className="admin-demo-banner" role="status">
          <span>展示模式 · 操作結果會保存在目前瀏覽器</span>
          <button type="button" onClick={handleResetDemo}>
            重置展示資料
          </button>
        </div>
      )}

      {showTour && (
        <Dialog title="歡迎使用 ENSO 營運工作台" onClose={closeTour}>
          <div className="admin-tour">
            <h2 id="admin-tour-title" className="admin-tour__title">
              先從營運總覽開始
            </h2>
            <div>
              {TOUR_STEPS.map((step, index) => (
                <div key={step.title} className="admin-tour__step">
                  <span className="admin-tour__number">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <div className="admin-tour__desc">{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="enso-button-primary mt-6 w-full" onClick={closeTour}>
              開始使用
            </button>
          </div>
        </Dialog>
      )}

      <header className="admin-topbar">
        <div className="admin-topbar__inner">
          <div className="admin-brand">
            <div className="admin-brand__wordmark">
              <div className="admin-brand__name">ENSO</div>
              <div className="admin-brand__descriptor">營運工作台 · OPERATIONS</div>
            </div>
          </div>

          <nav className="admin-nav admin-nav--desktop" aria-label="後台主要功能">
            {NAV_ITEMS.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `admin-nav__link ${isActive ? 'is-active' : ''}`
                }
                onClick={() => setIsNavOpen(false)}
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <button type="button" className="admin-logout" onClick={logout}>
            登出
          </button>
          <button
            type="button"
            className="admin-menu-toggle"
            aria-label={isNavOpen ? '關閉導覽' : '開啟導覽'}
            aria-expanded={isNavOpen}
            onClick={() => setIsNavOpen((open) => !open)}
          >
            <span className="sr-only">{isNavOpen ? '關閉導覽' : '開啟導覽'}</span>
            <span className="admin-menu-toggle__icon" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </button>
        </div>

        {isNavOpen && (
          <nav className="admin-nav admin-nav--mobile px-4 pb-3" aria-label="行動版後台功能">
            {NAV_ITEMS.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => `admin-nav__link ${isActive ? 'is-active' : ''}`}
                onClick={() => setIsNavOpen(false)}
              >
                {label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="admin-content">
        <div className="min-h-[calc(100vh-160px)]">
          <Outlet />
        </div>
      </main>

      <footer className="admin-footer">
        ENSO OPERATIONS · 商品、訂單與庫存管理
      </footer>
    </div>
  );
};

export default AdminLayout;
