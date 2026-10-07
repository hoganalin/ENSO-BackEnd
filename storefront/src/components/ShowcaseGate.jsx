import { useState } from 'react';

import { clearWorkspace,readWorkspace, startWorkspace } from '../../../shared/showcase';

export default function ShowcaseGate({ children }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  if (readWorkspace()) return <><div className="interview-banner"><span>面試展示｜不收款、不出貨，請勿輸入真實個資。空間三十分鐘後到期。</span><a href="/#/admin/order">查看營運後台</a><button onClick={() => { clearWorkspace(); window.location.reload(); }}>離開展示</button></div>{children}</>;
  const start = async () => {
    setBusy(true); setError('');
    try { await startWorkspace(); window.location.reload(); } catch (e) { setError(e.message); setBusy(false); }
  };
  return <main className="interview-start"><span className="site-header__wordmark">ENSO</span><h1>從一支香，<br />看見完整的購物流程。</h1>
    <p>在獨立的展示空間，體驗選香、購物車、送出未付款訂單，再到營運後台查看訂單與庫存變化。</p>
    <p>不需註冊。所有商品、價格及庫存為示範資料，不收款、不出貨。空間三十分鐘後到期清除。</p>
    {error && <p role="alert">{error}</p>}
    <button className="btn btn-primary" disabled={busy} onClick={start}>{busy ? '正在準備專屬展示空間…' : '開始完整體驗'}</button>
  </main>;
}
