import { useEffect, useState } from 'react';

import { currency } from '../../assets/utils/filter';
import FullPageLoading from '../../components/FullPageLoading';
import Pagination from '../../components/Pagination';
import ProductModal from '../../components/ProductModal';
import useMessage from '../../hooks/useMessage';
import { getAdminProducts } from '../../service/adminProducts';

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
  const [modalType, setModalType] = useState(null); // 'create', 'edit', 'delete' or null
  const [templateProduct, setTemplateProduct] = useState(INITIAL_TEMPLATE_DATA);
  const [pagination, setPagination] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterEnabled, setFilterEnabled] = useState('all');

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

  const openModal = (type, product) => {
    setTemplateProduct({ ...INITIAL_TEMPLATE_DATA, ...product });
    setModalType(type);
  };

  const closeModal = () => {
    setModalType(null);
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
    <div className="min-h-screen bg-[#FAF9F6] px-3 py-3 md:px-6 md:py-12 font-sans text-[#111111]">
      {/* Editorial Header Section */}
      <div className="max-w-7xl mx-auto mb-6 md:mb-20">
        <div className="flex flex-row md:items-end justify-between gap-3 md:gap-8 border-b border-[#D1C7B7] pb-3 md:pb-10 relative">
          <div className="absolute -bottom-[1px] left-0 w-24 h-[1px] bg-[#984443]"></div>
          <div className="min-w-0">
            <div className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.3em] md:tracking-[0.6em] text-[#984443] font-bold mb-1 md:mb-4 opacity-80">
              Inventory
            </div>
            <h2 className="font-serif text-lg md:text-5xl font-medium tracking-tight text-[#111111]">
              商物編錄中心
              <span className="hidden md:inline text-[0.5em] ml-4 opacity-20 font-sans tracking-widest uppercase">
                PRODUCT CATALOG
              </span>
            </h2>
          </div>
          <button
            type="button"
            className="group relative px-3 md:px-8 py-2 md:py-4 overflow-hidden transition-all duration-700 bg-[#111111] shadow-xl hover:shadow-[#984443]/20 shrink-0 self-end"
            onClick={() => openModal('create', INITIAL_TEMPLATE_DATA)}
          >
            <span className="relative text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.2em] md:tracking-[0.3em] font-bold text-white whitespace-nowrap">
              <span className="md:hidden">新增</span>
              <span className="hidden md:inline">新增編目 · CREATE</span>
            </span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Advanced Filter Bar (Editorial Style) */}
        <div className="flex flex-wrap items-center gap-4 md:gap-8 mb-8 md:mb-12">
          <div className="hidden md:flex items-center gap-4 text-[0.75rem] uppercase tracking-widest opacity-40 font-bold border-r border-[#D1C7B7] pr-8">
            <span>Filter By</span>
            <div className="w-8 h-[1px] bg-[#D1C7B7]"></div>
          </div>

          <div className="relative flex-grow w-full md:w-auto md:max-w-lg">
            <input
              type="text"
              className="w-full bg-transparent border-b border-[#D1C7B7] py-2 pl-0 pr-10 text-sm italic focus:outline-none focus:border-[#111111] transition-kyoto placeholder:opacity-30"
              placeholder="搜尋商品名稱或類別..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-3">
              {searchText && (
                <button
                  onClick={() => setSearchText('')}
                  className="text-[#984443] hover:scale-110 transition-kyoto"
                >
                  ✕
                </button>
              )}
              <span className="opacity-20">SEARCH</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {['all', 'enabled', 'disabled'].map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterEnabled(mode)}
                className={`px-4 py-1.5 text-[0.75rem] uppercase tracking-widest transition-kyoto rounded-full border ${
                  filterEnabled === mode
                    ? 'bg-[#111111] text-white border-[#111111]'
                    : 'text-[#111111]/40 border-transparent hover:border-[#D1C7B7]'
                }`}
              >
                {mode === 'all'
                  ? '全部'
                  : mode === 'enabled'
                    ? '已上架'
                    : '封存'}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile Card List */}
        <div className="md:hidden space-y-3">
          {filteredProducts.length === 0 ? (
            <div className="px-4 py-32 text-center">
              <div className="flex flex-col items-center gap-6">
                <div className="w-20 h-[1px] bg-[#D1C7B7]/40"></div>
                <p className="font-serif text-lg opacity-30 italic">
                  目前無符合條件之商物編項
                </p>
                <div className="w-20 h-[1px] bg-[#D1C7B7]/40"></div>
              </div>
            </div>
          ) : (
            filteredProducts.map((product) => (
              <div
                key={product.id}
                className="border border-[#D1C7B7]/40 bg-white p-3 flex gap-3"
              >
                <div className="w-14 h-14 bg-white border border-[#D1C7B7] p-1 flex items-center justify-center overflow-hidden shrink-0">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[0.75rem] opacity-20">NO IMG</span>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
                  <div>
                    <h4 className="font-serif text-base font-medium text-[#111111] break-words">
                      {product.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[0.75rem] uppercase tracking-widest opacity-40">
                        {product.category}
                      </span>
                      {product.is_enabled ? (
                        <span className="text-[0.75rem] uppercase tracking-wider font-bold text-[#3A4D39]">
                          Active
                        </span>
                      ) : (
                        <span className="text-[0.75rem] uppercase tracking-wider font-bold opacity-30">
                          Archived
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="font-serif font-bold text-[#111111] text-base">
                        ${currency(product.price)}
                      </span>
                      <span className="text-[0.75rem] line-through opacity-30 font-mono">
                        ${currency(product.origin_price)}
                      </span>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => openModal('edit', product)}
                        className="text-[0.75rem] uppercase tracking-wider font-bold text-[#111111] opacity-60 hover:opacity-100 whitespace-nowrap"
                      >
                        Modify
                      </button>
                      <button
                        onClick={() => openModal('delete', product)}
                        className="text-[0.75rem] uppercase tracking-wider font-bold text-[#984443] opacity-60 hover:opacity-100 whitespace-nowrap"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block bg-white rounded-sm shadow-sm border border-[#D1C7B7] overflow-hidden relative group/table">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#111111] opacity-0 group-hover/table:opacity-100 transition-opacity duration-700"></div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF9F6] border-b border-[#D1C7B7] text-[0.75rem] uppercase tracking-[0.3em] font-bold text-[#111111] opacity-60">
                  <th className="px-8 py-5"># Item</th>
                  <th className="px-8 py-5">Category</th>
                  <th className="px-8 py-5">Registry Title</th>
                  <th className="px-8 py-5 text-right hidden lg:table-cell">
                    Valuation
                  </th>
                  <th className="px-8 py-5 text-right">Offer Price</th>
                  <th className="px-8 py-5 text-center">Status</th>
                  <th className="px-8 py-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D1C7B7]/20">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-8 py-32 text-center">
                      <div className="flex flex-col items-center gap-6">
                        <div className="w-20 h-[1px] bg-[#D1C7B7]/40"></div>
                        <p className="font-serif text-lg opacity-30 italic">
                          目前無符合條件之商物編項
                        </p>
                        <div className="w-20 h-[1px] bg-[#D1C7B7]/40"></div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product, index) => (
                    <tr
                      key={product.id}
                      className="hover:bg-[#FAF9F6]/50 transition-kyoto group/row"
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-6">
                          <span className="text-[0.75rem] font-mono opacity-20">
                            {(index + 1).toString().padStart(2, '0')}
                          </span>
                          <div className="w-14 h-14 bg-white border border-[#D1C7B7] p-1 flex items-center justify-center rounded-sm overflow-hidden group-hover/row:border-[#111111] transition-kyoto shrink-0">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-[0.75rem] opacity-20">
                                NO IMG
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-[0.75rem] font-bold uppercase tracking-widest text-[#111111]/40 group-hover/row:text-[#984443] transition-kyoto">
                          {product.category}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <h4 className="font-serif text-lg font-medium text-[#111111] decoration-[#984443]/0 group-hover/row:decoration-[#984443]/30 underline underline-offset-8 transition-all duration-500 cursor-default">
                          {product.title}
                        </h4>
                      </td>
                      <td className="px-8 py-6 text-right hidden lg:table-cell">
                        <span className="text-[0.75rem] line-through decoration-[#984443] opacity-30 font-mono">
                          ${currency(product.origin_price)}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <span className="font-serif font-bold text-[#111111] text-lg">
                          ${currency(product.price)}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-center text-[0.75rem] uppercase tracking-[0.2em] font-bold">
                        {product.is_enabled ? (
                          <span className="text-[#3A4D39] bg-[#3A4D39]/5 px-3 py-1 rounded-sm border border-[#3A4D39]/20">
                            Active
                          </span>
                        ) : (
                          <span className="text-[#111111]/30 bg-[#111111]/5 px-3 py-1 rounded-sm border border-[#111111]/10">
                            Archived
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className="flex items-center justify-center gap-6">
                          <button
                            onClick={() => openModal('edit', product)}
                            className="text-[0.75rem] uppercase tracking-widest font-bold text-[#111111] opacity-40 hover:opacity-100 transition-kyoto border-b border-transparent hover:border-[#111111] pb-0.5"
                          >
                            Modify
                          </button>
                          <button
                            onClick={() => openModal('delete', product)}
                            className="text-[0.75rem] uppercase tracking-widest font-bold text-[#984443] opacity-40 hover:opacity-100 transition-kyoto border-b border-transparent hover:border-[#984443] pb-0.5"
                          >
                            Remove
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

        {/* Large Custom Pagination */}
        <div className="mt-20 flex justify-center border-t border-[#D1C7B7] pt-12">
          <Pagination pagination={pagination} onChangePage={getData} />
        </div>
      </div>

      {/* Modal Management */}
      {modalType && (
        <ProductModal
          modalType={modalType}
          templateProduct={templateProduct}
          getData={getData}
          closeModal={closeModal}
        />
      )}

      <FullPageLoading isLoading={isLoading} />
    </div>
  );
}

export default AdminProducts;
