import { useDispatch, useSelector } from 'react-redux';

import { removeMessage } from '../slices/messageSlice';

export default function MessageToast() {
  const messages = useSelector((state) => state.message);
  const dispatch = useDispatch();
  return (
    <>
      <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 1055 }}>
        {messages.map((message) => (
          <div
            key={message.id}
            className="toast show"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
          >
            <div className={`toast-header bg-${message.type} text-white`}>
              <strong className="me-auto">{message.title}</strong>
              <button
                type="button"
                className="btn-close"
                onClick={() => dispatch(removeMessage(message.id))}
                aria-label="關閉通知"
              ></button>
            </div>
            <div className="toast-body">{message.text}</div>
          </div>
        ))}
      </div>
    </>
  );
}
