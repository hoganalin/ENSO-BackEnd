import { useEffect } from "react";
import { Outlet, useLocation } from "react-router";

import AOS from "aos";

import "aos/dist/aos.css";

import Breadcrumb from "../components/Breadcrumb";
import Footer from "../components/Footer";
import Header from "../components/Header";

function FrontendLayout() {
  const location = useLocation();

  useEffect(() => {
    //初始化 AOS (全域設定動畫長度 800 毫秒，且只執行一次)
    AOS.init({ duration: 800, once: true });
  }, []);

  useEffect(() => {
    // 每次切換頁面 (路由改變) 時，重新整理 AOS 來觸發新頁面的動畫
    AOS.refresh();
  }, [location.pathname]);
  const isHome = location.pathname === "/";

  return (
    <div className={`site-shell${isHome ? " site-shell--home" : ""}`}>
      <Header />
      <Breadcrumb />
      <main className="site-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default FrontendLayout;
