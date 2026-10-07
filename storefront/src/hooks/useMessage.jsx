import { useCallback } from "react";
import { useDispatch } from "react-redux";

import { createAsyncAddMessage } from "../slice/messageSlice";

function useMessage() {
  const dispatch = useDispatch();
  const showSuccess = useCallback((message) => {
    dispatch(createAsyncAddMessage({ success: true, message }));
  }, [dispatch]);
  const showError = useCallback((message) => {
    dispatch(createAsyncAddMessage({ success: false, message }));
  }, [dispatch]);
  return { showSuccess, showError };
}

export default useMessage;
