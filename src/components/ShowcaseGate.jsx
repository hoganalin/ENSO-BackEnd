import { useState } from 'react';

import { readWorkspace, startWorkspace } from '../../shared/showcase';

export default function ShowcaseGate({ children }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (import.meta.env.VITE_SHOWCASE !== 'true' || readWorkspace()) return children;
  const start = async () => {
    setBusy(true);
    try { await startWorkspace(); window.location.assign('/shop/#/'); }
    catch (err) { setError(err.message); setBusy(false); }
  };
  return <main className="enso-page"><h1 className="enso-page-title">體驗 ENSO 前後台</h1>
    <p>建立一個獨立的三十分鐘展示空間，從選香、購物到後台處理訂單。</p>
    <p>不需註冊。商品、庫存與收件資料均為示範，不會收款或出貨。到期後資料會清除。</p>
    {error && <p role="alert">{error}</p>}
    <button className="enso-button-primary" disabled={busy} onClick={start}>{busy ? '準備展示資料中…' : '開始完整體驗'}</button>
  </main>;
}
