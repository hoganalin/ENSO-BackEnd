import { useRef, useEffect, useState } from 'react';

import { useForm } from 'react-hook-form';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import * as bootstrap from 'bootstrap';
import Swal from 'sweetalert2';

import { currency } from '../../assets/utils/filter';
import FullPageLoading from '../../components/FullPageLoading';
import Pagination from '../../components/Pagination';
import useMessage from '../../hooks/useMessage';
import {
  getAdminOrders,
  updateAdminOrder,
  deleteAdminOrder,
  deleteAllAdminOrders,
} from '../../service/adminOrders';

function AdminOrders() {
  const { showError, showSuccess } = useMessage();
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({});
  const [tempOrder, setTempOrder] = useState(null);
  const [loading, setIsLoading] = useState(false);
  // 搜尋與篩選
  const [searchText, setSearchText] = useState('');
  const [filterPaid, setFilterPaid] = useState('all'); // 'all' | 'paid' | 'unpaid'
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    mode: 'onChange',
  });
  const orderModalRef = useRef(null);
  const modalObj = useRef(null);

  // 取得訂單列表
  const getOrders = async (page = 1) => {
    setIsLoading(true);
    try {
      const response = await getAdminOrders(page);
      console.log('取得訂單', response);
      if (response.data.success) {
        const ordersData = response.data.orders;
        const normalizedOrders = Array.isArray(ordersData)
          ? ordersData
          : Object.values(ordersData || {});
        setOrders(normalizedOrders);
        setPagination(response.data.pagination || {});
      }
    } catch (err) {
      showError(err.response?.data?.message || '取得訂單資料失敗');
    } finally {
      setIsLoading(false);
    }
  };

  // 修改付款狀態
  const updatePaymentStatus = async (order, data) => {
    setIsLoading(true);
    try {
      const payload = data ?? { is_paid: !order?.is_paid };
      const resp = await updateAdminOrder(order, payload);
      if (resp.data.success) {
        showSuccess('已成功處理訂單付款！');
        getOrders(pagination.current_page);
        modalObj.current.hide();
      }
    } catch (err) {
      showError(err.response?.data?.message || '付款處理失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  // 刪除單筆訂單
  const deleteOrder = async (orderId) => {
    const result = await Swal.fire({
      title: '確定要刪除此筆訂單嗎？',
      text: '刪除後資料將無法還原！',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: '是的，刪除它！',
      cancelButtonText: '取消',
    });

    if (!result.isConfirmed) return;

    setIsLoading(true);
    try {
      const resp = await deleteAdminOrder(orderId);
      if (resp.data.success) {
        showSuccess('訂單已刪除');
        // 如果當前頁面只剩這一筆，且不是第一頁，因為這頁最後一筆已經被刪掉,已經沒有訂單資料了, 所以要跳回上一頁
        const targetPage =
          orders.length <= 1 && pagination.current_page > 1
            ? pagination.current_page - 1
            : pagination.current_page;
        getOrders(targetPage);
        modalObj.current.hide();
      }
    } catch (err) {
      showError(err.response?.data?.message || '刪除失敗');
    } finally {
      setIsLoading(false);
    }
  };
  // 修改訂單
  const modifyOrder = async (data) => {
    setIsLoading(true);
    try {
      // 在送出前「重算一次」確保金額絕對正確
      const finalTotal = Object.values(data.products || {}).reduce(
        (acc, curr) => acc + Number(curr.qty || 0) * (curr.product?.price || 0),
        0
      );

      const updatedData = {
        ...data,
        total: finalTotal,
      };

      const resp = await updateAdminOrder(data, updatedData);
      if (resp.data.success) {
        showSuccess('訂單已修改');
        getOrders(pagination.current_page);
        modalObj.current.hide();
      }
    } catch (err) {
      showError(err.response?.data?.message || '修改失敗');
    } finally {
      setIsLoading(false);
    }
  };

  // 直接監控表單內的 products 內容
  const watchAllFields = watch();
  // 即時計算畫面上顯示的金額
  const totalPrice = Object.values(watchAllFields.products || {}).reduce(
    (acc, curr) => acc + Number(curr.qty || 0) * (curr.product?.price || 0),
    0
  );

  const deleteOrderAll = async () => {
    const result = await Swal.fire({
      title: '確定要刪除全部訂單嗎？',
      text: '這項操作將會清除所有歷史紀錄，無法還原！',
      icon: 'error',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: '是的，全部清空！',
      cancelButtonText: '取消',
    });

    if (!result.isConfirmed) return;

    setIsLoading(true);
    try {
      const resp = await deleteAllAdminOrders();
      if (resp.data.success) {
        showSuccess('全部訂單已刪除');
        getOrders(1);
      }
    } catch (err) {
      showError(err.response?.data?.message || '刪除失敗');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getOrders();
    modalObj.current = new bootstrap.Modal(orderModalRef.current);
  }, []);

  const openOrderModal = (order) => {
    setTempOrder(order);
    reset(order); // 初始化表單資料, 如果沒有reset 的話, 如果沒有按儲存就關閉modal, 下次再打開modal, 裡面的資料會是上一次修改的資料
    modalObj.current.show();
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // 根據搜尋文字與付款狀態篩選訂單
  const filteredOrders = orders.filter((order) => {
    // 搜尋：比對訂單編號或客戶姓名
    const keyword = searchText.trim().toLowerCase();
    const matchSearch =
      // 搜尋框是空的 !keyword），那就全部都留下來，不用篩。
      !keyword ||
      order.id.toLowerCase().includes(keyword) ||
      order.user.name.toLowerCase().includes(keyword);
    // 篩選付款狀態
    const matchPaid =
      filterPaid === 'all' ||
      (filterPaid === 'paid' && order.is_paid) ||
      (filterPaid === 'unpaid' && !order.is_paid);

    return matchSearch && matchPaid;
  });

  return (
    <div className="container " style={{ backgroundColor: '#f5f7fa' }}>
      <div className="d-flex justify-content-between align-items-center mb-4 px-3">
        <div>
          <h2 className="fw-bolder text-dark my-3">訂單管理中心</h2>
        </div>
        <div className="text-end">
          <button
            className="btn btn-danger rounded-pill px-4 me-2"
            onClick={() => deleteOrderAll()}
          >
            <i className="bi bi-trash me-2"></i>刪除全部訂單
          </button>
        </div>
      </div>

      {/* 搜尋與篩選列 */}
      <div className="d-flex gap-3 mb-4 px-3">
        <div
          className="position-relative flex-grow-1"
          style={{ maxWidth: '400px' }}
        >
          <input
            type="text"
            className="form-control rounded-pill ps-4 pe-5 shadow-sm"
            placeholder="搜尋訂單編號或客戶姓名..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          {searchText && (
            <button
              className="btn btn-link position-absolute top-50 end-0 translate-middle-y text-muted pe-3"
              onClick={() => setSearchText('')}
              style={{ textDecoration: 'none' }}
            >
              ✕
            </button>
          )}
        </div>
        <select
          className="form-select rounded-pill shadow-sm"
          style={{ width: '160px' }}
          value={filterPaid}
          onChange={(e) => setFilterPaid(e.target.value)}
        >
          <option value="all">全部狀態</option>
          <option value="paid">已付款</option>
          <option value="unpaid">未付款</option>
        </select>
      </div>

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden mx-3">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead style={{ backgroundColor: '#fcfcfd' }}>
              <tr className="text-secondary small fw-bold text-uppercase">
                <th className="px-4 py-3 border-0">訂單時間</th>
                <th className="border-0">訂單編號</th>
                <th className="border-0">姓名 / Email</th>
                <th className="border-0">地址</th>
                <th className="border-0">付款狀態</th>
                <th className="text-end border-0">訂單金額</th>
                <th className="text-center border-0 px-4">詳細</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center text-muted py-5">
                    <div className="py-4">
                      <i className="bi bi-inbox fs-1 d-block mb-2 opacity-50"></i>
                      {searchText || filterPaid !== 'all'
                        ? '找不到符合條件的訂單'
                        : '目前沒有訂單'}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="border-bottom border-light">
                    <td className="px-4">
                      <span className="text-dark fw-medium small">
                        {formatDate(order.create_at).split(' ')[0]}
                      </span>
                      <br />
                      <small className="text-muted">
                        {formatDate(order.create_at).split(' ')[1]}
                      </small>
                    </td>
                    <td>
                      <span className="text-secondary small fw-medium">
                        {order.id}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex flex-column">
                        <span className="fw-bold text-dark">
                          {order.user.name}
                        </span>
                        <small className="text-muted">{order.user.email}</small>
                      </div>
                    </td>
                    <td
                      className="text-muted small"
                      style={{ maxWidth: '150px' }}
                    >
                      <div className="text-truncate">{order.user.address}</div>
                    </td>
                    <td>
                      {order.is_paid ? (
                        <span className="badge bg-success-subtle text-success border border-success rounded-pill px-3">
                          已付款
                        </span>
                      ) : (
                        <span className="badge bg-warning-subtle text-warning border border-warning rounded-pill px-3">
                          未付款
                        </span>
                      )}
                    </td>
                    <td className="text-end fw-bold text-dark h6">
                      ${currency(order.total)}
                    </td>
                    <td className="text-center px-4">
                      <div className="btn-group shadow-sm rounded-pill overflow-hidden">
                        <button
                          className="btn btn-primary btn-sm px-3"
                          onClick={() => openOrderModal(order)}
                        >
                          查看
                        </button>
                        <button
                          className="btn btn-outline-danger btn-sm px-3 border-0 border-start"
                          onClick={() => deleteOrder(order.id)}
                        >
                          <i className="bi bi-trash"></i>
                          刪除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-5 px-3">
        <Pagination pagination={pagination} onChangePage={getOrders} />
      </div>

      {/* Order Detail Modal */}
      <div
        className="modal fade"
        ref={orderModalRef}
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-xl modal-dialog-centered">
          <div className="modal-content border-0 shadow rounded-4 overflow-hidden">
            <div className="modal-header bg-dark p-4 border-0">
              <div className="text-white">
                <h5 className="modal-title fw-bold">
                  訂單編號
                  <small className="fw-normal opacity-75 ms-2">
                    #{tempOrder?.id}
                  </small>
                </h5>
                <small>
                  建立日期：{tempOrder && formatDate(tempOrder.create_at)}
                </small>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                data-bs-dismiss="modal"
              ></button>
            </div>
            <div className="modal-body p-0">
              <div className="row g-0">
                <div className="col-lg-4 bg-light p-4 p-md-5 border-end">
                  <div className="mb-4 ">
                    <div className="d-flex justify-content-between mb-3">
                      <label className="d-flex align-items-center">
                        客戶資訊
                      </label>

                      <button
                        className="btn btn-primary"
                        onClick={handleSubmit(modifyOrder)}
                      >
                        確認修改訂單內容
                      </button>
                    </div>
                    <div className="card border-0 shadow-sm p-4 rounded-3 mb-3 bg-white">
                      <div className="mb-3">
                        <small className="text-muted d-block small mb-1">
                          訂購人姓名
                        </small>
                        <input
                          type="text"
                          className={`form-control form-control-sm fw-bold ${errors.user?.name ? 'is-invalid' : ''}`}
                          {...register('user.name', {
                            required: '姓名為必填',
                            minLength: { value: 2, message: '姓名至少 2 個字' },
                          })}
                        />
                        {errors.user?.name && (
                          <div className="invalid-feedback">
                            {errors.user.name.message}
                          </div>
                        )}
                      </div>
                      <div className="mb-3">
                        <small className="text-muted d-block small mb-1">
                          聯絡電話
                        </small>
                        <input
                          type="tel"
                          className={`form-control form-control-sm fw-bold ${errors.user?.tel ? 'is-invalid' : ''}`}
                          {...register('user.tel', {
                            required: '電話為必填',
                            minLength: { value: 8, message: '電話至少 8 碼' },
                            pattern: {
                              value: /^\d+$/,
                              message: '電話僅能輸入數字',
                            },
                          })}
                        />
                        {errors.user?.tel && (
                          <div className="invalid-feedback">
                            {errors.user.tel.message}
                          </div>
                        )}
                      </div>
                      <div className="mb-3">
                        <small className="text-muted d-block small mb-1">
                          收件地址
                        </small>
                        <input
                          type="text"
                          className={`form-control form-control-sm fw-bold ${errors.user?.address ? 'is-invalid' : ''}`}
                          {...register('user.address', {
                            required: '地址為必填',
                          })}
                        />
                        {errors.user?.address && (
                          <div className="invalid-feedback">
                            {errors.user.address.message}
                          </div>
                        )}
                      </div>
                      <hr className="my-3 opacity-25" />
                      <div>
                        <small className="text-muted d-block small mb-1">
                          電子郵件
                        </small>
                        <input
                          type="email"
                          className={`form-control form-control-sm fw-bold ${errors.user?.email ? 'is-invalid' : ''}`}
                          {...register('user.email', {
                            required: 'Email 為必填',
                            pattern: {
                              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                              message: 'Email 格式錯誤',
                            },
                          })}
                        />
                        {errors.user?.email && (
                          <div className="invalid-feedback">
                            {errors.user.email.message}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-uppercase small fw-bold text-muted mb-3 d-block">
                      備註留言
                    </label>
                    <textarea
                      className="form-control form-control-sm"
                      rows="3"
                      {...register('message')}
                      placeholder="輸入備註留言..."
                    ></textarea>
                  </div>
                </div>
                <div className="col-lg-8 p-4 p-md-5 bg-white">
                  <label className="text-uppercase small fw-bold text-muted mb-3 d-block">
                    商品列表
                  </label>
                  <div className="table-responsive">
                    <table className="table table-borderless align-middle">
                      <tbody>
                        {tempOrder &&
                          Object.entries(tempOrder.products).map(
                            ([id, item]) => (
                              <tr
                                key={id}
                                className="border-bottom border-light"
                              >
                                <td className="py-3" style={{ width: '80px' }}>
                                  <img
                                    src={item.product.imageUrl}
                                    className="rounded-3 shadow-sm border"
                                    style={{
                                      width: '60px',
                                      height: '60px',
                                      objectFit: 'cover',
                                    }}
                                  />
                                </td>
                                <td className="py-3">
                                  <div className="fw-bold text-dark">
                                    {item.product.title}
                                  </div>
                                  <small className="text-muted">
                                    {item.product.category}
                                  </small>
                                </td>
                                <td className="py-3 text-center">
                                  <span className="badge bg-light text-dark px-3 py-2 border">
                                    x
                                    <input
                                      type="number"
                                      className="form-control form-control-sm d-inline-block"
                                      style={{ width: '60px' }}
                                      {...register(`products.${id}.qty`, {
                                        valueAsNumber: true,
                                        min: { value: 1, message: '最少為 1' },
                                      })}
                                    />
                                  </span>
                                </td>
                                <td className="py-3 text-end fw-bold">
                                  $
                                  {currency(
                                    (watch(`products.${id}.qty`) || 0) *
                                      item.product.price
                                  )}
                                  {/*item.qty 是「過去的資料」：是在打開彈窗那一秒，從伺服器抓下來的一張「靜態照片,使用watch監控,當數字變了, 畫面會即時更新 */}
                                </td>
                              </tr>
                            )
                          )}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-5 d-flex justify-content-between align-items-end">
                    <div>
                      <div className="text-muted small">訂單狀態</div>
                      <div
                        className={`h4 fw-bold ${tempOrder?.is_paid ? 'text-success' : 'text-danger'}`}
                      >
                        {tempOrder?.is_paid
                          ? 'SUCCESS PAID'
                          : 'PENDING PAYMENT'}
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="text-muted h6 fw-light mb-0">
                        Total Amount
                      </div>
                      <div className="display-6 fw-bolder text-primary">
                        ${currency(totalPrice)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer bg-light border-0">
              <button
                type="button"
                className="btn btn-outline-secondary rounded-pill px-4"
                data-bs-dismiss="modal"
              >
                關閉窗口
              </button>
              <button
                type="button"
                className={`btn rounded-pill px-4 shadow ${tempOrder?.is_paid ? 'btn-outline-danger' : 'btn-success'}`}
                onClick={() => updatePaymentStatus(tempOrder)}
              >
                {tempOrder?.is_paid ? '修改為未付款' : '確認已收款'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <FullPageLoading isLoading={loading} />
    </div>
  );
}

export default AdminOrders;
