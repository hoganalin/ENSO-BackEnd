import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';

import ShopImage from './ShopImage';
import { createAsyncDeleteAllCart,createAsyncDeleteSingleCart, createAsyncGetCart, createAsyncUpdateCart } from '../slice/cartSlice';

export default function Cart() {
  const cart = useSelector((s) => s.cart), dispatch = useDispatch();
  const busy = cart.busy > 0;
  return <section className="shop-page"><h1>今天的香氣，先放進這裡。</h1><p>加入購物車尚不保留庫存。送出訂單時，會再次確認價格及庫存。</p>
    {busy && <p role="status">正在更新購物車…</p>}
    {cart.error && <div role="alert"><p>{cart.error}</p><button disabled={busy} onClick={() => dispatch(createAsyncGetCart())}>重新整理購物車</button></div>}
    {cart.carts.map((item) => <article className="shop-cart-line" key={item.id}><ShopImage src={item.product.imageUrl} alt={item.product.title} /><div><h2>{item.product.title}</h2><p>NT${(item.product.price || 0).toLocaleString('zh-TW')}</p>{!item.available && <p>此商品已下架或庫存不足，請移除或減少數量。</p>}</div>
      <div className="shop-quantity"><button aria-label={`減少${item.product.title}數量`} disabled={busy || item.qty <= 1} onClick={() => dispatch(createAsyncUpdateCart({ id: item.id, product_id: item.product_id, qty: item.qty - 1 }))}>−</button><output aria-label="商品數量">{item.qty}</output><button aria-label={`增加${item.product.title}數量`} disabled={busy || !item.product.is_enabled} onClick={() => dispatch(createAsyncUpdateCart({ id: item.id, product_id: item.product_id, qty: item.qty + 1 }))}>＋</button></div>
      <strong>NT${item.final_total.toLocaleString('zh-TW')}</strong><button disabled={busy} onClick={() => dispatch(createAsyncDeleteSingleCart(item.id))}>移除{item.product.title}</button></article>)}
    {cart.loaded && !cart.carts.length && <p role="status">購物車還沒有香氣，先挑一款喜歡的吧。</p>}
    <div className="shop-actions"><Link to="/product">繼續選香</Link>{cart.carts.length > 0 && <><button disabled={busy} onClick={() => { if (window.confirm('確定清空這個展示購物車嗎？')) dispatch(createAsyncDeleteAllCart()); }}>清空購物車</button><strong>商品小計 NT${cart.final_total.toLocaleString('zh-TW')}</strong>{cart.can_checkout && !busy && !cart.error ? <Link className="btn btn-primary" to="/checkout">填寫展示訂單</Link> : <span>請先確認購物車中的商品</span>}</>}</div>
  </section>;
}
