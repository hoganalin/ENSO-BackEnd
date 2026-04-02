export default function Pagination({ pagination, onChangePage }) {
  const handleClick = (e, page) => {
    e.preventDefault();
    onChangePage(page);
  };
  return (
    <nav aria-label="Page navigation example">
      {/* {JSON.stringify(pagination)} */}
      <ul className="pagination justify-content-center">
        <li className={`page-item ${!pagination.has_pre && 'disabled'}`}>
          <a
            className="page-link"
            href="#"
            tabIndex="-1"
            onClick={(e) => handleClick(e, pagination.current_page - 1)}
          >
            Previous
          </a>
        </li>
        {Array.from({ length: pagination.total_pages }, (_, index) => (
          <li
            className={`page-item ${pagination.current_page === index + 1 && 'active'}`}
            key={index}
            onClick={(e) => handleClick(e, index + 1)}
          >
            <a className="page-link" href="#">
              {index + 1}
            </a>
          </li>
        ))}
        <li className={`page-item ${!pagination.has_next && 'disabled'}`}>
          <a
            className="page-link"
            href="#"
            onClick={(e) => handleClick(e, pagination.current_page + 1)}
          >
            Next
          </a>
        </li>
      </ul>
    </nav>
  );
}
