import { useDispatch,useSelector } from "react-redux";

import { removeMessage } from "../slice/messageSlice";

function MessageToast() {
  const messages = useSelector((state) => state.message.messages);
  const dispatch = useDispatch();

  return (
    <div className="message-toast-wrapper position-fixed top-0 end-0 p-3">
      {messages.map((message) => (
        <div
          className="toast show mt-2"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          key={message.id}
        >
          <div className={`toast-header text-white bg-${message.type}`}>
            <strong className="me-auto">{message.title}</strong>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={() => dispatch(removeMessage(message.id))}
              aria-label="Close"
            ></button>
          </div>
          <div className="toast-body">{message.text}</div>
        </div>
      ))}
    </div>
  );
}

export default MessageToast;
