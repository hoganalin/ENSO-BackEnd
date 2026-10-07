import { useEffect, useRef } from 'react';

export default function Dialog({
  title,
  children,
  onClose,
  busy = false,
  footer,
}) {
  const ref = useRef(null);
  useEffect(() => {
    const element = ref.current;
    const priorFocus = document.activeElement;
    const priorOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      document.body.style.overflow = priorOverflow;
      priorFocus?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="workspace-dialog"
      aria-labelledby="workspace-dialog-title"
      aria-busy={busy}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <header className="workspace-dialog__header">
        <h2 id="workspace-dialog-title">{title}</h2>
        <button
          type="button"
          className="enso-button-secondary"
          onClick={onClose}
          disabled={busy}
          aria-label="關閉視窗"
        >
          關閉
        </button>
      </header>
      <div className="workspace-dialog__body">{children}</div>
      {footer && <footer className="workspace-dialog__footer">{footer}</footer>}
    </dialog>
  );
}
