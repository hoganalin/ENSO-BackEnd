import { useEffect, useState } from 'react';

import { useForm } from 'react-hook-form';
import Swal from 'sweetalert2';

import { currency } from '../../assets/utils/filter';
import Dialog from '../../components/admin/Dialog';
import ProductImage from '../../components/admin/ProductImage';
import FullPageLoading from '../../components/FullPageLoading';
import Pagination from '../../components/Pagination';
import useMessage from '../../hooks/useMessage';
import {
  getAdminOrders,
  updateAdminOrder,
  deleteAdminOrder,
  deleteAllAdminOrders,
} from '../../service/adminOrders';
import { getOrderPaymentMethod } from '../../utils/paymentMethods';

function AdminOrders() {
  const selfHosted = import.meta.env.VITE_SHOWCASE === 'true' || (import.meta.env.VITE_API_MODE === 'self-hosted' &&
    !document.cookie.split('; ').includes('myToken=enso-demo-token'));
  const { showError, showSuccess } = useMessage();
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({});
  const [tempOrder, setTempOrder] = useState(null);
  const [loading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [operationError, setOperationError] = useState('');

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

  // 取得訂單列表
  const getOrders = async (page = 1) => {
    setIsLoading(true);
    setLoadError('');
    try {
      const response = await getAdminOrders(page);
      if (!response.data.success) throw new Error('訂單讀取失敗');
      if (response.data.success) {
        const ordersData = response.data.orders;
        const normalizedOrders = Array.isArray(ordersData)
          ? ordersData
          : Object.values(ordersData || {});
        setOrders(normalizedOrders);
        setPagination(response.data.pagination || {});
      }
    } catch (err) {
      setLoadError('訂單資料載入失敗，請重新載入。');
    } finally {
      setIsLoading(false);
    }
  };

  // 修改付款狀態
  const updatePaymentStatus = async (order, data) => {
    setOperationError('');
    setIsLoading(true);
    try {
      const payload = data ?? { is_paid: !order?.is_paid };
      const resp = await updateAdminOrder(order, payload);
      if (!resp.data.success) throw new Error('操作未成功');
      if (resp.data.success) {
        showSuccess('付款狀態已記錄，此操作不會收款或退款。');
        getOrders(pagination.current_page);
        setIsModalOpen(false);
      }
    } catch (err) {
      setOperationError(
        err.response?.data?.message || '付款處理失敗，請稍後再試'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 刪除單筆訂單
  const deleteOrder = async (orderId) => {
    const result = await Swal.fire({
      title: selfHosted ? '確定取消此筆未付款訂單？' : '確定要刪除此筆訂單嗎？',
      text: selfHosted ? '庫存將回補，原始訂單會保留在資料庫中。' : '刪除後資料將無法還原！',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ba3e2a',
      cancelButtonColor: '#09256f',
      confirmButtonText: selfHosted ? '取消訂單並回補庫存' : '確認刪除',
      cancelButtonText: '取消',
      background: '#fffaf6',
      color: '#09256f',
    });

    if (!result.isConfirmed) return;

    setIsLoading(true);
    try {
      const resp = await deleteAdminOrder(orderId);
      if (!resp.data.success) throw new Error('操作未成功');
      if (resp.data.success) {
        showSuccess(selfHosted ? '訂單已取消，庫存已回補。' : '訂單已刪除');
        const targetPage =
          orders.length <= 1 && pagination.current_page > 1
            ? pagination.current_page - 1
            : pagination.current_page;
        getOrders(targetPage);
        setIsModalOpen(false);
      }
    } catch (err) {
      showError(err.response?.data?.message || '刪除失敗');
    } finally {
      setIsLoading(false);
    }
  };

  // 修改訂單
  const modifyOrder = async (data) => {
    setOperationError('');
    setIsLoading(true);
    try {
      const finalTotal = Object.values(data.products || {}).reduce(
        (acc, curr) => acc + Number(curr.qty || 0) * (curr.product?.price || 0),
        0
      );
      const updatedData = { ...data, total: finalTotal };
      const resp = await updateAdminOrder(data, updatedData);
      if (!resp.data.success) throw new Error('操作未成功');
      if (resp.data.success) {
        showSuccess('訂單已修改');
        getOrders(pagination.current_page);
        setIsModalOpen(false);
      }
    } catch (err) {
      setOperationError(err.response?.data?.message || '修改失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  const watchAllFields = watch();
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
      confirmButtonColor: '#ba3e2a',
      cancelButtonColor: '#09256f',
      confirmButtonText: '是的，全部清空！',
      background: '#fffaf6',
      color: '#09256f',
    });

    if (!result.isConfirmed) return;

    setIsLoading(true);
    try {
      const resp = await deleteAllAdminOrders();
      if (!resp.data.success) throw new Error('操作未成功');
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
  }, []);

  const openOrderModal = (order) => {
    setOperationError('');
    setTempOrder(order);
    reset(order);
    setIsModalOpen(true);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const filteredOrders = orders.filter((order) => {
    const keyword = searchText.trim().toLowerCase();
    const matchSearch =
      !keyword ||
      String(order.id || '')
        .toLowerCase()
        .includes(keyword) ||
      String(order.user?.name || '')
        .toLowerCase()
        .includes(keyword);
    const matchPaid =
      filterPaid === 'all' ||
      (filterPaid === 'paid' && order.is_paid) ||
      (filterPaid === 'unpaid' && !order.is_paid);
    return matchSearch && matchPaid;
  });

  return (
    <div className="enso-page">
      <header className="enso-page-header">
        <div>
          <h1 className="enso-page-title">訂單管理</h1>
          <p className="enso-page-description">
            核對收件資料、商品數量與付款狀態。
          </p>
        </div>
        {!selfHosted && <button className="enso-button-secondary" onClick={deleteOrderAll}>
          刪除全部訂單
        </button>}
      </header>
      <div className="product-toolbar">
        <label className="workspace-field">
          <span>搜尋本頁訂單</span>
          <input
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="訂單編號或收件人"
          />
        </label>
        <div className="workspace-segmented">
          {[
            ['all', '全部'],
            ['paid', '已付款'],
            ['unpaid', '未付款'],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={filterPaid === value}
              onClick={() => setFilterPaid(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {loadError ? (
        <div role="alert" className="workspace-error">
          {loadError}
          <button className="enso-button-secondary" onClick={() => getOrders()}>
            重新載入
          </button>
        </div>
      ) : (
        <div className="enso-table-shell workspace-data-table" tabIndex={0} role="region" aria-label="資料表格，可左右捲動查看操作欄">
          <p className="workspace-table-hint">左右滑動表格，可查看完整資料與操作。</p>
          <table>
            <thead>
              <tr>
                {['訂單編號與時間', '收件人', '金額', '付款狀態', '操作'].map(
                  (label) => (
                    <th key={label} scope="col">
                      {label}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <strong>{order.id}</strong>
                    <small className="block text-ink-muted">
                      {formatDate(order.create_at)}
                    </small>
                  </td>
                  <td>{order.user?.name || '未填姓名'}</td>
                  <td>NT$ {currency(order.total)}</td>
                  <td>
                    <span
                      className={
                        'enso-status enso-status--' +
                        (order.is_paid ? 'success' : 'warning')
                      }
                    >
                      {order.is_paid ? '已付款' : '未付款'}
                    </span>
                  </td>
                  <td>
                    <div className="product-actions">
                      <button
                        className="workspace-link"
                        onClick={() => openOrderModal(order)}
                      >
                        查看與編輯
                      </button>
                      <button
                        className="workspace-link workspace-link--danger"
                        onClick={() => deleteOrder(order.id)}
                        disabled={selfHosted && order.is_paid}
                      >
                        {selfHosted ? '取消訂單' : '刪除'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredOrders.length && (
                <tr>
                  <td colSpan="5">
                    沒有符合條件的訂單，請調整搜尋或付款狀態。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <div className="workspace-pagination">
        <Pagination pagination={pagination} onChangePage={getOrders} />
      </div>
      {isModalOpen && (
        <Dialog
          title="訂單詳情與編輯"
          busy={loading}
          onClose={() => setIsModalOpen(false)}
          footer={
            <>
              <button
                className="enso-button-secondary"
                onClick={() => setIsModalOpen(false)}
                disabled={loading}
              >
                取消
              </button>
              <button
                className="enso-button-primary"
                type="submit"
                form="order-editor"
                disabled={loading}
              >
                {loading ? '儲存中…' : '儲存訂單'}
              </button>
            </>
          }
        >
          {operationError && (
            <p className="workspace-error" role="alert">
              {operationError}
            </p>
          )}
          <p className="workspace-hint">
            訂單 {tempOrder.id}・{formatDate(tempOrder.create_at)}
          </p>
          <form id="order-editor" onSubmit={handleSubmit(modifyOrder)}>
            <fieldset disabled={loading}>
              <div className="workspace-field-grid">
                {[
                  ['name', '收件人姓名', 'text'],
                  ['tel', '聯絡電話', 'tel'],
                  ['address', '收件地址', 'text'],
                  ['email', '電子郵件', 'email'],
                ].map(([name, label, type]) => (
                  <label className="workspace-field" key={name}>
                    <span>{label}（必填）</span>
                    <input
                      type={type}
                      {...register('user.' + name, {
                        required: '請填寫' + label,
                      })}
                      aria-invalid={!!errors.user?.[name]}
                    />
                    {errors.user?.[name] && (
                      <span className="text-danger">
                        {errors.user[name].message}
                      </span>
                    )}
                  </label>
                ))}
              </div>
              <p className="workspace-hint">
                客戶留言：{watch('message') || '無'}
              </p>
              <h3 className="text-base font-bold mb-4">商品明細</h3>
              <div className="order-items">
                {Object.entries(tempOrder.products || {}).map(([id, item]) => (
                  <div className="order-item" key={id}>
                    <div className="product-thumbnail">
                      <ProductImage
                        variant="thumb"
                        src={item.product?.imageUrl}
                        alt={(item.product?.title || '商品') + '主圖'}
                      />
                    </div>
                    <div>
                      <strong>{item.product?.title || '未命名商品'}</strong>
                      <p className="workspace-hint">
                        單價 NT$ {currency(item.product?.price)}
                      </p>
                    </div>
                    <label className="workspace-field">
                      <span>數量</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        {...register('products.' + id + '.qty', {
                          valueAsNumber: true,
                          required: true,
                          min: 1,
                          validate: (value) =>
                            Number.isInteger(value) || '數量須為正整數',
                        })}
                      />
                      {errors.products?.[id]?.qty && (
                        <span className="text-danger">請填寫正整數</span>
                      )}
                    </label>
                  </div>
                ))}
              </div>
              <p className="text-lg font-bold mt-4">
                商品合計：NT$ {currency(totalPrice)}
                {selfHosted && <span className="block workspace-hint">實付總額由伺服器依原訂單折扣計算。已付款訂單不可修改數量。</span>}
              </p>
              <p className="workspace-hint">
                儲存會依商品單價與數量重新計算訂單金額，請先確認折扣與原訂單差異。
              </p>
            </fieldset>
          </form>
          <section className="order-payment">
            <h3 className="text-base font-bold">付款資訊</h3>
            <p className="workspace-hint">
              {getOrderPaymentMethod(tempOrder)?.label || '尚未提供付款方式'}・
              {tempOrder.is_paid ? '已付款' : '未付款'}
            </p>
            {tempOrder.user?.merchant_trade_no && (
              <p className="workspace-hint">
                商店交易編號：{tempOrder.user.merchant_trade_no}
              </p>
            )}
            {tempOrder.user?.check_mac_value && (
              <details>
                <summary>檢視交易驗證碼</summary>
                <p className="workspace-hint break-all">
                  {tempOrder.user.check_mac_value}
                </p>
              </details>
            )}
            <p className="workspace-hint">
              這個按鈕只修改訂單標記，不會執行收款或退款。
            </p>
            <button
              className="enso-button-secondary"
              disabled={loading || (selfHosted && tempOrder.is_paid)}
              onClick={() => updatePaymentStatus(tempOrder)}
            >
              {selfHosted && tempOrder.is_paid ? '已記錄付款' : tempOrder.is_paid ? '標記為未付款' : '標記為已付款'}
            </button>
          </section>
        </Dialog>
      )}
      <FullPageLoading isLoading={loading && !isModalOpen} />
    </div>
  );
}
export default AdminOrders;
