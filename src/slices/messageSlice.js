import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export const messageSlice = createSlice({
  name: 'message',
  initialState: [
    // {
    //   id: 1,
    //   type: 'success',
    //   title: '成功',
    //   text: '成功',
    // },
  ],
  reducers: {
    createMessage(state, action) {
      state.push({
        id: action.payload.id,
        type: action.payload.success ? 'success' : 'danger',
        title: action.payload.success ? '成功' : '失敗',
        text: action.payload.message,
      });
    },
    removeMessage(state, action) {
      const index = state.findIndex((message) => message.id === action.payload);
      if (index !== -1) {
        state.splice(index, 1);
      }
    },
  },
});

export const createAsyncMessage = createAsyncThunk(
  'message/createMessage',
  async (payload, { dispatch, requestId }) => {
    dispatch(
      createMessage({
        id: requestId,
        ...payload,
      })
    );
    setTimeout(() => {
      dispatch(removeMessage(requestId));
    }, 3000);
  }
);

export default messageSlice.reducer;
export const { createMessage, removeMessage } = messageSlice.actions;
