// ENSO 後台 · 登入頁
//
// 設計：Claude Design 交付包 V2「置中霧面卡片」
//   - 暖灰底 + 米金線條 + 全屏霧氣 + 餘燼粒子 + 手繪月相 logo
//   - 中央 440px backdrop-blur 玻璃卡，四角米金細線裝飾
//   - 成功登入有 SuccessVeil 米金 ping 漣漪過場
//
// 行為：保留原有 RHF + Hex API 登入 + demo token 一鍵體驗。
// 樣式定義在 ./Login.module.css，動畫與 token 都 scope 在 .root 內，不污染全域。

import { useState } from 'react';

import axios from 'axios';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import ensoMark from '../assets/enso-mark.png';
import useMessage from '../hooks/useMessage';
import EmailValidation from '../utils/validation';

import styles from './Login.module.css';

const API_BASE = import.meta.env.VITE_API_BASE;

// 14 顆餘燼，左右散布、起飛時間錯開（與設計檔的 ember spread 演算法一致）
const EMBERS = Array.from({ length: 14 }, (_, i) => ({
  left: `${(i * 7.3 + 3) % 100}%`,
  delay: `${i * 1.1}s`,
  duration: `${10 + (i % 5) * 2}s`,
}));

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
      const response = await axios.post(`${API_BASE}/admin/signin`, formData);
      const { token, expired } = response.data;
      document.cookie = `myToken=${token};expires=${new Date(
        expired * 1000
      ).toUTCString()};path=/`;
      axios.defaults.headers.common.Authorization = `${token}`;

      setSuccess(true);
      // 米金 ping 漣漪短暫展示後再進後台
      setTimeout(() => navigate('/admin'), 900);
    } catch (err) {
      const msg = err?.response?.data?.message || '帳號或密碼錯誤，請再試一次';
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
      Date.now() + 86400000 // 1 天
    ).toUTCString()};path=/`;

    setSuccess(true);
    setTimeout(() => navigate('/admin'), 900);
  };

  // 第一個出現的錯誤訊息：先顯示 RHF validation，否則顯示 submit error
  const visibleError =
    errors.username?.message || errors.password?.message || submitError;

  return (
    <div className={styles.root}>
      {/* === 環境霧氣 + 餘燼 + 噪點 === */}
      <div className={styles.backdrop} aria-hidden="true">
        <div className={`${styles.smokeLayer} ${styles.smokeA}`} />
        <div className={`${styles.smokeLayer} ${styles.smokeB}`} />
        <div className={`${styles.smokeLayer} ${styles.smokeC}`} />
        <div className={styles.embers}>
          {EMBERS.map((e, i) => (
            <span
              key={i}
              className={styles.ember}
              style={{
                left: e.left,
                animationDelay: e.delay,
                animationDuration: e.duration,
              }}
            />
          ))}
        </div>
        <div className={styles.grain} />
      </div>

      {/* === 中央霧面卡片 === */}
      <div className={styles.card}>
        <div className={`${styles.cornerOrn} ${styles.cornerTL}`} />
        <div className={`${styles.cornerOrn} ${styles.cornerTR}`} />
        <div className={`${styles.cornerOrn} ${styles.cornerBL}`} />
        <div className={`${styles.cornerOrn} ${styles.cornerBR}`} />

        {/* 品牌 lockup */}
        <div className={styles.brand}>
          <div className={styles.markWrap}>
            <div className={styles.markGlow} aria-hidden="true" />
            <img src={ensoMark} alt="ENSO" className={styles.markImg} />
          </div>
          <div className={styles.brandName}>ENSO</div>
          <div className={styles.brandTagline}>聞 相 · 吞</div>
        </div>

        <div className={styles.subhead}>
          <div className={styles.subheadKicker}>後 台 管 理 系 統</div>
          <div className={styles.subheadEn}>Operations Console · Sign In</div>
        </div>

        <form
          className={styles.form}
          onSubmit={handleSubmit(handleSubmitLogin)}
          noValidate
        >
          {success && (
            <div className={styles.veil} role="status" aria-live="polite">
              <div className={styles.veilCircle}>
                <i className={`fa-solid fa-check ${styles.veilCheck}`} />
              </div>
              <div className={styles.veilLabel}>進入後台 · Welcome</div>
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-email">
              帳號 / Email
            </label>
            <div className={styles.inputWrap}>
              <i
                className={`fa-regular fa-envelope ${styles.inputIcon}`}
                aria-hidden="true"
              />
              <input
                id="login-email"
                type="email"
                placeholder="admin@enso.tw"
                disabled={loading}
                className={styles.input}
                {...register('username', EmailValidation)}
              />
            </div>
          </div>

          <div className={styles.fieldTight}>
            <label className={styles.label} htmlFor="login-password">
              密碼 / Password
            </label>
            <div className={styles.inputWrap}>
              <i
                className={`fa-solid fa-lock ${styles.inputIcon}`}
                aria-hidden="true"
              />
              <input
                id="login-password"
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                disabled={loading}
                className={`${styles.input} ${styles.inputPw}`}
                {...register('password', { required: '請輸入密碼' })}
              />
              <button
                type="button"
                className={styles.pwToggle}
                onClick={() => setShowPw((s) => !s)}
                tabIndex={-1}
                aria-label={showPw ? '隱藏密碼' : '顯示密碼'}
              >
                <i
                  className={
                    showPw ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'
                  }
                />
              </button>
            </div>
          </div>

          <div
            className={`${styles.errorRow} ${visibleError ? styles.errorRowActive : ''}`}
            aria-live="polite"
          >
            {visibleError && (
              <div className={styles.errorMsg}>
                <i className="fa-solid fa-circle-exclamation" />
                <span>{visibleError}</span>
              </div>
            )}
          </div>

          <div className={styles.optionsRow}>
            <label className={styles.remember}>
              <span
                className={`${styles.checkbox} ${remember ? styles.checkboxChecked : ''}`}
              >
                {remember && (
                  <i className={`fa-solid fa-check ${styles.checkboxIcon}`} />
                )}
              </span>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className={styles.checkboxNative}
              />
              記住我
            </label>
            <a href="#forgot" className={styles.forgot}>
              忘記密碼?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading || !isValid}
            className={styles.btnPrimary}
          >
            {loading ? (
              <>
                <span className={styles.spinner} />
                <span className={styles.btnPrimarySpinning}>SIGNING IN…</span>
              </>
            ) : (
              <>
                <span>登 入</span>
                <span className={styles.btnPrimaryDot}>·</span>
                <span className={styles.btnPrimaryEn}>Sign In</span>
              </>
            )}
          </button>

          <div className={styles.divider}>
            <div className={styles.hairline} />
            <span>或</span>
            <div className={styles.hairline} />
          </div>

          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading}
            className={styles.btnDemo}
          >
            <i
              className="fa-solid fa-wand-sparkles"
              style={{ fontSize: 11, opacity: 0.7 }}
            />
            <span>DEMO 一鍵體驗</span>
          </button>
        </form>

        <div className={styles.footnote}>
          © ENSO · 沈 香 · 老 山 檀 · 印 度 老 山
        </div>
      </div>
    </div>
  );
}
