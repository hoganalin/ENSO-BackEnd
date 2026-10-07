import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";

import Swal from "sweetalert2";

import { emailValidation } from "../assets/utils/validation";

const Register = () => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    mode: "onTouched", // 離開欄位時即觸發驗證
  });

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // 監控「設定密碼」欄位的值，用來做二次確認的比對
  const passwordValue = watch("password");

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      //沒有註冊 API 可使用
      // 目前 API 為模擬流程，若後端有註冊接口可在此處調用 axios
      console.log("註冊資料：", data);

      await new Promise((resolve) => setTimeout(resolve, 1500));
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "註冊成功！歡迎加入 ENSO。",
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });
      navigate("/login");
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "註冊失敗",
        text: "註冊發生錯誤，請稍後再試。",
        confirmButtonColor: "#1a4636",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5 mb-5 py-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card border-0 shadow-lg rounded-4 overflow-hidden">
            <div className="card-body p-5">
              <div className="text-center mb-5">
                <h2 className="fw-bold text-dark">加入 ENSO</h2>
                <p className="text-muted small">開啟您的靜謐香氛之旅</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                {/* 姓名 */}
                <div className="mb-4">
                  <label className="form-label text-secondary small fw-bold">
                    您的姓名
                  </label>
                  <input
                    type="text"
                    className={`form-control form-control-lg border-0 bg-light rounded-3 ${
                      errors.username ? "is-invalid" : ""
                    }`}
                    placeholder="請輸入姓名"
                    {...register("username", { required: "姓名是必填的" })}
                  />
                  {errors.username && (
                    <div className="invalid-feedback">
                      {errors.username.message}
                    </div>
                  )}
                </div>

                {/* Email */}
                <div className="mb-4">
                  <label className="form-label text-secondary small fw-bold">
                    電子郵件
                  </label>
                  <input
                    type="email"
                    className={`form-control form-control-lg border-0 bg-light rounded-3 ${
                      errors.email ? "is-invalid" : ""
                    }`}
                    placeholder="example@mail.com"
                    {...register("email", emailValidation)}
                  />
                  {errors.email && (
                    <div className="invalid-feedback">
                      {errors.email.message}
                    </div>
                  )}
                </div>

                {/* 密碼 */}
                <div className="mb-4">
                  <label className="form-label text-secondary small fw-bold">
                    設定密碼
                  </label>
                  <input
                    type="password"
                    className={`form-control form-control-lg border-0 bg-light rounded-3 ${
                      errors.password ? "is-invalid" : ""
                    }`}
                    placeholder="請輸入 6 位以上密碼"
                    {...register("password", {
                      required: "請設定您的密碼",
                      minLength: { value: 6, message: "密碼至少需要 6 位數" },
                    })}
                  />
                  {errors.password && (
                    <div className="invalid-feedback">
                      {errors.password.message}
                    </div>
                  )}
                </div>

                {/* 確認密碼 */}
                <div className="mb-5">
                  <label className="form-label text-secondary small fw-bold">
                    確認密碼
                  </label>
                  <input
                    type="password"
                    className={`form-control form-control-lg border-0 bg-light rounded-3 ${
                      errors.confirmPassword ? "is-invalid" : ""
                    }`}
                    placeholder="請再次輸入並確認密碼"
                    {...register("confirmPassword", {
                      required: "請再次確認您的密碼",
                      validate: (value) =>
                        value === passwordValue || "兩次輸入的密碼不一致",
                    })}
                  />
                  {errors.confirmPassword && (
                    <div className="invalid-feedback">
                      {errors.confirmPassword.message}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn btn-dark btn-lg w-100 rounded-pill py-3 fw-bold shadow-sm mb-4"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="spinner-border spinner-border-sm me-2"></span>
                  ) : (
                    "立即註冊"
                  )}
                </button>
              </form>

              <div className="text-center">
                <span className="text-muted small">已經有帳號了？</span>{" "}
                <Link
                  to="/login"
                  className="text-decoration-none small fw-bold text-dark"
                >
                  立即登入
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
