// src/router.jsx

import { createHashRouter, Navigate } from 'react-router-dom';

import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './layout/AdminLayout';
import FrontendLayout from './layout/FrontendLayout';
import AdminHome from './views/admin/AdminHome';
import AdminInventory from './views/admin/AdminInventory';
import AdminOrders from './views/admin/AdminOrders';
import AdminProducts from './views/admin/AdminProducts';
import Cart from './views/front/Cart';
import Checkout from './views/front/Checkout';
import Home from './views/front/Home';
import NotFound from './views/front/NotFound';
import Products from './views/front/Products';
import SingleProduct from './views/front/SingleProduct';
import Login from './views/Login';
import AdminCoupon from './views/admin/AdminCoupon';
const router = createHashRouter([
  {
    path: '/',
    element: <FrontendLayout />,
    children: [
      {
        index: true, // 預設首頁
        element: <Navigate to="/login" replace />,
      },
      {
        path: 'products',
        element: <Products />,
      },
      {
        path: 'product/:id', // 動態參數
        element: <SingleProduct />,
      },
      {
        path: 'cart',
        element: <Cart />,
      },
      {
        path: 'checkout',
        element: <Checkout />,
      },
      {
        path: 'login',
        element: <Login />,
      },
    ],
  },
  {
    path: 'admin',
    element: (
      <ProtectedRoute>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <AdminHome />,
      },
      {
        path: 'product',
        element: <AdminProducts />,
      },
      {
        path: 'order',
        element: <AdminOrders />,
      },
      {
        path: 'inventory',
        element: <AdminInventory />,
      },
      {
        path: 'coupon',
        element: <AdminCoupon />,
      },
    ],
  },
  {
    path: '*', // 404 頁面
    element: <NotFound />,
  },
]);
export default router;
