import { createAsyncThunk,createSlice } from "@reduxjs/toolkit";

const messageSlice = createSlice({
  name: "message",
  initialState: {
    messages: [],
  },
  reducers: {
    addMessage: (state, action) => {
      const { id, success, message } = action.payload;
      state.messages.push({
        id,
        type: success ? "success" : "danger",
        title: success ? "成功" : "失敗",
        text: message,
      });
    },
    removeMessage: (state, action) => {
      const index = state.messages.findIndex(
        (item) => item.id === action.payload,
      );
      if (index !== -1) {
        state.messages.splice(index, 1);
      }
    },
  },
});

export const createAsyncAddMessage = createAsyncThunk(
  "message/createAsyncAddMessage",
  async (payload, { dispatch }) => {
    const id = Date.now();
    dispatch(
      addMessage({
        id,
        ...payload,
      }),
    );
    setTimeout(() => {
      dispatch(removeMessage(id));
    }, 3000);
  },
);

export const { addMessage, removeMessage } = messageSlice.actions;
export default messageSlice.reducer;
