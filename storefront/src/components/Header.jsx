import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router";

import Swal from "sweetalert2";

import "bootstrap-icons/font/bootstrap-icons.css";

import { createAsyncGetCart } from "../slice/cartSlice";

function Header() {
  const carts = useSelector((state) => state.cart.carts);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchItem, setSearchItem] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isHome = location.pathname === "/";

  useEffect(() => {
    dispatch(createAsyncGetCart());
  }, [dispatch]);

  const cartTotalQty = carts?.reduce((total, cart) => total + (cart.qty || 0), 0) || 0;
  const isLoggedIn = document.cookie.split("; ").find((row) => row.startsWith("hexToken="));

  const handleLogout = () => {
    Swal.fire({
      title: "確定要登出嗎？",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#09256f",
      cancelButtonColor: "#bf5c37",
      confirmButtonText: "確定登出",
      cancelButtonText: "取消",
    }).then((result) => {
      if (result.isConfirmed) {
        document.cookie = "hexToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        navigate("/");
      }
    });
  };

  const handleSearch = (event) => {
    event.preventDefault();
    const query = searchItem.trim();
    if (!query) return;

    navigate(`/product?search=${encodeURIComponent(query)}`);
    setSearchItem("");
    setIsSearchOpen(false);
  };

  const navigateToSection = (id) => (event) => {
    event.preventDefault();

    const scroll = () => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    if (isHome) {
      scroll();
    } else {
      navigate("/");
      window.setTimeout(scroll, 100);
    }

    setIsMenuOpen(false);
  };

  return (
    <header className={`site-header${isHome ? " site-header--home" : " site-header--page"}`}>
      <nav className="site-header__nav" aria-label="主要導覽">
        <Link to="/" className="site-header__wordmark" aria-label="回到 ENSO 首頁">ENSO</Link>

        <div className={`site-header__links${isMenuOpen ? " is-open" : ""}`}>
          <Link to="/product" onClick={() => setIsMenuOpen(false)}>INCENSE</Link>
          <a href="#rituals" onClick={navigateToSection("rituals")}>RITUALS</a>
          <Link to="/about" onClick={() => setIsMenuOpen(false)}>OUR STORY</Link>
          <a href="#journal" onClick={navigateToSection("journal")}>SHOP</a>
        </div>

        <div className="site-header__utilities">
          <form className={`site-header__search${isSearchOpen ? " is-open" : ""}`} role="search" onSubmit={handleSearch}>
            <label className="visually-hidden" htmlFor="site-search">搜尋 ENSO 商品</label>
            <input id="site-search" value={searchItem} onChange={(event) => setSearchItem(event.target.value)} placeholder="搜尋香氣" />
          </form>
          <button type="button" className="site-header__icon-button" onClick={() => setIsSearchOpen((open) => !open)} aria-label="開啟商品搜尋" aria-expanded={isSearchOpen}>
            <i className="bi bi-search" aria-hidden="true" />
          </button>
          {isLoggedIn ? (
            <button type="button" className="site-header__icon-button" onClick={handleLogout} aria-label="登出帳戶">
              <i className="bi bi-box-arrow-right" aria-hidden="true" />
            </button>
          ) : (
            <Link to="/login" className="site-header__icon-button" aria-label="前往登入頁面">
              <i className="bi bi-person" aria-hidden="true" />
            </Link>
          )}
          <Link to="/cart" className="site-header__icon-button site-header__cart" aria-label={`前往購物車，目前有 ${cartTotalQty} 件商品`}>
            <i className="bi bi-bag" aria-hidden="true" />
            {cartTotalQty > 0 && <span>{cartTotalQty}</span>}
          </Link>
        </div>

        <p className="site-header__promise">A CALMER<br />BRIGHTER YOU</p>
        <button type="button" className="site-header__menu-button" onClick={() => setIsMenuOpen((open) => !open)} aria-label="開啟導覽選單" aria-expanded={isMenuOpen}>
          <i className={`bi ${isMenuOpen ? "bi-x-lg" : "bi-list"}`} aria-hidden="true" />
        </button>
      </nav>
    </header>
  );
}

export default Header;
