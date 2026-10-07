export const emailValidation = {
  required: "電子郵件是必填欄位",
  pattern: {
    value: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
    message: "請輸入有效的電子郵件格式",
  },
};
