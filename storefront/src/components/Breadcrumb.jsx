import { Link, useLocation } from "react-router";

const Breadcrumb = () => {
  // 1. 取得目前的 URL
  const location = useLocation();

  // 2. 把路徑切開，例如 "/product/abc" → ["product", "abc"]
  const rawPathnames = location.pathname.split("/").filter((x) => x);
  // checkout-success/:orderId 會讓麵包屑多出一段訂單編號，這段通常不需要顯示
  const pathnames = rawPathnames.filter(
    (_, index) =>
      !(index > 0 && rawPathnames[index - 1] === "checkout-success"),
  );
  //目前這段不是第一段」(index > 0) 且 前一段是 "checkout-success"則回傳false，過濾掉

  // 3️. 英文路徑 → 中文名稱 對照表
  const breadcrumbMap = {
    product: "所有產品",
    cart: "購物車",
    checkout: "結帳流程",
    "checkout-success": "訂單完成",
    about: "關於我們",
    faq: "常見問題",
    contact: "聯絡我們",
    login: "會員登入",
    register: "會員註冊",
  };

  // 4️.首頁不需要麵包屑
  if (location.pathname === "/") return null;

  return (
    <nav aria-label="breadcrumb" className="breadcrumb-wrapper container mt-4">
      <ol className="breadcrumb mb-0">
        {/* 5️.第一層永遠是「首頁」 */}
        <li className="breadcrumb-item">
          <Link to="/">首頁</Link>
        </li>

        {/* 6️.後續每一層根據 URL 動態產生 */}
        {pathnames.map((value, index) => {
          const last = index === pathnames.length - 1;
          const to = `/${pathnames.slice(0, index + 1).join("/")}`;

          let label = breadcrumbMap[value] || value;

          // 7️.特殊處理：product 後面的 ID 顯示為「產品詳情」
          if (index > 0 && pathnames[index - 1] === "product") {
            label = "產品詳情";
          }

          // 8️.最後一層不可點擊，其餘可點擊
          return last ? (
            <li className="breadcrumb-item active" aria-current="page" key={to}>
              {label}
            </li>
          ) : (
            <li className="breadcrumb-item" key={to}>
              <Link to={to}>{label}</Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
