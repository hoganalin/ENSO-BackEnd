import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router";

import { Autoplay, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import "../../assets/swiper.scss";
import "bootstrap-icons/font/bootstrap-icons.css";
import dockProduct from "../../../assets/plates/dock-product.png";
import sunlitRoom from "../../../assets/plates/sunlit-room.png";

import ShopImage from "../../components/ShopImage";
import useMessage from "../../hooks/useMessage";
import { errorMessage } from "../../services/api";
import { getProductApi } from "../../services/product";
import { createAsyncAddCart } from "../../slice/cartSlice";

import "swiper/css";
import "swiper/css/pagination";

const rituals = {
  reading: {
    label: "READING",
    icon: "bi-book",
    description: "Warm, grounding incense for deeper focus and a more present you.",
    link: "EXPLORE THE READING RITUAL",
  },
  yoga: {
    label: "YOGA",
    icon: "bi-person-arms-up",
    description: "A clear, steady scent to let breath and movement share the room.",
    link: "EXPLORE THE YOGA RITUAL",
  },
  sleep: {
    label: "SLEEP",
    icon: "bi-moon-stars",
    description: "A softer close to the day, made for a quieter room and slower thoughts.",
    link: "EXPLORE THE SLEEP RITUAL",
  },
  reset: {
    label: "RESET",
    icon: "bi-sun",
    description: "A small pause that helps the next part of your day start with intention.",
    link: "EXPLORE THE RESET RITUAL",
  },
};

const categoryCards = [
  {
    title: "閱讀時刻",
    subtitle: "READING RITUAL",
    description: "讓書頁與木質香氣一起慢下來。",
    icon: "bi-book",
  },
  {
    title: "瑜伽靜心",
    subtitle: "YOGA RITUAL",
    description: "在呼吸與伸展之間，留下一段自己的節奏。",
    icon: "bi-person-arms-up",
  },
  {
    title: "睡前放鬆",
    subtitle: "NIGHT RITUAL",
    description: "替一天收尾，讓臥室回到柔和的安定感。",
    icon: "bi-moon-stars",
  },
];

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeRitual, setActiveRitual] = useState("reading");
  const [quantity, setQuantity] = useState(1);
  const dispatch = useDispatch();
  const busy = useSelector((state) => state.cart.busy);
  const navigate = useNavigate();
  const { showError, showSuccess } = useMessage();
  const ritual = rituals[activeRitual];

  useEffect(() => {
    const getProducts = async () => {
      try {
        const response = await getProductApi(1, "線香");
        const products =
          response.data.products.length > 0
            ? response.data.products
            : (await getProductApi(1, "all")).data.products;
        setFeaturedProducts(products);
        setLoadError('');
      } catch (error) {
        setLoadError(errorMessage(error));
      } finally { setLoading(false); }
    };

    getProducts();
  }, [attempt]);

  const handleAddToCart = async () => {
    const productId = featuredProducts.find((product) => product.title === '琥珀黃昏')?.id;

    if (!productId) {
      navigate("/product");
      return;
    }

    try {
      await dispatch(createAsyncAddCart({ id: productId, qty: quantity })).unwrap();
      showSuccess("已加入購物車");
    } catch (error) {
      showError(error || "加入購物車失敗，請稍後再試");
    }
  };

  return (
    <>
      <section className="enso-hero comp-frame" aria-labelledby="golden-hour-title">
        <aside className="enso-hero__time-rail r-time-rail" aria-label="一天的香氣節奏">
          <span className="enso-hero__rail-line" aria-hidden="true" />
          <button className="enso-hero__time r-morning-time" type="button" onClick={() => setActiveRitual("reading")}>
            <span>MORNING</span>
            <strong>6AM</strong>
          </button>
          <button className="enso-hero__time r-midday-time" type="button" onClick={() => setActiveRitual("yoga")}>
            <span>MIDDAY</span>
            <strong>12PM</strong>
          </button>
          <button className="enso-hero__time enso-hero__time--active r-golden-hour-time" type="button" onClick={() => setActiveRitual("reading")}>
            <span>GOLDEN HOUR</span>
            <strong>5PM</strong>
          </button>
          <button className="enso-hero__time r-evening-time" type="button" onClick={() => setActiveRitual("reset")}>
            <span>EVENING</span>
            <strong>9PM</strong>
          </button>
          <button className="enso-hero__time r-night-time" type="button" onClick={() => setActiveRitual("sleep")}>
            <span>NIGHT</span>
            <strong>11PM</strong>
          </button>
          <p className="enso-hero__rail-signoff r-rail-signoff">DIFFERENT<br />DAYS A BRIGHTER<br />YOU</p>
        </aside>

        <div className="enso-hero__scene r-sunlit-room" aria-hidden="true">
          <img src={sunlitRoom} alt="" />
        </div>

        <div className="enso-hero__copy">
          <p className="enso-hero__kicker r-ritual-kicker">RITUALS FOR REAL LIFE</p>
          <h1 id="golden-hour-title" className="enso-hero__title r-hero-headline">GOLDEN<br />HOUR</h1>
          <p className="enso-hero__summary r-hero-summary">SLOW DOWN. TURN INWARD.<br />FIND YOUR NEXT CHAPTER.</p>

          <div className="enso-hero__rituals" aria-label="選擇使用情境">
            {Object.entries(rituals).map(([key, item]) => (
              <button
                key={key}
                type="button"
                className={`enso-hero__ritual${activeRitual === key ? " is-active" : ""}`}
                onClick={() => setActiveRitual(key)}
                aria-pressed={activeRitual === key}
              >
                <i className={`bi ${item.icon}`} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <p className="enso-hero__description r-ritual-description">{ritual.description}</p>
          <Link className="enso-hero__explore r-ritual-link" to="/product">{ritual.link}<i className="bi bi-arrow-right" aria-hidden="true" /></Link>
        </div>

        <div className="enso-hero__purchase-dock r-purchase-dock" aria-label="Golden Hour 購買選項">
          <img className="enso-hero__dock-product r-dock-product" src={dockProduct} alt="" />
          <div className="enso-hero__dock-details r-dock-details">
            <strong>GOLDEN HOUR</strong>
            <span>SANDALWOOD&nbsp;&nbsp; CEDAR&nbsp;&nbsp; CITRUS</span>
            <small>CONCEPT COLLECTION</small>
          </div>
          <div className="enso-hero__quantity r-dock-quantity" aria-label="商品數量">
            <span>QUANTITY</span>
            <div>
              <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="減少數量">−</button>
              <output aria-live="polite">{quantity}</output>
              <button type="button" onClick={() => setQuantity((value) => value + 1)} aria-label="增加數量">＋</button>
            </div>
          </div>
          <button type="button" className="enso-hero__add-cart r-dock-add-to-cart" disabled={busy > 0 || loading || !!loadError || !featuredProducts.find((p) => p.title === '琥珀黃昏')?.is_in_stock} onClick={handleAddToCart}>
            {busy ? '正在加入…' : `加入購物車 — NT$${featuredProducts.find((product) => product.title === '琥珀黃昏')?.price.toLocaleString('zh-TW') || '—'}`}
          </button>
          <span className="enso-hero__dock-closing r-dock-closing-line">A CALMER<br />BRIGHTER YOU</span>
        </div>
      </section>

      <section id="rituals" className="enso-landing-section enso-landing-section--rituals" aria-labelledby="rituals-heading">
        <div className="container">
          <div className="enso-section-heading">
            <p>WHERE THE DAY MEETS YOU</p>
            <h2 id="rituals-heading">讓香氣貼近你的生活節奏</h2>
          </div>
          <div className="enso-ritual-grid">
            {categoryCards.map((category) => (
              <Link to="/product" className="enso-ritual-card" key={category.title}>
                <i className={`bi ${category.icon}`} aria-hidden="true" />
                <p>{category.subtitle}</p>
                <h3>{category.title}</h3>
                <span>{category.description}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="enso-landing-section enso-landing-section--products" id="journal" aria-labelledby="featured-heading">
        <div className="container">
          <div className="enso-section-heading enso-section-heading--split">
            <div>
              <p className="enso-section-heading__highlight">THE CURRENT SELECTION</p>
              <h2 id="featured-heading">今天想點哪一種香</h2>
            </div>
            <Link to="/product">瀏覽所有線香 <i className="bi bi-arrow-up-right" aria-hidden="true" /></Link>
          </div>

          {loading && <p role="status">正在載入香氣…</p>}
          {loadError && <div role="alert"><p>{loadError}</p><button onClick={() => { setLoading(true); setAttempt((n) => n + 1); }}>重新載入香氣</button></div>}
          {!loading && !loadError && !featuredProducts.length && <p role="status">目前沒有上架香氣。</p>}
          <Swiper
            modules={[Autoplay, Pagination]}
            className="enso-featured-swiper"
            spaceBetween={24}
            slidesPerView={1}
            autoplay={{ delay: 4200, disableOnInteraction: false }}
            pagination={{ clickable: true }}
            breakpoints={{ 700: { slidesPerView: 2 }, 1080: { slidesPerView: 3 } }}
          >
            {featuredProducts.map((product) => (
              <SwiperSlide key={product.id}>
                <article className="enso-product-card">
                  <ShopImage src={product.imageUrl} alt={product.title} />
                  <div>
                    <p>{product.category}</p>
                    <h3>{product.title}</h3>
                    <span>{product.description}</span>
                    <button type="button" onClick={() => navigate(`/product/${product.id}`)}>查看香氣細節 <i className="bi bi-arrow-right" aria-hidden="true" /></button>
                  </div>
                </article>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      <section className="enso-landing-section enso-landing-section--story" aria-labelledby="story-heading">
        <div className="container enso-story">
          <div>
            <p>ENSO, FOR A BRIGHTER YOU</p>
            <h2 id="story-heading">香氣不是逃離日常<br />而是讓日常更像你自己</h2>
          </div>
          <div>
            <p>ENSO 以閱讀、瑜伽、睡前與每一次想慢下來的時刻為靈感，探索香氣與生活的關係。這是一個概念品牌作品，商品規格與功效並未經實物驗證。</p>
            <Link to="/about">認識 ENSO <i className="bi bi-arrow-right" aria-hidden="true" /></Link>
          </div>
        </div>
      </section>
    </>
  );
}
