import { apiAuth } from './api';
import { API_PATH } from './api';

//取得所有優惠券
export const getCoupons = async (page = 1) => {
  const response = await apiAuth.get(`/api/${API_PATH}/admin/coupons?page=${page}`);
  return response.data;
};

//新增優惠券
export const createCoupon = async (data) => {
  const response = await apiAuth.post(`/api/${API_PATH}/admin/coupon`, data);
  return response.data;
};

//更新優惠券
export const updateCoupon = async (id, data) => {
  const response = await apiAuth.put(`/api/${API_PATH}/admin/coupon/${id}`, data);
  return response.data;
};

//刪除優惠券
export const deleteCoupon = async (id) => {
  const response = await apiAuth.delete(`/api/${API_PATH}/admin/coupon/${id}`);
  return response.data;
};
