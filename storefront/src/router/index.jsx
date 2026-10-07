import { createHashRouter } from "react-router";

import About from "../components/About.jsx";
import AccountInfo from "../components/AccountInfo.jsx";
import Cart from "../components/Cart.jsx";
import Checkout from "../components/Checkout.jsx";
import CheckoutSuccess from "../components/CheckoutSuccess.jsx";
import Contact from "../components/Contact.jsx";
import FAQ from "../components/FAQ.jsx";
import NotFound from "../components/NotFound.jsx";
import Products from "../components/Product.jsx";
import SingleProduct from "../components/SingleProduct.jsx";
import FrontendLayout from "../layout/FrontendLayout.jsx";
import Home from "../views/frontend/Home.jsx";
export const routes = createHashRouter([
  {
    path: "/",
    element: <FrontendLayout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "product",
        element: <Products />,
      },
      {
        path: "product/:id",
        element: <SingleProduct />,
      },
      {
        path: "cart",
        element: <Cart />,
      },
      {
        path: "checkout",
        element: <Checkout />,
      },
      {
        path: "checkout-success/:orderId?",
        element: <CheckoutSuccess />,
      },
      {
        path: "about",
        element: <About />,
      },
      {
        path: "login",
        element: <AccountInfo />,
      },
      {
        path: "register",
        element: <AccountInfo />,
      },
      {
        path: "faq",
        element: <FAQ />,
      },
      {
        path: "contact",
        element: <Contact />,
      },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

export default routes;
