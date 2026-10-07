import { Link, useParams } from 'react-router';

import { readReceipt } from '../services/checkoutAttempt';

export default function CheckoutSuccess() {
  const { orderId } = useParams();
  const receipt = readReceipt(orderId);
  if (!receipt || receipt.orderId !== orderId) return <section className="shop-page"><h1>尚無可確認的送單回執</h1><p>這個瀏覽器沒有此筆成功送單紀錄，不會自行產生訂單編號。</p><Link to="/cart">返回購物車</Link></section>;
  return <section className="shop-page"><h1>展示訂單已建立</h1><p>送單時狀態為未付款。此頁是送單回執，不是目前付款或取消狀態查詢。</p><h2>訂單編號</h2><p className="shop-order-id">{receipt.orderId}</p><p>商品小計 NT${receipt.total.toLocaleString('zh-TW')}</p><p>不收款、不寄送確認信，也不安排出貨。你可以到營運後台查看這筆訂單，體驗取消後庫存回補。</p><div className="shop-actions"><a className="btn btn-primary" href="/#/admin/order">到後台查看這筆訂單</a><Link to="/product">繼續選香</Link></div></section>;
}
