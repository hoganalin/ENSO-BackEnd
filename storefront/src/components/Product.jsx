import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import ShopImage from './ShopImage';
import { errorMessage } from '../services/api';
import { getAllProductsApi } from '../services/product';

export default function Product() {
  const [products, setProducts] = useState([]), [error, setError] = useState(''), [loading, setLoading] = useState(true), [attempt, setAttempt] = useState(0);
  const [params, setParams] = useSearchParams();
  const search = params.get('search') || '', category = params.get('category') || '';
  useEffect(() => { let active = true;
    getAllProductsApi().then((r) => { if (active) { setProducts(r.data.products); setError(''); } }).catch((e) => { if (active) setError(errorMessage(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);
  const filtered = products.filter((p) => (!category || p.category === category) && `${p.title}${p.description}`.includes(search));
  return <section className="shop-page"><h1>今天想點哪一種香</h1><p>六款概念香氣，讓日常多一點自己的節奏。售價及庫存僅供面試展示。</p>
    <div className="shop-filters"><label>搜尋香氣<input value={search} onChange={(e) => setParams({ search: e.target.value, category })} /></label>
      <label>商品分類<select value={category} onChange={(e) => setParams({ search, category: e.target.value })}><option value="">全部商品</option>{[...new Set(products.map((p) => p.category))].map((c) => <option key={c}>{c}</option>)}</select></label></div>
    {loading && <p role="status">正在載入香氣…</p>}
    {error && <div role="alert"><p>{error}</p><button onClick={() => { setLoading(true); setAttempt((a) => a + 1); }}>重新載入商品</button></div>}
    {!loading && !error && (filtered.length ? <div className="shop-grid">{filtered.map((p) => <article key={p.id} className="shop-product"><Link to={`/product/${p.id}`}><ShopImage src={p.imageUrl} alt={`${p.title}商品主圖`} /><h2>{p.title}</h2></Link><p>{p.description}</p><strong>NT${p.price.toLocaleString('zh-TW')}</strong><span>{p.is_in_stock ? '可供展示下單' : '目前售完'}</span></article>)}</div> : <p role="status">{products.length ? '沒有符合條件的香氣，請調整搜尋或分類。' : '目前沒有上架商品，請稍後再來看看。'}</p>)}
  </section>;
}
