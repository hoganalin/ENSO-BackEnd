export default function Pagination({ pagination, onChangePage }) {
  const handleClick = (e, page) => {
    e.preventDefault();
    if (page < 1 || page > pagination.total_pages) return;
    onChangePage(page);
  };

  if (!pagination || pagination.total_pages <= 1) return null;

  return (
    <nav aria-label="Page selection" className="flex items-center gap-12 font-sans">
      <button
        type="button"
        disabled={!pagination.has_pre}
        onClick={(e) => handleClick(e, pagination.current_page - 1)}
        className="text-[0.6rem] uppercase tracking-[0.4em] font-bold text-[#111111] opacity-30 hover:opacity-100 disabled:opacity-5 transition-kyoto flex items-center gap-4 group"
      >
        <div className="w-8 h-[1px] bg-[#111111] scale-x-50 group-hover:scale-x-100 origin-right transition-transform duration-500"></div>
        PREV
      </button>

      <ul className="flex items-center gap-8">
        {Array.from({ length: pagination.total_pages }, (_, index) => {
          const pageNum = index + 1;
          const isActive = pagination.current_page === pageNum;
          return (
            <li key={index}>
              <button
                type="button"
                onClick={(e) => handleClick(e, pageNum)}
                className={`relative py-2 text-[0.7rem] font-mono transition-kyoto ${
                  isActive 
                    ? 'text-[#111111] font-bold' 
                    : 'text-[#111111]/30 hover:text-[#111111]'
                }`}
              >
                {pageNum.toString().padStart(2, '0')}
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-[1px] bg-[#984443]"></div>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        disabled={!pagination.has_next}
        onClick={(e) => handleClick(e, pagination.current_page + 1)}
        className="text-[0.6rem] uppercase tracking-[0.4em] font-bold text-[#111111] opacity-30 hover:opacity-100 disabled:opacity-5 transition-kyoto flex items-center gap-4 group"
      >
        NEXT
        <div className="w-8 h-[1px] bg-[#111111] scale-x-50 group-hover:scale-x-100 origin-left transition-transform duration-500"></div>
      </button>
    </nav>
  );
}

