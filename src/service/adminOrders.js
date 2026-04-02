import { apiAuth, API_PATH } from './api';

const resolveOrderId = (orderOrId) =>
  typeof orderOrId === 'string' ? orderOrId : orderOrId?.id;

// 取得訂單列表
export const getAdminOrders = (page = 1) =>
  apiAuth.get(`/api/${API_PATH}/admin/orders?page=${page}`);

// 修改訂單（Hexschool v2: /admin/order/:id）
export const updateAdminOrder = (orderOrId, data) => {
  const orderId = resolveOrderId(orderOrId);
  return apiAuth.put(`/api/${API_PATH}/admin/order/${orderId}`, { data });
};

// 刪除單筆訂單（Hexschool v2: /admin/order/:id）
export const deleteAdminOrder = (orderOrId) => {
  const orderId = resolveOrderId(orderOrId);
  return apiAuth.delete(`/api/${API_PATH}/admin/order/${orderId}`);
};

// 刪除所有訂單
export const deleteAllAdminOrders = () =>
  apiAuth.delete(`/api/${API_PATH}/admin/orders/all`);
