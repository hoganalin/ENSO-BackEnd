export const currency = (num) => {
  const n = Number(num) || 0;
  return n.toLocaleString('zh-TW');
};

export const formatTwd = (num) => `NT$ ${currency(num)}`;
