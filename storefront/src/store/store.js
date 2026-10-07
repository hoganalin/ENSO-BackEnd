import { configureStore } from "@reduxjs/toolkit";

import cartReducer from "../slice/cartSlice.js";
import messageReducer from "../slice/messageSlice.js";
export const store = configureStore({
  reducer: {
    cart: cartReducer,
    message: messageReducer,
  },
});
