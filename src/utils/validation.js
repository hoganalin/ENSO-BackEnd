const EmailValidation = {
  required: '請輸入Email',
  pattern: {
    value: /^\S+@\S+$/i,
    message: '請輸入有效的Email地址',
  },
};
export default EmailValidation;
