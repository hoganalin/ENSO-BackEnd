export default function Pagination({ pagination, onChangePage }) {
  const total = Number(pagination?.total_pages) || 0;
  const current = Number(pagination?.current_page) || 1;
  if (total <= 1) return null;
  return (
    <nav className="workspace-pager" aria-label="分頁導覽">
      <button
        className="enso-button-secondary"
        disabled={current <= 1}
        onClick={() => onChangePage(current - 1)}
      >
        上一頁
      </button>
      <span aria-live="polite">
        第 {current}／{total} 頁
      </span>
      <button
        className="enso-button-secondary"
        disabled={current >= total}
        onClick={() => onChangePage(current + 1)}
      >
        下一頁
      </button>
      <label className="workspace-pager__jump">
        跳至{' '}
        <select
          aria-label="跳至頁碼"
          value={current}
          onChange={(event) => onChangePage(Number(event.target.value))}
        >
          {Array.from({ length: total }, (_, index) => (
            <option key={index} value={index + 1}>
              {index + 1}
            </option>
          ))}
        </select>{' '}
        頁
      </label>
    </nav>
  );
}
