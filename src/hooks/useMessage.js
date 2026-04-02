import { useDispatch } from 'react-redux';

import { createAsyncMessage } from '../slices/messageSlice';
function useMessage() {
  const dispatch = useDispatch();
  const showSuccess = (message) =>
    dispatch(
      createAsyncMessage({
        success: true,
        message: message,
      })
    );
  const showError = (message) =>
    dispatch(
      createAsyncMessage({
        success: false,
        message: message,
      })
    );

  return { showSuccess, showError };
}

export default useMessage;
