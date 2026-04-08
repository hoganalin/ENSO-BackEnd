import { useState } from 'react';

import { useNavigate } from 'react-router-dom';
import axios from 'axios';
const API_BASE = import.meta.env.VITE_API_BASE;
const API_PATH = import.meta.env.VITE_API_PATH;
import { useForm } from 'react-hook-form';

import useMessage from '../hooks/useMessage';
import EmailValidation from '../utils/validation';
export default function Login({ getData, setIsAuth }) {
  const navigate = useNavigate();
  const { showError } = useMessage();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm({
    mode: 'onChange',
    defaultValues: {
      username: '',
      password: '',
    },
  });
  //處理表單填值
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  const handleSubmitLogin = async (formData) => {
    //處理提交表單
    // e.preventDefault();
    try {
      const response = await axios.post(`${API_BASE}/admin/signin`, formData);
      const { token, expired } = response.data;
      //儲存token到cookie
      document.cookie = `myToken=${token};expires=${new Date(
        expired * 1000
      ).toUTCString()};path=/`;
      //設定axios的預設headers
      axios.defaults.headers.common.Authorization = `${token}`;

      //導航頁面到後台首頁
      navigate('/admin');
    } catch {
      showError('提交表單失敗');
    }
  };

  // 🏆 參觀者展示模式：一鍵登入
  const handleDemoLogin = () => {
    document.cookie = `myToken=enso-demo-token;expires=${new Date(
      Date.now() + 86400000 // 1天
    ).toUTCString()};path=/`;
    navigate('/admin');
  };
  return (
    <div
      className="d-flex justify-content-center align-items-center min-vh-100"
      style={{
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      }}
    >
      <div
        className="card shadow-lg border-0 rounded-4 bg-white"
        style={{ width: '100%', maxWidth: '420px', margin: '0 20px' }}
      >
        <div className="card-body p-4 p-sm-5">
          <form action="" onSubmit={handleSubmit(handleSubmitLogin)}>
            <div className="text-center mb-4">
              <h2 className="fw-bolder mb-2 text-dark">🌿 ENSO 營運系統</h2>
              <p className="text-muted small">請登入您的授權帳號</p>
            </div>

            <div className="form-floating mb-3">
              <input
                type="email"
                className="form-control bg-light"
                id="floatingInput"
                placeholder="name@example.com"
                name="username"
                {...register('username', EmailValidation)}
              />
              <label htmlFor="floatingInput" className="text-muted">
                電子郵件 (Email Address)
              </label>
              {errors.username && (
                <div className="text-danger mt-1 small">
                  <i className="bi bi-exclamation-circle me-1"></i>
                  {errors.username.message}
                </div>
              )}
            </div>

            <div className="form-floating mb-4">
              <input
                type="password"
                className="form-control bg-light"
                id="floatingPassword"
                placeholder="Password"
                name="password"
                {...register('password', { required: '請輸入密碼' })}
              />
              <label htmlFor="floatingPassword" className="text-muted">
                密碼 (Password)
              </label>
              {errors.password && (
                <div className="text-danger mt-1 small">
                  <i className="bi bi-exclamation-circle me-1"></i>
                  {errors.password.message}
                </div>
              )}
            </div>

            <div className="d-flex flex-column gap-3 mt-4">
              <button
                className="btn btn-primary py-2 fw-bold w-100 shadow-sm rounded-3"
                type="submit"
                disabled={!isValid}
              >
                登入系統
              </button>

              <div className="position-relative text-center my-1">
                <hr className="text-muted opacity-25" />
                <span className="position-absolute top-50 start-50 translate-middle px-3 bg-white text-muted small">
                  或
                </span>
              </div>

              <button
                className="btn btn-dark py-2 shadow-sm w-100 rounded-3 fw-medium"
                type="button"
                onClick={handleDemoLogin}
              >
                🚀 參觀者一鍵體驗 (Demo Mode)
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
