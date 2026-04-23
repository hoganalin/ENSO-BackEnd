import axios from 'axios';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import useMessage from '../hooks/useMessage';
import MessageToast from '../components/MessageToast';

const API_BASE = import.meta.env.VITE_API_BASE;

const NAV_ITEMS = [
  { to: '/admin', label: '盤面', end: true },
  { to: '/admin/product', label: '物產' },
  { to: '/admin/order', label: '帳冊' },
  { to: '/admin/inventory', label: '庫存' },
  { to: '/admin/coupon', label: '札記' },
  { to: '/admin/devices', label: '監管' },
  { to: '/admin/agent', label: '使者' },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useMessage();
  const [isNavOpen, setIsNavOpen] = useState(false);

  const logout = async () => {
    try {
      const token = document.cookie
        .split('; ')
        .find((row) => row.startsWith('myToken='))
        ?.split('=')[1];

      if (token !== 'enso-demo-token') {
        await axios.post(`${API_BASE}/logout`);
      }

      document.cookie = 'myToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      delete axios.defaults.headers.common.Authorization;

      showSuccess('登出成功');
      navigate('/login');
    } catch (error) {
      showError('登出失敗');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col font-sans text-[#111111]">
      <MessageToast />
      
      {/* 頂部導航列 - 博物館門戶風格 */}
      <header className="sticky top-0 z-50 bg-[#FAF9F6]/80 backdrop-blur-md border-b border-[#D1C7B7] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <h1 className="font-serif text-2xl font-bold tracking-widest text-[#111111] flex items-center gap-2">
                <span className="text-[#984443]">♢</span> ENSO 管理
              </h1>
              <span className="text-[0.6rem] uppercase tracking-[0.3em] opacity-40 ml-7">Kyoto Administrative Suite</span>
            </div>

            {/* 桌機版導覽 */}
            <nav className="hidden md:flex items-center gap-1 ml-4">
              {NAV_ITEMS.map(({ to, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `px-4 py-1 text-sm tracking-widest transition-kyoto rounded-sm ${
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

          <div className="flex items-center gap-4">
            <button
              onClick={logout}
              className="text-[0.7rem] uppercase tracking-[0.2em] px-4 py-1.5 border border-[#D1C7B7] hover:bg-[#111111] hover:text-[#FAF9F6] hover:border-[#111111] transition-kyoto rounded-sm"
            >
              登出
            </button>

            {/* 手機版選單按鈕 */}
            <button
              className="md:hidden p-2 text-[#111111]"
              onClick={() => setIsNavOpen(!isNavOpen)}
            >
              <div className="w-6 h-4 flex flex-col justify-between items-end">
                <span className={`h-[1px] bg-current transition-all ${isNavOpen ? 'w-6 translate-y-[7px] rotate-45' : 'w-6'}`} />
                <span className={`h-[1px] bg-current transition-all ${isNavOpen ? 'opacity-0' : 'w-4'}`} />
                <span className={`h-[1px] bg-current transition-all ${isNavOpen ? 'w-6 -translate-y-[8px] -rotate-45' : 'w-5'}`} />
              </div>
            </button>
          </div>
        </div>

        {/* 手機版導覽下拉 */}
        {/* max-h-[32rem] = 512px，足以容納 7+ 個 nav item（每個 ~50px + gap + padding）。
            之前用 max-h-64 (256px) 會把最後 3 個（札記／監管／使者）切掉。 */}
        <div className={`md:hidden overflow-hidden transition-all duration-500 ${isNavOpen ? 'max-h-[32rem] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
          <nav className="flex flex-col gap-2 py-4 border-t border-[#D1C7B7]/30">
            {NAV_ITEMS.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setIsNavOpen(false)}
                className={({ isActive }) =>
                  `px-4 py-3 text-sm tracking-[0.2em] transition-kyoto ${
                    isActive ? 'bg-[#D1C7B7]/20 text-[#984443] font-bold' : 'text-[#111111]/60'
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
          <p className="text-[0.65rem] uppercase tracking-[0.4em] opacity-30 text-center leading-loose">
            © 2025 ENSO INCENSE ARTISAN<br />
            PRECISE MONITORING • TRADITIONAL SOUL
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AdminLayout;
