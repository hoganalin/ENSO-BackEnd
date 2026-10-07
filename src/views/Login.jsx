// ENSO 後台 · 登入頁
//
// 設計：ENSO 營運工作台登入入口
//   - 延續前台奶油米色、深藍、螢光黃綠與橘紅色
//   - 保留清楚的登入、錯誤與展示模式流程
//
// 行為：保留原有 RHF + Hex API 登入 + demo token 一鍵體驗。
// 樣式定義在 ./Login.module.css，動畫與 token 都 scope 在 .root 內，不污染全域。

import { useState } from 'react';

import axios from 'axios';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';

import useMessage from '../hooks/useMessage';
import { AUTH_TIMEOUT, authenticationErrorMessage, createSessionCookie } from '../service/session';
import EmailValidation from '../utils/validation';

import styles from './Login.module.css';

const API_BASE = import.meta.env.VITE_API_BASE;

// 預設 dev / preview 環境顯示一鍵 demo 按鈕；正式部署可用
// VITE_ENABLE_DEMO=false 關掉。Vercel 上線給面試官看時，仍預設顯示。
const showDemoButton =
  import.meta.env.VITE_ENABLE_DEMO !== 'false' &&
  import.meta.env.VITE_ENABLE_DEMO !== '0';

export default function Login() {
  const navigate = useNavigate();
  const { showError } = useMessage();

  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isValid },
  } = useForm({
    mode: 'onChange',
    defaultValues: { username: '', password: '' },
  });

  const handleSubmitLogin = async (formData) => {
    setSubmitError('');
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/admin/signin`, formData, { timeout: AUTH_TIMEOUT });
      document.cookie = createSessionCookie(response.data, remember);
      axios.defaults.headers.common.Authorization = response.data.token;

      setSuccess(true);
      // 顯示短暫成功狀態後再進入後台
      setTimeout(() => navigate('/admin'), 900);
    } catch (err) {
      const msg = err?.isAxiosError ? authenticationErrorMessage(err) : err.message;
      setSubmitError(msg);
      showError(msg);
      setLoading(false);
    }
  };

  // 參觀者展示模式：直接寫入 demo token 並進後台
  const handleDemoLogin = () => {
    if (loading) return;
    setSubmitError('');
    setValue('username', 'demo@enso.tw');
    setValue('password', 'enso-demo-token');
    setLoading(true);

    document.cookie = `myToken=enso-demo-token;expires=${new Date(
      Date.now() + 30 * 86400000 // 30 天，避免 demo 中途被踢回登入
    ).toUTCString()};path=/`;

    setSuccess(true);
    setTimeout(() => navigate('/admin'), 900);
  };

  // 第一個出現的錯誤訊息：先顯示 RHF validation，否則顯示 submit error
  const visibleError =
    errors.username?.message || errors.password?.message || submitError;

  if (import.meta.env.VITE_SHOWCASE === 'true') return <Navigate to="/admin" replace />;
  return (
    <main className={styles.root}>
      <section className={styles.card} aria-labelledby="login-title">
        <div className={styles.brand}>
          <span className={styles.brandName}>ENSO</span>
          <span className={styles.brandTagline}>營運工作台</span>
        </div>
        <h1 id="login-title" className={styles.title}>
          回到營運日常
        </h1>
        <p className={styles.description}>
          管理商品、處理訂單，讓每一份香氣順利抵達。
        </p>
        <form
          className={styles.form}
          onSubmit={handleSubmit(handleSubmitLogin)}
          noValidate
        >
          <label className="workspace-field">
            <span>管理員電子郵件</span>
            <input
              type="email"
              autoComplete="username"
              disabled={loading}
              {...register('username', EmailValidation)}
            />
          </label>
          <label className="workspace-field">
            <span>密碼</span>
            <input
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              disabled={loading}
              {...register('password', { required: '請輸入密碼' })}
            />
          </label>
          <div className={styles.optionsRow}>
            <label className="workspace-checkbox">
              <input
                type="checkbox"
                checked={remember}
                disabled={loading}
                onChange={(event) => setRemember(event.target.checked)}
              />
              保持登入
            </label>
            <button
              className="workspace-link"
              type="button"
              aria-pressed={showPw}
              onClick={() => setShowPw((value) => !value)}
            >
              {showPw ? '隱藏密碼' : '顯示密碼'}
            </button>
          </div>
          {visibleError && (
            <p role="alert" className="workspace-error">
              {visibleError}
            </p>
          )}
          {success && <p role="status">登入成功，正在開啟工作台…</p>}
          <button className={styles.btnPrimary} disabled={loading || !isValid}>
            {loading ? '登入中…' : '登入工作台'}
          </button>
          {showDemoButton && (
            <>
              <div className={styles.divider}>
                <span className={styles.hairline} />
                <span>先看看操作介面</span>
                <span className={styles.hairline} />
              </div>
              <button
                className={styles.btnDemo}
                type="button"
                onClick={handleDemoLogin}
                disabled={loading}
              >
                進入展示模式
              </button>
              <p className={styles.description}>
                不需要帳號。展示操作只影響目前瀏覽器，不會修改正式商店。
              </p>
            </>
          )}
        </form>
        <p className={styles.footnote}>
          無法登入時，請聯絡管理員確認帳號權限。
        </p>
      </section>
    </main>
  );
}
