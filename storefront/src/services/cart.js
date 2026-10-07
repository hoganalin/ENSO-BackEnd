import { api, API_PATH } from "./api";

export const getCartApi = () => {
  return api.get(`/api/${API_PATH}/cart`);
};

export const addCartApi = ({ product_id, qty }) => {
  return api.post(`/api/${API_PATH}/cart`, {
    data: {
      product_id,
      qty,
    },
  });
};

export const deleteSingleCartApi = (id) => {
  return api.delete(`/api/${API_PATH}/cart/${id}`);
};

export const deleteAllCartApi = () => {
  return api.delete(`/api/${API_PATH}/carts`);
};

export const updateCartApi = (id, { product_id, qty }) => {
  return api.put(`/api/${API_PATH}/cart/${id}`, {
    data: {
      product_id,
      qty,
    },
  });
};

export const createOrderApi = (data, key) => {
  return api.post(`/api/${API_PATH}/order`, {
    data: data,
  }, { headers: { 'Idempotency-Key': key } });
};
