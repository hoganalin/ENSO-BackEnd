import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router';

import ShopImage from './ShopImage';
import { errorMessage } from '../services/api';
import { getSingleProductApi } from '../services/product';
import { createAsyncAddCart } from '../slice/cartSlice';

export default function SingleProduct() {
  const { id } = useParams(), dispatch = useDispatch();
  const busy = useSelector((s) => s.cart.busy);
  const [product, setProduct] = useState(null), [qty, setQty] = useState(1), [selected, setSelected] = useState(0), [error, setError] = useState(''), [notice, setNotice] = useState(''), [attempt, setAttempt] = useState(0);
  useEffect(() => { let active = true;
    getSingleProductApi(id).then((r) => { if (active) { setProduct(r.data.product); setError(''); } }).catch((e) => { if (active) setError(errorMessage(e)); });
    return () => { active = false; };
  }, [id, attempt]);
  const add = async () => { setNotice(''); try { await dispatch(createAsyncAddCart({ id, qty })).unwrap(); setNotice('已加入購物車'); } catch (e) { setNotice(String(e)); } };
  if (error) return <section className="shop-page" role="alert"><h1>暫時無法顯示商品</h1><p>{error}</p><button onClick={() => setAttempt((a) => a + 1)}>重新載入</button><Link to="/product">返回商品列表</Link></section>;
  if (!product) return <p className="shop-page" role="status">正在載入商品…</p>;
  const images = [product.imageUrl, ...product.imagesUrl].filter(Boolean);
  return <section className="shop-page shop-detail"><div><ShopImage src={images[selected] || images[0]} alt={`${product.title}商品圖片`} className="shop-main-image" /><div className="shop-thumbnails">{images.map((src, i) => <button key={src} aria-label={`查看第${i + 1}張圖片`} aria-pressed={selected === i} onClick={() => setSelected(i)}><ShopImage src={src} alt={`${product.title}圖庫${i + 1}`} /></button>)}</div></div>
    <div className="shop-detail-copy"><Link to="/product">返回所有香氣</Link><h1>{product.title}</h1><p>{product.description}</p><p className="shop-price">NT${product.price.toLocaleString('zh-TW')}</p><p>{product.content}</p>
      <label>購買數量<input type="number" min="1" max="1000" value={qty} onChange={(e) => setQty(Math.min(1000, Math.max(1, Number(e.target.value) || 1)))} /></label>
      <button className="btn btn-primary" disabled={busy > 0 || !product.is_in_stock || !Number.isInteger(qty)} onClick={add}>{busy ? '正在更新購物車…' : product.is_in_stock ? '加入購物車' : '目前售完'}</button>
      {notice && <p role="status">{notice}</p>}<Link to="/cart">查看購物車</Link>
      <h2>使用提醒</h2><p>商品圖片為概念設計，燃燒時間及成分尚未作為實際商品規格確認。展示訂單不會收款或出貨。</p>
      <p>實際使用線香時請保持通風，放置於耐熱容器，遠離易燃物，離開前確認熄滅。</p>
    </div></section>;
}
