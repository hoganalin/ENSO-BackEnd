// src/router.jsx

import { createHashRouter, Navigate } from 'react-router-dom';

import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './layout/AdminLayout';
import FrontendLayout from './layout/FrontendLayout';
import AdminAgent from './views/admin/AdminAgent';
import AdminCoupon from './views/admin/AdminCoupon';
import AdminDevices from './views/admin/AdminDevices';
import AdminHome from './views/admin/AdminHome';
import AdminInventory from './views/admin/AdminInventory';
import AdminOrders from './views/admin/AdminOrders';
import AdminPaymentLedger from './views/admin/AdminPaymentLedger';
import AdminProducts from './views/admin/AdminProducts';
import NotFound from './views/front/NotFound';
import Login from './views/Login';

const router = createHashRouter([
  {
    path: '/',
    element: <FrontendLayout />,
    children: [
      { index: true, element: <Navigate to="/login" replace /> },
      { path: 'login', element: <Login /> },
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
      {
        path: 'devices',
        element: <AdminDevices />,
      },
      {
        path: 'payment-ledger',
        element: <AdminPaymentLedger />,
      },
      {
        path: 'agent',
        element: <AdminAgent />,
      },
    ],
  },
  {
    path: '*', // 404 頁面
    element: <NotFound />,
  },
]);
export default router;
