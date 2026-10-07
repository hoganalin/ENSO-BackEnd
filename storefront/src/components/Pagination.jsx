function Pagination({ pagination, onChangePage }) {
  return (
    <nav aria-label="Page navigation ">
      <ul className="pagination justify-content-center">
        <li className={`page-item ${pagination.has_pre ? "" : "disabled"}`}>
          <a
            className="page-link"
            href="#"
            aria-label="Previous"
            onClick={(e) => {
              e.preventDefault();
              if (pagination.has_pre) onChangePage(pagination.current_page - 1);
            }}
          >
            <span aria-hidden="true">&laquo;</span>
          </a>
        </li>

        {Array.from({ length: pagination.total_pages }).map((_, index) => (
          <li
            className={`page-item ${pagination.current_page === index + 1 ? "active" : ""}`}
            key={index}
          >
            <a
              className="page-link"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onChangePage(index + 1);
              }}
            >
              {index + 1}
            </a>
          </li>
        ))}
        <li className={`page-item ${pagination.has_next ? "" : "disabled"}`}>
          <a
            className="page-link"
            href="#"
            aria-label="Next"
            onClick={(e) => {
              e.preventDefault();
              if (pagination.has_next) onChangePage(pagination.current_page + 1);
            }}
          >
            <span aria-hidden="true">&raquo;</span>
          </a>
        </li>
      </ul>
    </nav>
  );
}
export default Pagination;
