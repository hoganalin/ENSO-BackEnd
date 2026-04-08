import { useState, useEffect, useRef } from 'react';
import {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from '../../service/coupon';
import * as bootstrap from 'bootstrap';
import useMessage from '../../hooks/useMessage';
import FullPageLoading from '../../components/FullPageLoading';
import Swal from 'sweetalert2';
//日期轉換輔助函式
//將後端傳來的時間戳轉換成前端可讀的日期格式
const formatDate = (timestamp) => {
  return new Date(timestamp * 1000).toISOString().split('T')[0];
};
//將前端的日期格式轉換成後端可讀的時間戳
//當建立優惠券送出時，會把這串數字傳給後台存起來。
const toTimeStamp = (dateString) => {
  return Math.floor(new Date(dateString).getTime() / 1000);
};
//定義coupon初始資料結構
const InitialCoupon = {
  title: '',
  is_enabled: 0,
  percent: 100,
  due_date: Math.floor(Date.now() / 1000), //預設是當天
  code: '',
};
export default function AdminCoupon() {
  const [coupons, setCoupons] = useState([]);
  const [tempCoupon, setTempCoupon] = useState(InitialCoupon);
  const [isNewCoupon, setIsNewCoupon] = useState(false); //判斷新增還是編輯
  const [isLoading, setIsLoading] = useState(false);
  const { showSuccess, showError } = useMessage();

  //彈出視窗
  const modalRef = useRef(null);
  const couponModal = useRef(null);
  //初始化modal
  useEffect(() => {
    couponModal.current = new bootstrap.Modal(modalRef.current);
    fetchCoupons();
    //當這個組件『消失』(卸載 Unmount) 在畫面上時，執行這段內容。
    return () => {
      if (couponModal.current) {
        couponModal.current?.dispose();
        // 釋放記憶體
      }
    };
  }, []);
  const fetchCoupons = async () => {
    setIsLoading(true);
    try {
      const data = await getCoupons();
      setCoupons(data.coupons || []);
    } catch (error) {
      showError(error);
    } finally {
      setIsLoading(false);
    }
  };
  //打開moal的邏輯
  const openModal = (status, coupon) => {
    if (status === 'new') {
      setTempCoupon(InitialCoupon);
      setIsNewCoupon(true);
    } else {
      setTempCoupon(coupon);
      setIsNewCoupon(false);
    }
    couponModal.current.show();
  };

  const handleUpdateCoupon = async () => {
    setIsLoading(true);
    try {
      if (isNewCoupon) {
        await createCoupon({ data: tempCoupon });
        showSuccess('新增成功');
      } else {
        await updateCoupon(tempCoupon.id, { data: tempCoupon });
        showSuccess('更新成功');
      }
    } catch (error) {
      showError(error.response.data.message || error.message);
    } finally {
      setIsLoading(false);
      fetchCoupons();
      couponModal.current.hide();
    }
  };

  const handleDeleteCoupon = async (id) => {
    const result = await Swal.fire({
      title: '確定要刪除這張優惠券嗎？',
      text: '刪除後將無法還原！',
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
      await deleteCoupon(id);
      showSuccess('已刪除優惠券');
      fetchCoupons();
    } catch (error) {
      showError(error.response?.data?.message || '刪除失敗');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-4">
      {/* 頂部標題列 */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 px-3 gap-2">
        <h2 className="fw-bolder text-dark my-3">🏷️ 優惠券管理</h2>
        <button
          type="button"
          className="btn btn-primary rounded-pill px-4"
          onClick={() => openModal('new')}
        >
          <i className="bi bi-plus-lg"></i>建立新優惠券
        </button>
      </div>

      {/* 優惠券列表卡片 */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden mx-3">
        <div className="table-responsive">
          <table className="table table-sm table-hover align-middle mb-0">
            <thead style={{ backgroundColor: '#fcfcfd' }}>
              <tr className="text-secondary small fw-bold text-uppercase">
                <th className="px-2 px-md-4 py-3 border-0">名稱</th>
                <th className="border-0 d-none d-md-table-cell">優惠碼</th>
                <th className="border-0" style={{ whiteSpace: 'nowrap' }}>折扣 (%)</th>
                <th className="border-0 d-none d-md-table-cell">到期日</th>
                <th className="border-0 text-center">狀態</th>
                <th className="border-0 text-center px-1 px-md-4">操作</th>
              </tr>
            </thead>
            <tbody>
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-muted py-5">
                    <div className="py-4">
                      <i className="bi bi-ticket-perforated fs-1 d-block mb-2 opacity-50"></i>
                      目前沒有優惠券
                    </div>
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => (
                  <tr key={coupon.id} className="border-bottom border-light">
                    <td className="px-2 px-md-4" style={{ maxWidth: '100px' }}>
                      <span className="fw-bold text-dark d-block text-truncate" style={{ fontSize: '0.85rem' }}>
                        {coupon.title}
                      </span>
                    </td>
                    <td className="d-none d-md-table-cell">
                      <code className="bg-light px-2 py-1 rounded text-primary fw-bold">
                        {coupon.code}
                      </code>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{coupon.percent}%</td>
                    <td className="text-muted d-none d-md-table-cell">
                      {formatDate(coupon.due_date)}
                    </td>
                    <td className="text-center">
                      {coupon.is_enabled ? (
                        <span className="badge bg-success-subtle text-success border border-success rounded-pill px-2" style={{ fontSize: '0.7rem' }}>
                          已啟用
                        </span>
                      ) : (
                        <span className="badge bg-secondary-subtle text-secondary border border-secondary rounded-pill px-2" style={{ fontSize: '0.7rem' }}>
                          未啟用
                        </span>
                      )}
                    </td>
                    <td className="text-center px-1 px-md-4">
                      <div className="btn-group shadow-sm rounded-pill overflow-hidden">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm px-2"
                          style={{ fontSize: '0.75rem' }}
                          onClick={() => openModal('edit', coupon)}
                        >
                          編輯
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm px-2 border-0 border-start"
                          style={{ fontSize: '0.75rem' }}
                          onClick={() => handleDeleteCoupon(coupon.id)}
                        >
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

      {/* 優惠券 Modal */}
      <div
        className="modal fade"
        id="couponModal"
        tabIndex="-1"
        ref={modalRef}
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg">
            <div className="modal-header bg-dark text-white border-bottom-0 py-3">
              <h5 className="modal-title fw-bold">
                {isNewCoupon ? '✨ 建立新優惠券' : '📝 編輯優惠券'}
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body p-4">
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label small fw-bold text-secondary">
                    標題
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="請輸入標題"
                    value={tempCoupon.title}
                    onChange={(e) =>
                      setTempCoupon({ ...tempCoupon, title: e.target.value })
                    }
                  />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-bold text-secondary">
                    優惠碼
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="請輸入優惠碼"
                    value={tempCoupon.code}
                    onChange={(e) =>
                      setTempCoupon({ ...tempCoupon, code: e.target.value })
                    }
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-secondary">
                    到期日
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={formatDate(tempCoupon.due_date)}
                    onChange={(e) =>
                      setTempCoupon({
                        ...tempCoupon,
                        due_date: toTimeStamp(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-secondary">
                    折扣百分比 (%)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="例如 80 代表 8 折"
                    value={tempCoupon.percent}
                    onChange={(e) =>
                      setTempCoupon({
                        ...tempCoupon,
                        percent: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="col-12 mt-3">
                  <div className="form-check form-switch border rounded-3 p-3">
                    <input
                      className="form-check-input ms-0 me-2"
                      type="checkbox"
                      id="is_enabled"
                      checked={!!tempCoupon.is_enabled}
                      onChange={(e) =>
                        setTempCoupon({
                          ...tempCoupon,
                          is_enabled: e.target.checked ? 1 : 0,
                        })
                      }
                    />
                    <label
                      className="form-check-label fw-bold"
                      htmlFor="is_enabled"
                    >
                      是否啟用優惠券
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer border-top-0 p-3">
              <button
                type="button"
                className="btn btn-outline-secondary px-4 me-2"
                data-bs-dismiss="modal"
              >
                取消
              </button>
              <button
                type="button"
                className="btn btn-dark px-4"
                onClick={handleUpdateCoupon}
              >
                🚀 確認{isNewCoupon ? '建立' : '更新'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <FullPageLoading isLoading={isLoading} />
    </div>
  );
}
