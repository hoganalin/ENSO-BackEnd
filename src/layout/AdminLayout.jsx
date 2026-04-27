import { useEffect, useState } from 'react';

import axios from 'axios';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import MessageToast from '../components/MessageToast';
import useMessage from '../hooks/useMessage';
import { resetDemoData } from '../service/demoStore';

const TOUR_KEY = 'enso_demo_seen_tour';

const TOUR_STEPS = [
  {
    title: '盤面總覽',
    desc: '即時 IoT 感測器、KPI、低庫存待辦一頁總覽。',
  },
  {
    title: '金流台帳',
    desc: '聚合 ECPay 12 種模擬付款方式的圓餅 / 趨勢 / 明細。',
  },
  {
    title: '使者觀測',
    desc: 'AI Agent 對話量、Eval pass rate、Funnel 與 Live Trace。',
  },
  {
    title: '物產 / 庫存 / 帳冊',
    desc: '商品 CRUD、庫存調整、訂單編輯，demo 模式會存入 localStorage。',
  },
  {
    title: '物聯監儀',
    desc: '感測器網路 + 校準 / 配置面板，純前端模擬。',
  },
];

const API_BASE = import.meta.env.VITE_API_BASE;

const NAV_ITEMS = [
  { to: '/admin', label: '盤面', end: true },
  { to: '/admin/product', label: '物產' },
  { to: '/admin/order', label: '帳冊' },
  { to: '/admin/inventory', label: '庫存' },
  { to: '/admin/coupon', label: '札記' },
  { to: '/admin/payment-ledger', label: '金流' },
  { to: '/admin/devices', label: '監管' },
  { to: '/admin/agent', label: '使者' },
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

  // Demo onboarding：第一次進來顯示 5 步導覽，看過後存 flag
  const [showTour, setShowTour] = useState(false);
  useEffect(() => {
    if (!isDemoSession) return;
    try {
      if (!localStorage.getItem(TOUR_KEY)) setShowTour(true);
    } catch {
      /* ignore */
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
    if (
      !window.confirm('重置 demo 資料？這會清掉所有新增 / 編輯，回到初始狀態。')
    )
      return;
    resetDemoData();
    showSuccess('已重置 demo 資料');
    // 重新整理讓所有頁面重抓 mock seed
    setTimeout(() => window.location.reload(), 600);
  };

  const logout = async () => {
    try {
      const token = document.cookie
        .split('; ')
        .find((row) => row.startsWith('myToken='))
        ?.split('=')[1];

      if (token !== 'enso-demo-token') {
        await axios.post(`${API_BASE}/logout`);
      } else {
        // Demo 登出時順便清掉 demo 期間累積的 localStorage 資料
        resetDemoData();
      }

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
    <div
      translate="no"
      className="min-h-screen bg-[#FAF9F6] flex flex-col font-sans text-[#111111]"
    >
      <MessageToast />

      {isDemoSession && (
        <div className="bg-[#984443] text-[#FAF9F6] text-[11px] md:text-[0.75rem] uppercase tracking-[0.1em] md:tracking-[0.25em] py-1 md:py-1.5 px-2 md:px-3 flex flex-wrap items-center justify-center gap-2 md:gap-4">
          <span className="md:inline">
            <span className="md:hidden">DEMO · 寫入存 localStorage</span>
            <span className="hidden md:inline">
              展示模式 · DEMO · 寫入會存於 localStorage
            </span>
          </span>
          <button
            type="button"
            onClick={handleResetDemo}
            className="px-2 py-0.5 border border-[#FAF9F6]/40 hover:bg-[#FAF9F6] hover:text-[#984443] transition-kyoto"
          >
            重置資料 · RESET
          </button>
        </div>
      )}

      {showTour && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#111111]/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && closeTour()}
        >
          <div className="bg-[#FAF9F6] max-w-xl w-full p-8 md:p-12 shadow-2xl border border-[#D1C7B7]">
            <div className="text-[12px] md:text-[0.75rem] uppercase tracking-[0.4em] text-[#984443] font-bold mb-2">
              Welcome
            </div>
            <h3 className="font-serif text-2xl md:text-3xl mb-6">
              ENSO Admin · Demo 導覽
            </h3>
            <ul className="space-y-3 mb-8">
              {TOUR_STEPS.map((s, i) => (
                <li key={s.title} className="flex gap-3">
                  <span className="font-serif text-[#984443] text-lg w-6 shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <div className="font-bold text-[14px] md:text-[15px]">
                      {s.title}
                    </div>
                    <div className="text-[12px] md:text-[13px] opacity-70">
                      {s.desc}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={closeTour}
              className="w-full px-4 py-3 bg-[#111111] text-[#FAF9F6] text-[12px] md:text-[0.75rem] uppercase tracking-[0.3em] hover:bg-[#984443] transition-kyoto"
            >
              開始探索 · Start
            </button>
          </div>
        </div>
      )}

      {/* 頂部導航列 - 博物館門戶風格 */}
      <header className="sticky top-0 z-50 bg-[#FAF9F6]/80 backdrop-blur-md border-b border-[#D1C7B7] px-3 py-3 md:px-6 md:py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-8 min-w-0">
            <div className="flex flex-col min-w-0">
              <h1 className="font-serif text-base md:text-2xl font-bold tracking-wider md:tracking-widest text-[#111111] flex items-center gap-2 whitespace-nowrap">
                <span className="text-[#984443]">♢</span> ENSO 管理
              </h1>
              <span className="hidden md:block text-[0.75rem] uppercase tracking-[0.3em] opacity-40 ml-7">
                Kyoto Administrative Suite
              </span>
            </div>

            {/* 桌機版導覽 */}
            <nav className="hidden md:flex items-center gap-1 ml-4">
              {NAV_ITEMS.map(({ to, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `px-4 py-1 text-sm tracking-widest transition-kyoto rounded-sm no-underline ${
                      isActive
                        ? 'text-[#111111] font-bold bg-[#D1C7B7]/20 shadow-[inset_0_-2px_0_0_#984443]'
                        : 'text-[#111111]/40 hover:text-[#111111]'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <button
              onClick={logout}
              className="text-[12px] md:text-[0.75rem] uppercase tracking-[0.15em] md:tracking-[0.2em] px-3 md:px-4 py-1 md:py-1.5 border border-[#D1C7B7] hover:bg-[#111111] hover:text-[#FAF9F6] hover:border-[#111111] transition-kyoto rounded-sm whitespace-nowrap"
            >
              登出
            </button>

            {/* 手機版選單按鈕 */}
            <button
              className="md:hidden p-2 text-[#111111]"
              onClick={() => setIsNavOpen(!isNavOpen)}
            >
              <div className="w-6 h-4 flex flex-col justify-between items-end">
                <span
                  className={`h-[1px] bg-current transition-all ${isNavOpen ? 'w-6 translate-y-[7px] rotate-45' : 'w-6'}`}
                />
                <span
                  className={`h-[1px] bg-current transition-all ${isNavOpen ? 'opacity-0' : 'w-4'}`}
                />
                <span
                  className={`h-[1px] bg-current transition-all ${isNavOpen ? 'w-6 -translate-y-[8px] -rotate-45' : 'w-5'}`}
                />
              </div>
            </button>
          </div>
        </div>

        {/* 手機版導覽下拉 */}
        {/* max-h-[32rem] = 512px，足以容納 7+ 個 nav item（每個 ~50px + gap + padding）。
            之前用 max-h-64 (256px) 會把最後 3 個（札記／監管／使者）切掉。 */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-500 ${isNavOpen ? 'max-h-[32rem] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}
        >
          <nav className="flex flex-col gap-2 py-4 border-t border-[#D1C7B7]/30">
            {NAV_ITEMS.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setIsNavOpen(false)}
                className={({ isActive }) =>
                  `px-4 py-3 text-sm tracking-[0.2em] transition-kyoto no-underline ${
                    isActive
                      ? 'bg-[#D1C7B7]/20 text-[#984443] font-bold'
                      : 'text-[#111111]/60'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* 主要內容區 */}
      <main className="flex-grow bg-kumiko relative">
        <div className="max-w-7xl mx-auto min-h-[calc(100vh-140px)]">
          <Outlet />
        </div>
      </main>

      {/* 底部資訊 - 極簡主義 */}
      <footer className="py-12 border-t border-[#D1C7B7]/30 bg-[#FAF9F6]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-4">
          <div className="w-12 h-[1px] bg-[#984443]/30"></div>
          <p className="text-[0.75rem] uppercase tracking-[0.4em] opacity-30 text-center leading-loose">
            © 2025 ENSO INCENSE ARTISAN
            <br />
            PRECISE MONITORING • TRADITIONAL SOUL
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AdminLayout;
