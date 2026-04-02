import { configureStore } from '@reduxjs/toolkit';

import messageReducer from '../slices/messageSlice';

export const store = configureStore({
  reducer: {
    message: messageReducer,
  },
});

export default store;
