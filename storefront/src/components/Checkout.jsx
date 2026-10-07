import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router';

import { errorMessage } from '../services/api';
import { createOrderApi } from '../services/cart';
import { clearAttempt, loadAttempt, saveAttempt, saveReceipt } from '../services/checkoutAttempt';
import { createAsyncGetCart } from '../slice/cartSlice';

export default function Checkout() {
  const cart = useSelector((s) => s.cart), dispatch = useDispatch(), navigate = useNavigate();
  const [pending, setPending] = useState(loadAttempt), [busy, setBusy] = useState(false), [error, setError] = useState(''), [reconfirm, setReconfirm] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: pending?.data.user || { name: '展示訪客', email: 'visitor@example.test', tel: '0900000000', address: '展示地址，不會實際出貨' } });
  const send = async (fields) => {
    if (busy || reconfirm) return;
    setBusy(true); setError('');
    try {
      const attempt = pending || saveAttempt({ user: { name: fields.name, email: fields.email, tel: fields.tel, address: fields.address }, message: fields.message || '', cart_version: cart.version, expected_total_cents: cart.total_cents });
      setPending(attempt);
      const receipt = (await createOrderApi(attempt.data, attempt.key)).data;
      saveReceipt(receipt); clearAttempt();
      dispatch(createAsyncGetCart());
      navigate(`/checkout-success/${receipt.orderId}`);
    } catch (e) {
      setError(errorMessage(e));
      if ([400, 409].includes(e.response?.status)) {
        clearAttempt(); setPending(null); setReconfirm(true);
        dispatch(createAsyncGetCart());
      }
    } finally { setBusy(false); }
  };
  if (!cart.loaded && !pending) return <section className="shop-page"><h1>讀取購物車</h1><p role="status">{cart.error || '正在取得訂單內容…'}</p><button onClick={() => dispatch(createAsyncGetCart())}>重新載入</button></section>;
  if (!cart.carts.length && !pending) return <section className="shop-page"><h1>購物車目前沒有商品</h1><Link to="/product">返回商品列表</Link></section>;
  return <section className="shop-page"><h1>確認這一份香氣</h1><p>這是面試展示。請使用預填的虛構收件資料，不收款、不寄信、不出貨。</p>
    <div className="shop-checkout"><form onSubmit={handleSubmit(send)} noValidate>
      <fieldset disabled={busy || !!pending}><legend>展示收件資料</legend>
        {[['name','收件人','text'],['email','電子郵件','email'],['tel','聯絡電話','tel'],['address','收件地址','text']].map(([name,label,type]) => <label key={name}>{label}<input type={type} autoComplete="off" aria-invalid={!!errors[name]} maxLength={name === 'address' ? 500 : name === 'tel' ? 40 : name === 'email' ? 254 : 100} {...register(name, { required: `請填寫${label}`, ...(name === 'email' ? { pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: '請填寫有效的電子郵件格式' } } : {}) })} />{errors[name] && <span role="alert">{errors[name].message}</span>}</label>)}
        <label>訂單備註<textarea maxLength={2000} {...register('message')} /></label>
      </fieldset>
      {pending && <p role="status">送單內容已保存。若連線中斷，重試會查回同一筆訂單，不會重複扣庫存。</p>}
      {error && <p role="alert">{error}</p>}
      {cart.error && <p role="alert">{cart.error}</p>}
      {reconfirm && <button type="button" disabled={!!cart.busy || !cart.can_checkout || !!cart.error} onClick={() => setReconfirm(false)}>確認更新後的購物車與金額</button>}
      <button type={pending ? 'button' : 'submit'} onClick={pending ? () => send(pending.data.user) : undefined} disabled={busy || reconfirm || (!pending && (!cart.can_checkout || !!cart.busy || !!cart.error))}>{busy ? '正在建立訂單…' : pending ? '重試同一筆訂單' : '確認建立未付款訂單'}</button>
      <Link to="/cart">返回購物車</Link>
    </form><aside><h2>訂單摘要</h2>{cart.carts.map((item) => <p key={item.id}>{item.product.title} × {item.qty}<br />NT${item.final_total.toLocaleString('zh-TW')}</p>)}<p className="shop-price">商品小計 NT${((pending?.data.expected_total_cents ?? cart.total_cents) / 100).toLocaleString('zh-TW')}</p><p>僅計示範商品金額，不計運費及稅額。成功送單後仍為未付款，不會導向付款網站。</p></aside></div>
  </section>;
}
