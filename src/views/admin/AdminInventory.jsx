import { useState, useEffect } from 'react';

import Dialog from '../../components/admin/Dialog';
import ProductImage from '../../components/admin/ProductImage';
import FullPageLoading from '../../components/FullPageLoading';
import Pagination from '../../components/Pagination';
import useMessage from '../../hooks/useMessage';
import {
  getAdminProducts,
  getAdminInventoryLogs,
  updateAdminProduct,
} from '../../service/adminProducts';
import { appendInventoryLog, getInventoryLogs } from '../../service/inventoryLogs';

const LOW_STOCK_THRESHOLD = 10;

const getStockBadge = (inventory) => {
  const inv = inventory ?? 0;
  if (inv === 0)
    return { color: 'text-[#ba3e2a]', bg: 'bg-[#ba3e2a]/10', label: '缺貨' };
  if (inv < LOW_STOCK_THRESHOLD)
    return { color: 'text-[#805500]', bg: 'bg-[#805500]/10', label: '低庫存' };
  return { color: 'text-[#14624f]', bg: 'bg-[#14624f]/10', label: '庫存充足' };
};

const REASON_PRESETS = [
  '進貨入庫',
  '盤點調整',
  '退貨回補',
  '損壞報廢',
  '出貨扣減',
];

function AdminInventory() {
  const { showSuccess } = useMessage();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [logWarning, setLogWarning] = useState('');
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // 調整 Modal 狀態
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustType, setAdjustType] = useState('add');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustError, setAdjustError] = useState('');
  const selfHosted = import.meta.env.VITE_SHOWCASE === 'true' || (import.meta.env.VITE_API_MODE === 'self-hosted' &&
    !document.cookie.split('; ').includes('myToken=enso-demo-token'));
  const [serverLogs, setServerLogs] = useState([]);
  const [logsStatus, setLogsStatus] = useState('');

  useEffect(() => {
    if (!selfHosted || !showModal || !selectedProduct?.id) return;
    let active = true;
    setServerLogs([]);
    setLogsStatus('正在載入伺服器紀錄…');
    getAdminInventoryLogs(selectedProduct.id).then(({ data }) => {
      if (!active) return;
      setServerLogs(data.logs.map((log) => ({
        id: log.id, type: log.delta >= 0 ? 'add' : 'subtract', quantity: Math.abs(log.delta),
        before: log.before_stock, after: log.after_stock, note: log.reason, created_at: log.created_at,
      })));
      setLogsStatus('');
    }).catch(() => { if (active) setLogsStatus('紀錄載入失敗，請關閉視窗後重試。'); });
    return () => { active = false; };
  }, [selfHosted, showModal, selectedProduct?.id]);

  const getProducts = async (page = 1) => {
    setIsLoading(true);
    setLoadError('');
    try {
      const res = await getAdminProducts(page);
      if (res.data.success === false) throw new Error('庫存讀取失敗');
      setProducts(res.data.products || []);
      setPagination(res.data.pagination || {});
    } catch (err) {
      setLoadError('庫存資料載入失敗，請重新載入。');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getProducts();
  }, []);

  const openAdjustModal = (product) => {
    setAdjustError('');
    setSelectedProduct(product);
    setAdjustType('add');
    setAdjustQty('');
    setAdjustNote('');
    setShowModal(true);
  };

  const previewInventory = () => {
    const current = Number(selectedProduct?.inventory) || 0;
    const delta = parseInt(adjustQty) || 0;
    return Math.max(
      0,
      adjustType === 'add' ? current + delta : current - delta
    );
  };

  const handleAdjust = async () => {
    setAdjustError('');
    const qty = Number(adjustQty);
    if (!Number.isInteger(qty) || qty <= 0) {
      setAdjustError('請輸入有效的數量（正整數）');
      return;
    }

    const current = Number(selectedProduct.inventory) || 0;
    if (adjustType === 'subtract' && qty > current) {
      setAdjustError('扣減數量不可超過目前庫存');
      return;
    }
    const newInventory =
      adjustType === 'add' ? current + qty : Math.max(0, current - qty);

    setAdjustLoading(true);
    try {
      const response = await updateAdminProduct(selectedProduct.id, {
        ...selectedProduct,
        inventory: newInventory,
        inventory_note: adjustNote,
        origin_price: Number(selectedProduct.origin_price),
        price: Number(selectedProduct.price),
        is_enabled: selectedProduct.is_enabled ? 1 : 0,
      });

      if (response.data?.success === false) throw new Error('庫存更新未成功');
      const logSaved = selfHosted || appendInventoryLog({
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

      setLogWarning(logSaved ? '' : '庫存已更新，但本機調整紀錄未儲存。請勿重複調整庫存，請確認瀏覽器儲存空間與權限。');

      showSuccess(
        `${selectedProduct.title} 庫存已${adjustType === 'add' ? '增加' : '減少'} ${qty}，現有 ${newInventory}`
      );
      setShowModal(false);
      getProducts(pagination.current_page);
    } catch (err) {
      setAdjustError(
        err.response?.data?.message || '庫存更新失敗，請稍後再試。'
      );
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
      String(p.title || '')
        .toLowerCase()
        .includes(keyword) ||
      String(p.category || '')
        .toLowerCase()
        .includes(keyword);
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
  const productLogs = selfHosted ? serverLogs : getInventoryLogs()
    .filter((l) => l.product_id === selectedProduct?.id)
    .slice(0, 5);

  return (
    <div className="enso-page">
      <header className="enso-page-header">
        <div>
          <h1 className="enso-page-title">庫存管理</h1>
          <p className="enso-page-description">
            查看本頁庫存、安排補貨並保留數量調整紀錄。
          </p>
        </div>
      </header>
      {logWarning && <p className="workspace-error" role="alert">{logWarning}</p>}
      <dl className="workspace-summary">
        <div>
          <dt>本頁商品</dt>
          <dd>{products.length} 項</dd>
        </div>
        <div>
          <dt>低庫存（少於 {LOW_STOCK_THRESHOLD}）</dt>
          <dd>{lowCount} 項</dd>
        </div>
        <div>
          <dt>缺貨</dt>
          <dd>{outCount} 項</dd>
        </div>
      </dl>
      <div className="product-toolbar">
        <label className="workspace-field">
          <span>搜尋本頁商品</span>
          <input
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="商品名稱或分類"
          />
        </label>
        <div className="workspace-segmented">
          {[
            ['all', '全部'],
            ['low', '低庫存'],
            ['out', '缺貨'],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={filterStatus === value}
              onClick={() => setFilterStatus(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {loadError ? (
        <div role="alert" className="workspace-error">
          {loadError}
          <button
            className="enso-button-secondary"
            onClick={() => getProducts()}
          >
            重新載入
          </button>
        </div>
      ) : (
        <div className="enso-table-shell workspace-data-table" tabIndex={0} role="region" aria-label="資料表格，可左右捲動查看操作欄">
          <p className="workspace-table-hint">左右滑動表格，可查看完整資料與操作。</p>
          <table>
            <thead>
              <tr>
                {['商品', '目前庫存', '狀態', '操作'].map((label) => (
                  <th scope="col" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className="product-identity">
                      <div className="product-thumbnail">
                        <ProductImage
                          variant="thumb"
                          src={product.imageUrl}
                          alt={product.title + '商品主圖'}
                        />
                      </div>
                      <strong>{product.title}</strong>
                    </div>
                  </td>
                  <td>{product.inventory ?? 0}</td>
                  <td>
                    <span
                      className={
                        'enso-status ' + getStockBadge(product.inventory).color
                      }
                    >
                      {getStockBadge(product.inventory).label}
                    </span>
                  </td>
                  <td>
                    <button
                      className="workspace-link"
                      onClick={() => openAdjustModal(product)}
                    >
                      調整庫存
                    </button>
                  </td>
                </tr>
              ))}
              {!filteredProducts.length && (
                <tr>
                  <td colSpan="4">
                    沒有符合條件的商品，請調整搜尋或篩選條件。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <div className="workspace-pagination">
        <Pagination pagination={pagination} onChangePage={getProducts} />
      </div>
      {showModal && (
        <Dialog
          title={'調整庫存：' + selectedProduct.title}
          busy={adjustLoading}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button
                className="enso-button-secondary"
                disabled={adjustLoading}
                onClick={() => setShowModal(false)}
              >
                取消
              </button>
              <button
                className="enso-button-primary"
                form="stock-editor"
                type="submit"
                disabled={adjustLoading}
              >
                {adjustLoading ? '儲存中…' : '儲存庫存調整'}
              </button>
            </>
          }
        >
          {adjustError && (
            <p className="workspace-error" role="alert">
              {adjustError}
            </p>
          )}
          <form
            id="stock-editor"
            onSubmit={(e) => {
              e.preventDefault();
              handleAdjust();
            }}
          >
            <p className="workspace-hint">
              目前庫存 {selectedProduct.inventory ?? 0}，調整後預計為{' '}
              {previewInventory()}。
            </p>
            <fieldset disabled={adjustLoading}>
              <legend className="text-base font-bold mb-3">調整方式</legend>
              <div className="workspace-segmented mb-6">
                {[
                  ['add', '增加庫存'],
                  ['subtract', '扣減庫存'],
                ].map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={adjustType === value}
                    onClick={() => setAdjustType(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="workspace-field">
                <span>調整數量（正整數）</span>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                />
              </label>
              <label className="workspace-field">
                <span>調整原因</span>
                <input
                  value={adjustNote}
                  list="stock-reasons"
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder="選擇常用原因或自行輸入"
                />
                <datalist id="stock-reasons">
                  {REASON_PRESETS.map((reason) => (
                    <option value={reason} key={reason} />
                  ))}
                </datalist>
              </label>
            </fieldset>
          </form>
          <h3 className="text-base font-bold mt-6 mb-3">{selfHosted ? '最近五筆伺服器紀錄' : '最近五筆本機紀錄'}</h3>
          <p className="workspace-hint">
            {selfHosted ? '庫存變更與原因由伺服器儲存，包含商品調整及訂單異動。' : '此紀錄只保存在目前瀏覽器，不是伺服器稽核紀錄。'}
          </p>
          {selfHosted && logsStatus && <p role="status" className="workspace-hint">{logsStatus}</p>}
          {productLogs.length ? (
            <ul className="workspace-log-list">
              {productLogs.map((log) => (
                <li key={log.id}>
                  <span>
                    {log.type === 'add' ? '入庫' : '出庫'} {log.quantity}，
                    {log.before} → {log.after}
                  </span>
                  <span>
                    {log.note || '未填原因'}・
                    {new Date(log.created_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="workspace-hint">尚無調整紀錄。</p>
          )}
        </Dialog>
      )}
      <FullPageLoading isLoading={isLoading} />
    </div>
  );
}
export default AdminInventory;
