import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { errorMessage } from '../services/api';
import { addCartApi, deleteAllCartApi, deleteSingleCartApi, getCartApi, updateCartApi } from '../services/cart';

export const createAsyncGetCart = createAsyncThunk('cart/get', async (_, { rejectWithValue }) => {
  try { return (await getCartApi()).data.data; } catch (e) { return rejectWithValue(errorMessage(e)); }
});
const mutate = (name, call) => createAsyncThunk(`cart/${name}`, async (input, { rejectWithValue }) => {
  try { await call(input); return (await getCartApi()).data.data; } catch (e) { return rejectWithValue(errorMessage(e)); }
});
export const createAsyncAddCart = mutate('add', ({ id, qty = 1 }) => addCartApi({ product_id: id, qty }));
export const createAsyncDeleteSingleCart = mutate('remove', (id) => deleteSingleCartApi(id));
export const createAsyncDeleteAllCart = mutate('clear', () => deleteAllCartApi());
export const createAsyncUpdateCart = mutate('update', ({ id, product_id, qty }) => updateCartApi(id, { product_id, qty }));
const initialState = { carts: [], total: 0, final_total: 0, total_cents: 0, version: 0, can_checkout: false, busy: 0, error: '', loaded: false };
const cartSlice = createSlice({ name: 'cart', initialState, reducers: {}, extraReducers: (builder) => {
  builder.addMatcher((a) => a.type.startsWith('cart/') && a.type.endsWith('/pending'), (s) => { s.busy++; s.error = ''; });
  builder.addMatcher((a) => a.type.startsWith('cart/') && a.type.endsWith('/fulfilled'), (s, a) => {
    if (a.payload.version >= s.version) Object.assign(s, a.payload);
    s.busy = Math.max(0, s.busy - 1); s.loaded = true;
  });
  builder.addMatcher((a) => a.type.startsWith('cart/') && a.type.endsWith('/rejected'), (s, a) => {
    s.busy = Math.max(0, s.busy - 1); s.error = a.payload || '購物車讀取失敗，請重試。';
  });
} });
export default cartSlice.reducer;
