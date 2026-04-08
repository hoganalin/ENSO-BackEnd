import { useState, useEffect, useRef } from 'react';
import * as bootstrap from 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

import FullPageLoading from '../../components/FullPageLoading';
import Pagination from '../../components/Pagination';
import useMessage from '../../hooks/useMessage';
import {
  getAdminProducts,
  updateAdminProduct,
} from '../../service/adminProducts';

const LOW_STOCK_THRESHOLD = 10;
const LOG_KEY = 'enso_inventory_logs';

const getLogs = () => {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
  } catch {
    return [];
  }
};

const appendLog = (entry) => {
  const logs = getLogs();
  localStorage.setItem(LOG_KEY, JSON.stringify([entry, ...logs].slice(0, 200)));
};

const getStockBadge = (inventory) => {
  const inv = inventory ?? 0;
  if (inv === 0) return { color: 'danger', label: '缺貨' };
  if (inv < LOW_STOCK_THRESHOLD) return { color: 'warning', label: '低庫存' };
  return { color: 'success', label: '庫存充足' };
};

const REASON_PRESETS = [
  '進貨入庫',
  '盤點調整',
  '銷售出貨',
  '退貨入庫',
  '損耗報廢',
];

function AdminInventory() {
  const { showSuccess, showError } = useMessage();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // 調整 Modal 狀態
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustType, setAdjustType] = useState('add');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjustLoading, setAdjustLoading] = useState(false);

  const modalRef = useRef(null);
  const modalObj = useRef(null);

  const getProducts = async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await getAdminProducts(page);
      setProducts(res.data.products);
      setPagination(res.data.pagination || {});
    } catch (err) {
      showError(err.response?.data?.message || '取得商品失敗');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getProducts();
  }, []);

  useEffect(() => {
    if (!modalRef.current) return;
    modalObj.current = new bootstrap.Modal(modalRef.current);
    return () => {
      modalObj.current?.dispose();
      modalObj.current = null;
    };
  }, []);

  const openAdjustModal = (product) => {
    setSelectedProduct(product);
    setAdjustType('add');
    setAdjustQty('');
    setAdjustNote('');
    modalObj.current?.show();
  };

  const previewInventory = () => {
    const current = selectedProduct?.inventory ?? 0;
    const delta = parseInt(adjustQty) || 0;
    return Math.max(
      0,
      adjustType === 'add' ? current + delta : current - delta
    );
  };

  const handleAdjust = async () => {
    const qty = parseInt(adjustQty, 10);
    if (!qty || qty <= 0) {
      showError('請輸入有效的數量（正整數）');
      return;
    }

    const current = selectedProduct.inventory ?? 0;
    const newInventory =
      adjustType === 'add' ? current + qty : Math.max(0, current - qty);

    setAdjustLoading(true);
    try {
      await updateAdminProduct(selectedProduct.id, {
        ...selectedProduct,
        inventory: newInventory,
        origin_price: Number(selectedProduct.origin_price),
        price: Number(selectedProduct.price),
        is_enabled: selectedProduct.is_enabled ? 1 : 0,
      });

      appendLog({
        id: Date.now().toString(),
        product_id: selectedProduct.id,
        product_title: selectedProduct.title,
        type: adjustType,
        quantity: qty,
        before: current,
        after: newInventory,
        note: adjustNote,
        created_at: new Date().toISOString(),
      });

      showSuccess(
        `${selectedProduct.title} 庫存已${adjustType === 'add' ? '增加' : '減少'} ${qty}，現有 ${newInventory}`
      );
      modalObj.current?.hide();
      getProducts(pagination.current_page);
    } catch (err) {
      showError(err.response?.data?.message || '庫存更新失敗');
    } finally {
      setAdjustLoading(false);
    }
  };

  // 篩選
  const filteredProducts = products.filter((p) => {
    const inv = p.inventory ?? 0;
    const keyword = searchText.trim().toLowerCase();
    const matchSearch =
      !keyword ||
      p.title.toLowerCase().includes(keyword) ||
      p.category.toLowerCase().includes(keyword);
    const matchFilter =
      filterStatus === 'all' ||
      (filterStatus === 'low' && inv > 0 && inv < LOW_STOCK_THRESHOLD) ||
      (filterStatus === 'out' && inv === 0);
    return matchSearch && matchFilter;
  });

  // KPI 統計（以當頁計算）
  const lowCount = products.filter(
    (p) => (p.inventory ?? 0) > 0 && (p.inventory ?? 0) < LOW_STOCK_THRESHOLD
  ).length;
  const outCount = products.filter((p) => (p.inventory ?? 0) === 0).length;

  // 該商品的歷史紀錄
  const productLogs = getLogs()
    .filter((l) => l.product_id === selectedProduct?.id)
    .slice(0, 5);

  return (
    <div className="container">
      {/* 標題 */}
      <div className="px-3 mb-4 text-center text-md-start">
        <h2 className="fw-bolder text-dark mb-0">庫存管理中心</h2>
      </div>

      {/* KPI 卡片 */}
      <div className="row g-3 mb-4 px-3">
        <div className="col-4">
          <div className="card border-0 shadow-sm rounded-4 p-2 p-md-4">
            <div className="d-flex align-items-center gap-2">
              <div
                className="rounded-3 p-2 d-none d-md-block"
                style={{ background: 'rgba(13,110,253,0.1)' }}
              >
                <i className="bi bi-box-seam fs-4 text-primary"></i>
              </div>
              <div>
                <div className="text-muted" style={{ fontSize: '0.7rem' }}>本頁商品數</div>
                <div className="fs-5 fs-md-3 fw-bold text-dark">{products.length}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-4">
          <div className="card border-0 shadow-sm rounded-4 p-2 p-md-4">
            <div className="d-flex align-items-center gap-2">
              <div
                className="rounded-3 p-2 d-none d-md-block"
                style={{ background: 'rgba(255,193,7,0.12)' }}
              >
                <i className="bi bi-exclamation-triangle fs-4 text-warning"></i>
              </div>
              <div>
                <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                  低庫存（&lt;{LOW_STOCK_THRESHOLD}）
                </div>
                <div className="fs-5 fs-md-3 fw-bold text-warning">{lowCount}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-4">
          <div className="card border-0 shadow-sm rounded-4 p-2 p-md-4">
            <div className="d-flex align-items-center gap-2">
              <div
                className="rounded-3 p-2 d-none d-md-block"
                style={{ background: 'rgba(220,53,69,0.1)' }}
              >
                <i className="bi bi-x-circle fs-4 text-danger"></i>
              </div>
              <div>
                <div className="text-muted" style={{ fontSize: '0.7rem' }}>缺貨商品</div>
                <div className="fs-5 fs-md-3 fw-bold text-danger">{outCount}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 搜尋 + 篩選 */}
      <div className="d-flex flex-wrap gap-3 mb-4 px-3">
        <div
          className="position-relative flex-grow-1"
          style={{ maxWidth: '400px' }}
        >
          <input
            type="text"
            className="form-control rounded-pill ps-4 pe-5 shadow-sm"
            placeholder="搜尋商品名稱或分類..."
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
          className="form-select rounded-pill shadow-sm flex-shrink-0"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">全部庫存狀態</option>
          <option value="low">低庫存（&lt;{LOW_STOCK_THRESHOLD}）</option>
          <option value="out">缺貨（= 0）</option>
        </select>
      </div>

      {/* 庫存列表 */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden mx-3">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead style={{ backgroundColor: '#fcfcfd' }}>
              <tr className="text-secondary small fw-bold text-uppercase">
                <th className="px-4 py-3 border-0" style={{ width: '80px' }}>
                  圖片
                </th>
                <th className="border-0">商品名稱</th>
                <th className="border-0 d-none d-md-table-cell">分類</th>
                <th className="border-0 text-center d-none d-md-table-cell">上架狀態</th>
                <th className="border-0 text-center">現有庫存</th>
                <th className="border-0 text-center d-none d-md-table-cell">庫存狀態</th>
                <th className="border-0 text-center px-4">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center text-muted py-5">
                    <div className="py-4">
                      <i className="bi bi-archive fs-1 d-block mb-2 opacity-50"></i>
                      {searchText || filterStatus !== 'all'
                        ? '找不到符合條件的商品'
                        : '目前沒有商品'}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const inv = product.inventory ?? 0;
                  const badge = getStockBadge(product.inventory);
                  const rowBg =
                    inv === 0
                      ? 'rgba(220,53,69,0.03)'
                      : inv < LOW_STOCK_THRESHOLD
                        ? 'rgba(255,193,7,0.04)'
                        : 'transparent';
                  return (
                    <tr
                      key={product.id}
                      className="border-bottom border-light"
                      style={{ backgroundColor: rowBg }}
                    >
                      <td className="px-4">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.title}
                            className="rounded-3 shadow-sm border"
                            style={{
                              width: '52px',
                              height: '52px',
                              objectFit: 'cover',
                            }}
                          />
                        ) : (
                          <div
                            className="rounded-3 bg-light border d-flex align-items-center justify-content-center text-muted"
                            style={{ width: '52px', height: '52px' }}
                          >
                            <i className="bi bi-image"></i>
                          </div>
                        )}
                      </td>
                      <td style={{ maxWidth: '100px' }}>
                        <span className="fw-bold text-dark d-block text-truncate" style={{ fontSize: '0.82rem' }}>
                          {product.title}
                        </span>
                      </td>
                      <td className="d-none d-md-table-cell">
                        <span className="badge bg-light text-secondary border rounded-pill px-3">
                          {product.category}
                        </span>
                      </td>
                      <td className="text-center d-none d-md-table-cell">
                        {product.is_enabled ? (
                          <span className="badge bg-success-subtle text-success border border-success rounded-pill px-3">
                            已上架
                          </span>
                        ) : (
                          <span className="badge bg-secondary-subtle text-secondary border border-secondary rounded-pill px-3">
                            未上架
                          </span>
                        )}
                      </td>
                      <td className="text-center">
                        <span className={`fs-5 fw-bold text-${badge.color}`}>
                          {inv}
                        </span>
                      </td>
                      <td className="text-center d-none d-md-table-cell">
                        <span
                          className={`badge bg-${badge.color}-subtle text-${badge.color} border border-${badge.color} rounded-pill px-3`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="text-center px-2">
                        <button
                          className="btn btn-outline-primary btn-sm rounded-pill px-2 text-nowrap"
                          onClick={() => openAdjustModal(product)}
                        >
                          <i className="bi bi-pencil-square me-1 d-none d-md-inline"></i>調整庫存
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-5 px-3">
        <Pagination pagination={pagination} onChangePage={getProducts} />
      </div>

      {/* 調整庫存 Modal */}
      <div
        className="modal fade"
        ref={modalRef}
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow rounded-4 overflow-hidden">
            <div className="modal-header bg-dark text-white border-0 p-4">
              <div>
                <h5 className="modal-title fw-bold mb-0">調整庫存</h5>
                <small className="opacity-75">{selectedProduct?.title}</small>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white"
                data-bs-dismiss="modal"
              ></button>
            </div>

            <div className="modal-body p-4">
              {/* 目前庫存顯示 */}
              <div className="text-center mb-4 p-3 rounded-3 bg-light">
                <div className="text-muted small mb-1">目前庫存</div>
                <div
                  className={`display-5 fw-bold text-${getStockBadge(selectedProduct?.inventory).color}`}
                >
                  {selectedProduct?.inventory ?? 0}
                </div>
                <span
                  className={`badge bg-${getStockBadge(selectedProduct?.inventory).color}-subtle text-${getStockBadge(selectedProduct?.inventory).color} border border-${getStockBadge(selectedProduct?.inventory).color} rounded-pill px-3 mt-1`}
                >
                  {getStockBadge(selectedProduct?.inventory).label}
                </span>
              </div>

              {/* 增加 / 減少 切換 */}
              <div className="mb-3">
                <label className="form-label fw-bold small text-muted text-uppercase">
                  調整方向
                </label>
                <div className="d-flex gap-2">
                  <button
                    className={`btn flex-fill rounded-pill fw-bold ${
                      adjustType === 'add'
                        ? 'btn-success'
                        : 'btn-outline-success'
                    }`}
                    onClick={() => setAdjustType('add')}
                  >
                    <i className="bi bi-plus-lg"></i>增加
                  </button>
                  <button
                    className={`btn flex-fill rounded-pill fw-bold ${
                      adjustType === 'subtract'
                        ? 'btn-danger'
                        : 'btn-outline-danger'
                    }`}
                    onClick={() => setAdjustType('subtract')}
                  >
                    <i className="bi bi-dash-lg me-1"></i>減少
                  </button>
                </div>
              </div>

              {/* 數量輸入 */}
              <div className="mb-3">
                <label className="form-label fw-bold small text-muted text-uppercase">
                  調整數量
                  {adjustQty && parseInt(adjustQty) > 0 && (
                    <span className="ms-2 fw-normal text-lowercase text-dark">
                      → 調整後：
                      <strong
                        className={`text-${getStockBadge(previewInventory()).color}`}
                      >
                        {previewInventory()}
                      </strong>
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  className="form-control rounded-3"
                  min="1"
                  placeholder="請輸入數量"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                />
              </div>

              {/* 原因快速選項 */}
              <div className="mb-3">
                <label className="form-label fw-bold small text-muted text-uppercase">
                  調整原因
                </label>
                <div className="d-flex flex-wrap gap-2 mb-2">
                  {REASON_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      className={`btn btn-sm rounded-pill ${
                        adjustNote === preset
                          ? 'btn-primary'
                          : 'btn-outline-secondary'
                      }`}
                      onClick={() => setAdjustNote(preset)}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  className="form-control rounded-3"
                  placeholder="或自行輸入原因（選填）"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                />
              </div>

              {/* 該商品歷史調整紀錄 */}
              {productLogs.length > 0 && (
                <div className="mt-4">
                  <div className="text-muted small fw-bold text-uppercase mb-2">
                    近期調整紀錄
                  </div>
                  {productLogs.map((log) => (
                    <div
                      key={log.id}
                      className="d-flex justify-content-between align-items-center py-2 border-bottom border-light small"
                    >
                      <div className="d-flex align-items-center gap-2">
                        <span
                          className={`badge ${
                            log.type === 'add'
                              ? 'bg-success-subtle text-success'
                              : 'bg-danger-subtle text-danger'
                          }`}
                        >
                          {log.type === 'add' ? '+' : '-'}
                          {log.quantity}
                        </span>
                        <span className="text-muted">
                          {log.before} → {log.after}
                        </span>
                        {log.note && (
                          <span className="text-secondary">{log.note}</span>
                        )}
                      </div>
                      <span className="text-muted text-nowrap">
                        {new Date(log.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer border-0 bg-light">
              <button
                type="button"
                className="btn btn-outline-secondary rounded-pill px-4"
                data-bs-dismiss="modal"
              >
                取消
              </button>
              <button
                type="button"
                className={`btn rounded-pill px-4 fw-bold ${
                  adjustType === 'add' ? 'btn-success' : 'btn-danger'
                }`}
                onClick={handleAdjust}
                disabled={
                  adjustLoading || !adjustQty || parseInt(adjustQty) <= 0
                }
              >
                {adjustLoading
                  ? '處理中...'
                  : `確認${adjustType === 'add' ? '增加' : '減少'}`}
              </button>
            </div>
          </div>
        </div>
      </div>

      <FullPageLoading isLoading={isLoading} />
    </div>
  );
}

export default AdminInventory;
