import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";

import Swal from "sweetalert2";

import { emailValidation } from "../assets/utils/validation";
import { adminApi } from "../services/api";

const Login = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    mode: "onTouched",
  });

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    setLoading(true);

    // 後端 API 預期的是 username 欄位來接收 email
    const loginData = {
      username: data.email,
      password: data.password,
    };

    try {
      // 使用在 api.js 中封裝好的 adminApi 實體
      const res = await adminApi.post("/admin/signin", loginData);
      const { token, expired } = res.data;

      // 儲存 token 到 cookie，加上 path=/ 以確保全站可用
      document.cookie = `hexToken=${token}; expires=${new Date(expired)}; path=/;`;
      // 登入成功後，右上角會彈出通知視窗
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "登入成功！",
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });
      navigate("/product"); // 登入後導引至產品頁
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "登入失敗",
        text: error.response?.data?.message || "請檢查帳號密碼",
        confirmButtonColor: "#1a4636",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5 mb-7 py-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-4">
          <div className="card border-0 shadow-lg rounded-4 overflow-hidden">
            <div className="card-body p-5">
              <h2 className="text-center mb-4 fw-bold">登入 ENSO</h2>
              <p className="text-muted text-center mb-5 small">
                歡迎回來，請登入您的帳號
              </p>

              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className="mb-4">
                  <label className="form-label text-secondary small fw-bold">
                    電子郵件
                  </label>
                  <input
                    type="email"
                    className={`form-control form-control-lg border-0 bg-light rounded-3 ${
                      errors.email ? "is-invalid" : ""
                    }`}
                    placeholder="name@example.com"
                    {...register("email", emailValidation)}
                  />
                  {errors.email && (
                    <div className="invalid-feedback">
                      {errors.email.message}
                    </div>
                  )}
                </div>

                <div className="mb-5">
                  <label className="form-label text-secondary small fw-bold">
                    密碼
                  </label>
                  <input
                    type="password"
                    className={`form-control form-control-lg border-0 bg-light rounded-3 ${
                      errors.password ? "is-invalid" : ""
                    }`}
                    placeholder="請輸入密碼"
                    {...register("password", { required: "密碼是必填欄位" })}
                  />
                  {errors.password && (
                    <div className="invalid-feedback">
                      {errors.password.message}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn btn-dark btn-lg w-100 rounded-pill py-3 fw-bold shadow-sm mb-4"
                  disabled={loading}
                >
                  {loading && (
                    <span className="spinner-border spinner-border-sm me-2"></span>
                  )}
                  立即登入
                </button>
              </form>

              <div className="text-center">
                <span className="text-muted small">還沒有帳號？</span>{" "}
                <Link
                  to="/register"
                  className="text-decoration-none small fw-bold text-dark"
                >
                  立即註冊
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
