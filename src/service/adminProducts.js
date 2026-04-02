import { apiAuth, API_PATH } from './api';

export const getAdminProducts = (page = 1) =>
  apiAuth.get(`/api/${API_PATH}/admin/products?page=${page}`);

export const createAdminProduct = (data) =>
  apiAuth.post(`/api/${API_PATH}/admin/product`, { data });

export const updateAdminProduct = (id, data) =>
  apiAuth.put(`/api/${API_PATH}/admin/product/${id}`, { data });

export const deleteAdminProduct = (id) =>
  apiAuth.delete(`/api/${API_PATH}/admin/product/${id}`);

export const uploadAdminImage = (formData) =>
  apiAuth.post(`/api/${API_PATH}/admin/upload`, formData);
