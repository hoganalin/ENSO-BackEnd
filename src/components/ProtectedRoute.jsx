import { useEffect, useState } from 'react';

import axios from 'axios';
import { Navigate } from 'react-router';

import { clearWorkspace } from '../../shared/showcase.js';
import useMessage from '../hooks/useMessage';
import { AUTH_TIMEOUT, clearSessionCookies, getApiBase, readSessionToken, isShowcase } from '../service/session';

import FullPageLoading from './FullPageLoading';

const API_BASE = getApiBase();

function ProtectedRoute({ children }) {
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkError, setCheckError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const { showError } = useMessage();
  //檢查登入狀態, 之後初始化都可以先確認一次(使用useEffect,就不需要每次登入頁面都要重新登入)

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const token = readSessionToken();
    setLoading(true);
    setCheckError('');
    if (!token) {
      setLoading(false);
      return;
    }

    // 🏆 展示模式：若偵測到 demo token，直接放行不打 API
    if (token === 'enso-demo-token') {
      setIsAuth(true);
      setLoading(false);
      return;
    }

    axios.defaults.headers.common.Authorization = token;

    const checkLogin = async () => {
      try {
        const res = await axios.post(`${API_BASE}/api/user/check`, null, { timeout: AUTH_TIMEOUT, signal: controller.signal });
        if (!active) return;
        if (res.data?.success !== true) {
          clearSessionCookies();
          delete axios.defaults.headers.common.Authorization;
          showError('登入驗證未通過，請重新登入。');
          setIsAuth(false);
        } else setIsAuth(true);
      } catch (error) {
        if (!active || axios.isCancel(error)) return;
        if (isShowcase && [401, 410].includes(error.response?.status)) {
          clearWorkspace(); window.location.assign('/shop/'); return;
        }
        if ([401, 403].includes(error.response?.status)) {
          clearSessionCookies();
          delete axios.defaults.headers.common.Authorization;
          showError('登入狀態已失效，請重新登入。');
          setIsAuth(false);
        } else {
          setCheckError('暫時無法確認登入狀態。請檢查連線後重試，既有登入資料仍保留。');
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    checkLogin();
    return () => { active = false; controller.abort(); };
  }, [attempt]);

  if (loading) {
    return <FullPageLoading isLoading={true} />;
  }
  if (checkError) return (
    <main className="enso-page">
      <header className="enso-page-header">
        <h1 className="enso-page-title">登入狀態確認暫停</h1>
      </header>
      <div className="workspace-error" role="alert">
        <p>{checkError}</p>
        <button className="enso-button-primary" onClick={() => setAttempt((value) => value + 1)}>
          重新確認登入
        </button>
      </div>
    </main>
  );
  if (!isAuth) return <Navigate to="/login" replace />;
  return children;
}

export default ProtectedRoute;
