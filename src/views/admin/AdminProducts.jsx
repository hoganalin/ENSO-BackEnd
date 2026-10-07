import { useEffect, useState } from 'react';

import { currency } from '../../assets/utils/filter';
import ProductImage from '../../components/admin/ProductImage';
import Pagination from '../../components/Pagination';
import ProductModal from '../../components/ProductModal';
import { getAdminProducts } from '../../service/adminProducts';

const EMPTY_PRODUCT = {
  title: '',
  category: '',
  origin_price: '',
  price: '',
  unit: '',
  description: '',
  content: '',
  scenes: ['', '', ''],
  top_smell: '',
  heart_smell: '',
  base_smell: '',
  is_enabled: false,
  imageUrl: '',
  imagesUrl: [],
  feature: '',
  inventory: 0,
};

export default function AdminProducts() {
  const isDemo = document.cookie.split('; ').includes('myToken=enso-demo-token');
  const [products, setProducts] = useState([]);
  const [editor, setEditor] = useState(null);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  async function getData(page = 1) {
    setLoading(true);
    setError('');
    try {
      const response = await getAdminProducts(page);
      if (response.data?.success === false) throw new Error('取得商品失敗');
      const raw = response.data.products || [];
      setProducts(Array.isArray(raw) ? raw : Object.values(raw));
      setPagination(response.data.pagination || {});
    } catch {
      setError('無法取得商品資料，請檢查連線後重試。');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    getData();
  }, []);
  const keyword = search.trim().toLowerCase();
  const filtered = products.filter(
    (product) =>
      (!keyword ||
        (String(product.title || '') + ' ' + (product.category || ''))
          .toLowerCase()
          .includes(keyword)) &&
      (status === 'all' ||
        (status === 'enabled' ? !!product.is_enabled : !product.is_enabled))
  );
  const open = (type, product = EMPTY_PRODUCT) => setEditor({ type, product });
  const actions = (product) => (
    <div className="product-actions">
      <button
        className="workspace-link"
        onClick={() => open('edit', product)}
        aria-label={'編輯' + product.title}
      >
        編輯
      </button>
      <button
        className="workspace-link workspace-link--danger"
        onClick={() => open('delete', product)}
        aria-label={'刪除' + product.title}
      >
        刪除
      </button>
    </div>
  );
  const badge = (product) => (
    <span
      className={
        'enso-status enso-status--' + (product.is_enabled ? 'success' : 'muted')
      }
    >
      {product.is_enabled ? '已上架' : '未上架'}
    </span>
  );
  return (
    <div className="enso-page">
      <header className="enso-page-header">
        <div>
          <h1 className="enso-page-title">商品管理</h1>
          <p className="enso-page-description">
            整理香氣系列、商品圖片與上架狀態。金額以新台幣（NT$）計價。
            {isDemo && ' 展示商品圖片為概念設計，非實體商品攝影。'}
          </p>
        </div>
        <button className="enso-button-primary" onClick={() => open('create')}>
          新增商品
        </button>
      </header>
      <div className="product-toolbar">
        <label className="workspace-field">
          <span>搜尋本頁商品</span>
          <input
            type="search"
            placeholder="輸入商品名稱或分類"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <div className="workspace-segmented" aria-label="上架狀態篩選">
          {[
            ['all', '全部'],
            ['enabled', '已上架'],
            ['disabled', '未上架'],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={status === value}
              onClick={() => setStatus(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="workspace-hint product-count">
        本頁符合條件的商品共 {filtered.length} 項
      </p>
      {error ? (
        <div className="workspace-error" role="alert">
          {error}
          <button
            className="enso-button-secondary"
            onClick={() => getData(pagination.current_page)}
          >
            重新載入
          </button>
        </div>
      ) : loading ? (
        <div className="workspace-loading" role="status">
          正在載入商品…
        </div>
      ) : !filtered.length ? (
        <div className="workspace-empty">
          <h2>沒有符合條件的商品</h2>
          <p>試試其他關鍵字，或新增第一項商品。</p>
          <button
            className="enso-button-secondary"
            onClick={() => {
              setSearch('');
              setStatus('all');
            }}
          >
            清除篩選
          </button>
        </div>
      ) : (
        <>
          <div className="enso-table-shell product-table">
            <table>
              <thead>
                <tr>
                  {['商品', '分類', '售價', '庫存', '上架狀態', '操作'].map(
                    (label) => (
                      <th key={label} scope="col">
                        {label}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
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
                        <div>
                          <strong>{product.title}</strong>
                          <small>
                            圖庫{' '}
                            {(product.imagesUrl || []).filter(Boolean).length}{' '}
                            張
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>{product.category || '未分類'}</td>
                    <td className="tabular-nums">
                      NT$ {currency(product.price)}
                    </td>
                    <td>
                      <span
                        className={
                          'enso-status enso-status--' +
                          (Number(product.inventory) < 10 ? 'warning' : 'muted')
                        }
                      >
                        {product.inventory ?? '未設定'}
                        {Number(product.inventory) < 10 ? '・低庫存' : ''}
                      </span>
                    </td>
                    <td>{badge(product)}</td>
                    <td>{actions(product)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="product-mobile-list">
            {filtered.map((product) => (
              <article className="product-mobile-card" key={product.id}>
                <div className="product-identity">
                  <div className="product-thumbnail">
                    <ProductImage
                      variant="thumb"
                      src={product.imageUrl}
                      alt={product.title + '商品主圖'}
                    />
                  </div>
                  <div>
                    <h2>{product.title}</h2>
                    <p>{product.category || '未分類'}</p>
                    {badge(product)}
                  </div>
                </div>
                <div className="product-mobile-card__bottom">
                  <span>
                    NT$ {currency(product.price)}
                    <small>庫存 {product.inventory ?? '未設定'}</small>
                  </span>
                  {actions(product)}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
      {!error && !loading && (
        <div className="workspace-pagination">
          <Pagination pagination={pagination} onChangePage={getData} />
        </div>
      )}
      {editor && (
        <ProductModal
          modalType={editor.type}
          templateProduct={editor.product}
          closeModal={() => setEditor(null)}
          getData={() => getData(pagination.current_page || 1)}
        />
      )}
    </div>
  );
}
