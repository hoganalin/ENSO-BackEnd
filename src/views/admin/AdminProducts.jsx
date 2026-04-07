import { useRef, useEffect, useState } from 'react';
import * as bootstrap from 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

import Pagination from '../../components/Pagination';
import ProductModal from '../../components/ProductModal';
import FullPageLoading from '../../components/FullPageLoading';
import useMessage from '../../hooks/useMessage';
import { getAdminProducts } from '../../service/adminProducts';
import { currency } from '../../assets/utils/filter';

const INITIAL_TEMPLATE_DATA = {
  id: '',
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
  imagesUrl: [''],
  feature: '',
  inventory: 0,
};

function AdminProducts() {
  const { showError } = useMessage();

  const [products, setProducts] = useState([]);
  const [modalType, setModalType] = useState('');
  const [templateProduct, setTemplateProduct] = useState(INITIAL_TEMPLATE_DATA);
  const [pagination, setPagination] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterEnabled, setFilterEnabled] = useState('all');

  const productModalRef = useRef(null);
  const myModal = useRef(null);

  const getData = async (page = 1) => {
    setIsLoading(true);
    try {
      const response = await getAdminProducts(page);
      setProducts(response.data.products);
      setPagination(response.data.pagination);
    } catch (err) {
      showError(err.response?.data?.message || '取得產品資料失敗');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  useEffect(() => {
    if (!productModalRef.current) return;
    myModal.current = new bootstrap.Modal(productModalRef.current, {
      backdrop: true,
      keyboard: false,
    });
    return () => {
      myModal.current?.dispose();
      myModal.current = null;
    };
  }, []);

  const openModal = (type, product) => {
    setModalType(type);
    setTemplateProduct({ ...INITIAL_TEMPLATE_DATA, ...product });
    myModal.current?.show();
  };

  const closeModal = () => {
    myModal.current?.hide();
  };

  const filteredProducts = products.filter((p) => {
    const keyword = searchText.trim().toLowerCase();
    const matchSearch =
      !keyword ||
      p.title.toLowerCase().includes(keyword) ||
      p.category.toLowerCase().includes(keyword);
    const matchEnabled =
      filterEnabled === 'all' ||
      (filterEnabled === 'enabled' && p.is_enabled) ||
      (filterEnabled === 'disabled' && !p.is_enabled);
    return matchSearch && matchEnabled;
  });

  return (
    <div className="container" style={{ backgroundColor: '#f5f7fa' }}>
      {/* 標題列 */}
      <div className="d-flex justify-content-between align-items-center mb-4 px-3">
        <h2 className="fw-bolder text-dark my-3">商品管理中心</h2>
        <button
          type="button"
          className="btn btn-primary rounded-pill px-4"
          onClick={() => openModal('create', INITIAL_TEMPLATE_DATA)}
        >
          <i className="bi bi-plus-lg"></i>新增商品
        </button>
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
          className="form-select rounded-pill shadow-sm"
          style={{ width: '160px' }}
          value={filterEnabled}
          onChange={(e) => setFilterEnabled(e.target.value)}
        >
          <option value="all">全部狀態</option>
          <option value="enabled">已上架</option>
          <option value="disabled">未上架</option>
        </select>
      </div>

      {/* 商品列表卡片 */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden mx-3">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead style={{ backgroundColor: '#fcfcfd' }}>
              <tr className="text-secondary small fw-bold text-uppercase">
                <th className="px-4 py-3 border-0" style={{ width: '80px' }}>
                  圖片
                </th>
                <th className="border-0">分類</th>
                <th className="border-0">商品名稱</th>
                <th className="border-0 text-end">原價</th>
                <th className="border-0 text-end">售價</th>
                <th className="border-0 text-center">上架狀態</th>
                <th className="border-0 text-center px-4">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center text-muted py-5">
                    <div className="py-4">
                      <i className="bi bi-box-seam fs-1 d-block mb-2 opacity-50"></i>
                      {searchText || filterEnabled !== 'all'
                        ? '找不到符合條件的商品'
                        : '目前沒有商品'}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="border-bottom border-light">
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
                    <td>
                      <span className="badge bg-light text-secondary border rounded-pill px-3">
                        {product.category}
                      </span>
                    </td>
                    <td>
                      <span className="fw-bold text-dark">{product.title}</span>
                    </td>
                    <td className="text-end text-muted">
                      <small className="text-decoration-line-through">
                        ${currency(product.origin_price)}
                      </small>
                    </td>
                    <td className="text-end fw-bold text-dark">
                      ${currency(product.price)}
                    </td>
                    <td className="text-center">
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
                    <td className="text-center px-4">
                      <div className="btn-group shadow-sm rounded-pill overflow-hidden">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm px-3"
                          onClick={() => openModal('edit', product)}
                        >
                          編輯
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm px-3 border-0 border-start"
                          onClick={() => openModal('delete', product)}
                        >
                          <i className="bi bi-trash"></i> 刪除
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
        <Pagination pagination={pagination} onChangePage={getData} />
      </div>

      <ProductModal
        modalType={modalType}
        templateProduct={templateProduct}
        getData={getData}
        closeModal={closeModal}
        productModalRef={productModalRef}
      />

      <FullPageLoading isLoading={isLoading} />
    </div>
  );
}

export default AdminProducts;
