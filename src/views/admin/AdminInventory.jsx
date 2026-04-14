import { useState, useEffect } from 'react';
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
  if (inv === 0) return { color: 'text-[#984443]', bg: 'bg-[#984443]/10', label: '缺貨' };
  if (inv < LOW_STOCK_THRESHOLD) return { color: 'text-[#735C00]', bg: 'bg-[#735C00]/10', label: '低庫存' };
  return { color: 'text-[#3A4D39]', bg: 'bg-[#3A4D39]/10', label: '庫存充足' };
};

const REASON_PRESETS = [
  '進貨入庫',
  '盤點調整',
function AdminInventory() {
  const { showSuccess, showError } = useMessage();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // 調整 Modal 狀態
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustType, setAdjustType] = useState('add');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjustLoading, setAdjustLoading] = useState(false);

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

  const openAdjustModal = (product) => {
    setSelectedProduct(product);
    setAdjustType('add');
    setAdjustQty('');
    setAdjustNote('');
    setShowModal(true);
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
      setShowModal(false);
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
    <div className="min-h-screen bg-[#FAF9F6] px-6 py-12 font-sans text-[#111111]">
      <FullPageLoading isLoading={isLoading} />

      {/* 標題區域 */}
      <div className="max-w-7xl mx-auto mb-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-[#D1C7B7] pb-10 relative">
          <div className="absolute -bottom-[1px] left-0 w-24 h-[1px] bg-[#984443]"></div>
          <div>
            <div className="text-[0.65rem] uppercase tracking-[0.6em] text-[#984443] font-bold mb-4 opacity-80">
              Administrative / Warehouse
            </div>
            <h2 className="font-serif text-5xl font-medium tracking-tight text-[#111111]">
              庫存文卷<span className="text-[0.5em] ml-4 opacity-20 font-sans tracking-widest uppercase">INVENTORY MANAGEMENT</span>
            </h2>
          </div>
          <div className="flex gap-12">
            <div className="text-right">
              <span className="block text-[0.6rem] uppercase tracking-widest font-bold opacity-30 mb-1">Catalog Size</span>
              <span className="text-2xl font-serif italic text-[#111111]">{products.length} <small className="text-xs opacity-40 font-sans not-italic">Items</small></span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* KPI 卡片 - Bespoke Design */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-24">
          <div className="relative group p-10 bg-white border border-[#D1C7B7]/30 transition-kyoto hover:border-[#111111]">
            <div className="absolute top-0 right-0 p-4 opacity-10">
               <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                 <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
               </svg>
            </div>
            <span className="block text-[0.6rem] uppercase tracking-[0.4em] font-bold text-[#111111]/40 mb-3">當前儲備總量</span>
            <div className="flex items-baseline gap-4">
              <span className="text-6xl font-serif text-[#111111]">{products.length}</span>
              <span className="text-[0.65rem] uppercase tracking-widest opacity-20 font-bold">Total SKUs</span>
            </div>
            <div className="mt-8 pt-6 border-t border-[#D1C7B7]/10 text-[0.6rem] opacity-40 italic">
               數據同步於本分頁檢索紀錄
            </div>
          </div>

          <div className="relative group p-10 bg-white border border-[#D1C7B7]/30 transition-kyoto hover:border-[#735C00]">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-[#735C00]">
               <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                 <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
               </svg>
            </div>
            <span className="block text-[0.6rem] uppercase tracking-[0.4em] font-bold text-[#735C00]/60 mb-3">低庫存警戒線</span>
            <div className="flex items-baseline gap-4">
              <span className="text-6xl font-serif text-[#735C00]">{lowCount}</span>
              <span className="text-[0.65rem] uppercase tracking-widest opacity-20 font-bold">Low Stock</span>
            </div>
            <div className="mt-8 pt-6 border-t border-[#D1C7B7]/10 text-[0.6rem] text-[#735C00]/40 italic">
               存量低於 {LOW_STOCK_THRESHOLD} 件之品項
            </div>
          </div>

          <div className="relative group p-10 bg-white border border-[#D1C7B7]/30 transition-kyoto hover:border-[#984443]">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-[#984443]">
               <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                 <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
            </div>
            <span className="block text-[0.6rem] uppercase tracking-[0.4em] font-bold text-[#984443]/60 mb-3">缺貨品項統計</span>
            <div className="flex items-baseline gap-4">
              <span className="text-6xl font-serif text-[#984443]">{outCount}</span>
              <span className="text-[0.65rem] uppercase tracking-widest opacity-20 font-bold">Out of Stock</span>
            </div>
            <div className="mt-8 pt-6 border-t border-[#D1C7B7]/10 text-[0.6rem] text-[#984443]/40 italic">
               當前存量為零，需即刻補貨
            </div>
          </div>
        </div>

        {/* Search & Filter - Minimalist Inline */}
        <div className="flex flex-col md:flex-row gap-12 mb-12 items-center px-4">
          <div className="relative group w-full md:flex-grow">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 text-[#111111]/20 group-focus-within:text-[#984443] transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              className="w-full bg-transparent border-b border-[#D1C7B7] py-3 pl-8 pr-4 text-sm focus:outline-none focus:border-[#111111] transition-all font-serif italic placeholder:opacity-30"
              placeholder="搜尋商品 ID 或 名稱..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-6 whitespace-nowrap">
            <span className="text-[0.6rem] uppercase tracking-[0.3em] font-bold opacity-30">Inventory View</span>
            <div className="flex gap-2">
              {[
                { id: 'all', label: '全部顯示' },
                { id: 'low', label: '警戒品項' },
                { id: 'out', label: '缺貨紀錄' }
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setFilterStatus(filter.id)}
                  className={`text-[0.65rem] uppercase tracking-[0.2em] font-bold px-5 py-2 transition-kyoto border ${
                    filterStatus === filter.id 
                      ? 'bg-[#111111] text-white border-[#111111]' 
                      : 'border-[#D1C7B7]/40 text-[#111111]/40 hover:border-[#111111]'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="overflow-x-auto mb-20 px-1">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#D1C7B7]/30 text-[0.6rem] uppercase tracking-[0.3em] font-bold text-[#111111]/40">
                <th className="px-4 py-8">縮圖</th>
                <th className="px-4 py-8">商品名稱 / ID</th>
                <th className="px-4 py-8 hidden md:table-cell">物資類別辨識</th>
                <th className="px-4 py-8 text-center hidden md:table-cell">架上狀態</th>
                <th className="px-4 py-8 text-center">當前存量</th>
                <th className="px-4 py-8 text-center hidden lg:table-cell">存盈評級</th>
                <th className="px-4 py-8 text-right">核定調度</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D1C7B7]/10">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-32 text-center text-[#111111]/20 italic font-serif text-lg">
                    <div className="flex flex-col items-center gap-6">
                      <div className="w-12 h-[1px] bg-[#984443]/30"></div>
                      此檢索條件下查無庫存文卷紀錄
                      <div className="w-12 h-[1px] bg-[#984443]/30"></div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const inv = product.inventory ?? 0;
                  const st = getStockBadge(product.inventory);
                  return (
                    <tr key={product.id} className="hover:bg-[#111111]/[0.02] transition-colors duration-500 group">
                      <td className="px-4 py-8">
                        <div className="w-16 h-20 bg-white p-1 border border-[#D1C7B7]/30 overflow-hidden">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#FAF9F6]">
                              <span className="text-[0.6rem] opacity-10 uppercase font-black tracking-tighter">No Image</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-8">
                        <div className="font-serif text-lg text-[#111111] mb-1 group-hover:text-[#984443] transition-colors">
                          {product.title}
                        </div>
                        <div className="text-[0.65rem] opacity-30 font-mono tracking-tighter uppercase">SKU: {product.id.slice(-10)}</div>
                      </td>
                      <td className="px-4 py-8 hidden md:table-cell">
                        <span className="text-[0.65rem] uppercase tracking-widest font-bold opacity-30 italic">{product.category}</span>
                      </td>
                      <td className="px-4 py-8 text-center hidden md:table-cell">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${product.is_enabled ? 'bg-[#3A4D39]' : 'bg-[#111111]/20'}`}></span>
                          <span className={`text-[0.55rem] uppercase tracking-[0.2em] font-bold ${product.is_enabled ? 'text-[#3A4D39]' : 'opacity-20'}`}>
                            {product.is_enabled ? 'Active' : 'Draft'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-8 text-center">
                        <span className={`font-serif text-3xl font-medium tracking-tighter ${st.color}`}>
                          {inv}
                        </span>
                        <span className="text-[0.6rem] opacity-20 ml-2 font-sans align-top mt-2 inline-block">Units</span>
                      </td>
                      <td className="px-4 py-8 text-center hidden lg:table-cell">
                        <span className={`px-4 py-1.5 text-[0.6rem] uppercase tracking-[0.2em] font-bold border ${st.color} ${st.bg.replace('/10', '/30')} border-transparent`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-8 text-right">
                        <button
                          className="group relative px-6 py-2 overflow-hidden transition-all duration-300"
                          onClick={() => openAdjustModal(product)}
                        >
                          <div className="absolute inset-0 border border-[#D1C7B7] group-hover:border-[#111111] transition-colors"></div>
                          <span className="relative text-[0.65rem] uppercase tracking-[0.3em] font-bold text-[#111111]/40 group-hover:text-[#111111] transition-colors">
                            庫存調律
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-center pb-20">
          <Pagination pagination={pagination} onChangePage={getProducts} />
        </div>
      </div>

      {/* Inventory Adjust Modal - Museum Quality */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12">
          <div className="absolute inset-0 bg-[#111111]/90 backdrop-blur-md animate-in fade-in duration-500" onClick={() => setShowModal(false)}></div>
          
          <div className="relative w-full max-w-4xl bg-[#FAF9F6] shadow-2xl overflow-hidden flex flex-col md:flex-row h-full max-h-[85vh] animate-in fade-in zoom-in duration-700">
            {/* Left Column: Artifact Status */}
            <div className="md:w-2/5 bg-[#111111] p-12 flex flex-col justify-between text-white border-r border-[#984443]/20">
              <div>
                <div className="text-[0.65rem] uppercase tracking-[0.6em] text-[#984443] font-black mb-8">Stock Calibration</div>
                <h4 className="font-serif text-4xl font-medium leading-[1.1] mb-12">
                  庫存調律儀軌 
                  <span className="block text-xs mt-4 opacity-30 font-sans tracking-[0.2em] uppercase font-bold">Logistical Alignment</span>
                </h4>
                
                <div className="space-y-12">
                  <div className="group">
                    <span className="text-[0.6rem] uppercase tracking-[0.4em] font-black text-[#984443] block mb-3">監理對象 / SUBJECT</span>
                    <span className="font-serif text-2xl text-white group-hover:text-[#984443] transition-colors duration-500">{selectedProduct?.title}</span>
                  </div>
                  
                  <div className="space-y-4">
                    <span className="text-[0.6rem] uppercase tracking-[0.4em] font-black text-white/30 block mb-1">當前盈損評價</span>
                    <div className="flex items-baseline gap-4">
                      <span className={`text-6xl font-serif font-medium ${getStockBadge(selectedProduct?.inventory).color.replace('text-', 'text-opacity-100 text-')}`}>
                        {selectedProduct?.inventory ?? 0}
                      </span>
                      <span className="text-xs font-mono opacity-20 uppercase tracking-widest">Base Units</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-12 border-t border-white/5">
                <button 
                  className="text-[0.65rem] uppercase tracking-[0.4em] font-bold text-white/20 hover:text-white transition-all duration-300 flex items-center gap-4 group" 
                  onClick={() => setShowModal(false)}
                >
                  <span className="w-8 h-[1px] bg-white/10 group-hover:w-12 group-hover:bg-[#984443] transition-all"></span>
                  撤回此案 / ABANDON
                </button>
              </div>
            </div>

            {/* Right Column: Execution Form */}
            <div className="flex-grow p-12 overflow-y-auto custom-scrollbar bg-white">
              <div className="max-w-md mx-auto space-y-12">
                {/* Adjust Type Selection */}
                <section>
                  <label className="text-[0.65rem] uppercase tracking-[0.4em] font-black text-[#111111]/30 block mb-6">調用方向 / OPERATION</label>
                  <div className="flex gap-4">
                    <button
                      className={`flex-1 py-4 text-[0.65rem] uppercase tracking-[0.3em] font-black transition-all duration-500 border ${
                        adjustType === 'add' ? 'bg-[#111111] text-white border-[#111111]' : 'bg-transparent text-[#111111]/30 border-[#D1C7B7]/40 hover:border-[#111111]'
                      }`}
                      onClick={() => setAdjustType('add')}
                    >
                      進貨入庫 / ADD
                    </button>
                    <button
                      className={`flex-1 py-4 text-[0.65rem] uppercase tracking-[0.3em] font-black transition-all duration-500 border ${
                        adjustType === 'subtract' ? 'bg-[#984443] text-white border-[#984443]' : 'bg-transparent text-[#984443]/20 border-[#D1C7B7]/40 hover:border-[#984443]'
                      }`}
                      onClick={() => setAdjustType('subtract')}
                    >
                      出庫損耗 / SUB
                    </button>
                  </div>
                </section>

                {/* Quantity Input */}
                <section>
                  <div className="flex justify-between items-end mb-4 px-1">
                    <label className="text-[0.65rem] uppercase tracking-[0.4em] font-black text-[#111111]/30">量計員額 / UNITS</label>
                    <div className="font-serif italic text-xs text-[#111111]/40">
                      預期圓滿： 
                      <span className={`ms-2 font-bold not-italic font-sans text-sm ${getStockBadge(previewInventory()).color}`}>
                        {previewInventory()}
                      </span>
                    </div>
                  </div>
                  <div className="relative group">
                    <input
                      type="number"
                      className="w-full bg-transparent border-b border-[#D1C7B7] py-6 text-5xl font-serif focus:outline-none focus:border-[#111111] transition-all placeholder:opacity-10"
                      placeholder="00"
                      min="1"
                      value={adjustQty}
                      onChange={(e) => setAdjustQty(e.target.value)}
                    />
                    <div className="absolute right-0 bottom-6 text-[0.65rem] uppercase tracking-widest font-black opacity-10">QTY SPEC</div>
                  </div>
                </section>

                {/* Adjustment Notes */}
                <section>
                  <label className="text-[0.65rem] uppercase tracking-[0.4em] font-black text-[#111111]/30 block mb-6">更動緣由 / REASONING</label>
                  <div className="flex flex-wrap gap-2 mb-8">
                    {REASON_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        className={`px-4 py-2 text-[0.6rem] uppercase tracking-widest font-bold border transition-all duration-300 ${
                          adjustNote === preset ? 'bg-[#111111] text-white border-[#111111]' : 'bg-transparent border-[#D1C7B7]/30 text-[#111111]/40 hover:border-[#111111] hover:text-[#111111]'
                        }`}
                        onClick={() => setAdjustNote(preset)}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    className="w-full bg-transparent border-b border-[#D1C7B7]/30 py-4 text-sm focus:outline-none focus:border-[#111111] transition-all font-serif italic placeholder:opacity-20"
                    placeholder="或自行詳述其餘調度原由..."
                    value={adjustNote}
                    onChange={(e) => setAdjustNote(e.target.value)}
                  />
                </section>

                {/* History Snippet */}
                {productLogs.length > 0 && (
                  <section className="pt-12 border-t border-[#D1C7B7]/10">
                    <label className="text-[0.55rem] uppercase tracking-[0.5em] font-black text-[#111111]/20 block mb-6">ARCHIVAL LOGS (LAST 5)</label>
                    <div className="space-y-4">
                      {productLogs.map((log) => (
                        <div key={log.id} className="flex justify-between items-center text-[0.65rem] group/log">
                          <div className="flex items-center gap-4">
                            <span className={`font-bold tracking-widest ${log.type === 'add' ? 'text-[#3A4D39]' : 'text-[#984443]'}`}>
                              {log.type === 'add' ? '入庫' : '出庫'} / {log.quantity}
                            </span>
                            <span className="opacity-30 italic font-serif flex items-center gap-2">
                               <span className="w-1 h-1 rounded-full bg-[#D1C7B7]"></span>
                               {log.note || '未見詳述'}
                            </span>
                          </div>
                          <span className="opacity-20 font-mono text-[0.6rem]">{new Date(log.created_at).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <div className="pt-16">
                  <button 
                    className="w-full group relative py-5 bg-[#111111] overflow-hidden transition-all duration-700 shadow-2xl disabled:opacity-20" 
                    onClick={handleAdjust}
                    disabled={adjustLoading || !adjustQty || parseInt(adjustQty) <= 0}
                  >
                    <div className="absolute inset-0 bg-[#984443] translate-y-full group-hover:translate-y-0 transition-transform duration-700"></div>
                    <span className="relative text-[0.7rem] uppercase tracking-[0.6em] font-black text-white">
                      {adjustLoading ? '進行封存調律中...' : '提交此案 · 奉納儲入'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminInventory;
                className="px-12 py-3 bg-[#111111] text-[#FAF9F6] text-[0.7rem] uppercase tracking-[0.3em] font-bold hover:bg-[#984443] transition-all disabled:opacity-50 shadow-xl" 
                    onClick={handleAdjust}
                    disabled={adjustLoading || !adjustQty || parseInt(adjustQty) <= 0}
                  >
                    {adjustLoading ? '調律中...' : '奉納儲入'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminInventory;
  );
}

export default AdminInventory;
