import axios from 'axios';


const API_BASE = import.meta.env.VITE_API_BASE;
import { useState, useEffect } from 'react';

import { Navigate } from 'react-router';

import useMessage from '../hooks/useMessage';
import FullPageLoading from './FullPageLoading';

function ProtectedRoute({ children }) {
  //以下都是從 adminProduct copy過來
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showError } = useMessage();
  //檢查登入狀態, 之後初始化都可以先確認一次(使用useEffect,就不需要每次登入頁面都要重新登入)

  useEffect(() => {
    const token = document.cookie
      .split('; ')
      .find((row) => row.startsWith('myToken='))
      ?.split('=')[1];
    if (!token) {
      setLoading(false);
      return;
    }

    axios.defaults.headers.common.Authorization = token;

    const checkLogin = async () => {
      try {
        const res = await axios.post(`${API_BASE}/api/user/check`);
        setIsAuth(true);
      } catch {
        showError('登入狀態已過期,請重新登入');
        setIsAuth(false);
      } finally {
        setLoading(false);
      }
    };
    checkLogin();
  }, []);
  
  if (loading) {
    return <FullPageLoading isLoading={true} />;
  }
  if (!isAuth) return <Navigate to="/login"></Navigate>;
  return children;
}

export default ProtectedRoute;
