import { useState, useEffect } from 'react';

import Swal from 'sweetalert2';

import Dialog from '../../components/admin/Dialog';
import FullPageLoading from '../../components/FullPageLoading';
import useMessage from '../../hooks/useMessage';
import {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from '../../service/coupon';

//日期轉換輔助函式
const formatDate = (timestamp) => {
  if (!timestamp || Number.isNaN(Number(timestamp))) return '';
  return new Date(timestamp * 1000).toISOString().split('T')[0];
};

const toTimeStamp = (dateString) => {
  return Math.floor(new Date(dateString).getTime() / 1000);
};

const InitialCoupon = {
  title: '',
  is_enabled: 0,
  percent: 100,
  due_date: Math.floor(Date.now() / 1000),
  code: '',
};

export default function AdminCoupon() {
  const [coupons, setCoupons] = useState([]);
  const [tempCoupon, setTempCoupon] = useState(InitialCoupon);
  const [isNewCoupon, setIsNewCoupon] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [operationError, setOperationError] = useState('');
  const { showSuccess, showError } = useMessage();

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const data = await getCoupons();
      if (data.success === false) throw new Error('優惠券讀取失敗');
      setCoupons(data.coupons || []);
    } catch (error) {
      setLoadError('優惠券載入失敗，請重新載入。');
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = (status, coupon) => {
    setOperationError('');
    if (status === 'new') {
      setTempCoupon(InitialCoupon);
      setIsNewCoupon(true);
    } else {
      setTempCoupon(coupon);
      setIsNewCoupon(false);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleUpdateCoupon = async () => {
    setOperationError('');
    setIsLoading(true);
    try {
      if (isNewCoupon) {
        const result = await createCoupon({ data: tempCoupon });
        if (result.success === false) throw new Error('優惠券建立失敗，請稍後再試。');
        showSuccess('已建立優惠券');
      } else {
        const result = await updateCoupon(tempCoupon.id, { data: tempCoupon });
        if (result.success === false) throw new Error('優惠券更新失敗，請稍後再試。');
        showSuccess('資料已更新');
      }
      setIsModalOpen(false);
      fetchCoupons();
    } catch (error) {
      setOperationError(
        error.response?.data?.message ||
          error.message ||
          '儲存失敗，請稍後再試。'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCoupon = async (id) => {
    const result = await Swal.fire({
      title: '確定要刪除這張優惠券嗎？',
      text: '此操作將使相關促銷活動失效。',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ba3e2a',
      cancelButtonColor: '#09256f',
      confirmButtonText: '確定刪除',
      cancelButtonText: '取消',
      background: '#fffaf6',
      color: '#09256f',
    });

    if (!result.isConfirmed) return;

    setIsLoading(true);
    try {
      const result = await deleteCoupon(id);
      if (result.success === false) throw new Error('優惠券刪除失敗');
      showSuccess('優惠券已移除');
      fetchCoupons();
    } catch (error) {
      showError(error.response?.data?.message || '刪除失敗');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="enso-page">
      <header className="enso-page-header">
        <div>
          <h1 className="enso-page-title">優惠券管理</h1>
          <p className="enso-page-description">
            設定折扣代碼、期限與啟用狀態。
          </p>
        </div>
        <button
          className="enso-button-primary"
          onClick={() => openModal('new')}
        >
          新增優惠券
        </button>
      </header>
      {loadError ? (
        <div className="workspace-error" role="alert">
          {loadError}
          <button className="enso-button-secondary" onClick={fetchCoupons}>
            重新載入
          </button>
        </div>
      ) : (
        <div className="enso-table-shell workspace-data-table" tabIndex={0} role="region" aria-label="資料表格，可左右捲動查看操作欄">
          <p className="workspace-table-hint">左右滑動表格，可查看完整資料與操作。</p>
          <table>
            <thead>
              <tr>
                {[
                  '活動名稱',
                  '優惠代碼',
                  '折後比例',
                  '到期日',
                  '狀態',
                  '操作',
                ].map((label) => (
                  <th key={label} scope="col">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon.id}>
                  <td>
                    <strong>{coupon.title}</strong>
                  </td>
                  <td>{coupon.code}</td>
                  <td>{coupon.percent}％</td>
                  <td>{formatDate(coupon.due_date)}</td>
                  <td>
                    <span
                      className={
                        'enso-status enso-status--' +
                        (coupon.is_enabled &&
                        coupon.due_date > Date.now() / 1000
                          ? 'success'
                          : 'muted')
                      }
                    >
                      {coupon.due_date <= Date.now() / 1000
                        ? '已到期'
                        : coupon.is_enabled
                          ? '已啟用'
                          : '未啟用'}
                    </span>
                  </td>
                  <td>
                    <div className="product-actions">
                      <button
                        className="workspace-link"
                        onClick={() => openModal('edit', coupon)}
                      >
                        編輯
                      </button>
                      <button
                        className="workspace-link workspace-link--danger"
                        onClick={() => handleDeleteCoupon(coupon.id)}
                      >
                        刪除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!coupons.length && (
                <tr>
                  <td colSpan="6">尚無優惠券，點選「新增優惠券」開始設定。</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {isModalOpen && (
        <Dialog
          title={isNewCoupon ? '新增優惠券' : '編輯優惠券'}
          busy={isLoading}
          onClose={closeModal}
          footer={
            <>
              <button
                className="enso-button-secondary"
                onClick={closeModal}
                disabled={isLoading}
              >
                取消
              </button>
              <button
                className="enso-button-primary"
                type="submit"
                form="coupon-editor"
                disabled={isLoading}
              >
                {isLoading ? '儲存中…' : '儲存優惠券'}
              </button>
            </>
          }
        >
          {operationError && (
            <p className="workspace-error" role="alert">
              {operationError}
            </p>
          )}
          <form
            id="coupon-editor"
            onSubmit={(event) => {
              event.preventDefault();
              handleUpdateCoupon();
            }}
          >
            <fieldset disabled={isLoading}>
              <label className="workspace-field">
                <span>活動名稱（必填）</span>
                <input
                  required
                  value={tempCoupon.title}
                  onChange={(e) =>
                    setTempCoupon({ ...tempCoupon, title: e.target.value })
                  }
                />
              </label>
              <label className="workspace-field">
                <span>優惠代碼（必填）</span>
                <input
                  required
                  value={tempCoupon.code}
                  onChange={(e) =>
                    setTempCoupon({ ...tempCoupon, code: e.target.value })
                  }
                />
              </label>
              <div className="workspace-field-grid">
                <label className="workspace-field">
                  <span>到期日（必填）</span>
                  <input
                    required
                    type="date"
                    value={formatDate(tempCoupon.due_date)}
                    onChange={(e) =>
                      setTempCoupon({
                        ...tempCoupon,
                        due_date: toTimeStamp(e.target.value),
                      })
                    }
                  />
                </label>
                <label className="workspace-field">
                  <span>折後應付比例（％）</span>
                  <input
                    required
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={tempCoupon.percent}
                    onChange={(e) =>
                      setTempCoupon({
                        ...tempCoupon,
                        percent: Number(e.target.value),
                      })
                    }
                  />
                </label>
              </div>
              <p className="workspace-hint">
                例如填入 80 表示八折，顧客支付原價的 80％。
              </p>
              <label className="workspace-checkbox">
                <input
                  type="checkbox"
                  checked={!!tempCoupon.is_enabled}
                  onChange={(e) =>
                    setTempCoupon({
                      ...tempCoupon,
                      is_enabled: e.target.checked ? 1 : 0,
                    })
                  }
                />
                啟用優惠券
              </label>
            </fieldset>
          </form>
        </Dialog>
      )}
      <FullPageLoading isLoading={isLoading && !isModalOpen} />
    </div>
  );
}
