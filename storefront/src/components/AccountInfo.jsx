import { Link } from 'react-router';
export default function AccountInfo() { return <section className="shop-page"><h1>以訪客方式體驗 ENSO</h1><p>這個展示版不提供會員註冊、登入或寄送驗證信。購物車由目前展示空間保存，不需輸入真實帳號或密碼。</p><Link to="/product">開始選香</Link><p><a href="/#/admin/order">進入同一展示空間的營運後台</a></p></section>; }
