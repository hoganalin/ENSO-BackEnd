import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  
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
    try {
      const response = await getAdminOrders(page);
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
        setIsModalOpen(false);
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
      confirmButtonColor: '#984443',
      cancelButtonColor: '#111111',
      confirmButtonText: '是的，刪除它！',
      cancelButtonText: '取消',
      background: '#FAF9F6',
      color: '#111111'
    });

    if (!result.isConfirmed) return;

    setIsLoading(true);
    try {
      const resp = await deleteAdminOrder(orderId);
      if (resp.data.success) {
        showSuccess('訂單已刪除');
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
    setIsLoading(true);
    try {
      const finalTotal = Object.values(data.products || {}).reduce(
        (acc, curr) => acc + Number(curr.qty || 0) * (curr.product?.price || 0),
        0
      );
      const updatedData = { ...data, total: finalTotal };
      const resp = await updateAdminOrder(data, updatedData);
      if (resp.data.success) {
        showSuccess('訂單已修改');
        getOrders(pagination.current_page);
        setIsModalOpen(false);
      }
    } catch (err) {
      showError(err.response?.data?.message || '修改失敗');
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
      confirmButtonColor: '#984443',
      cancelButtonColor: '#111111',
      confirmButtonText: '是的，全部清空！',
      background: '#FAF9F6',
      color: '#111111'
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
  }, []);

  const openOrderModal = (order) => {
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
      order.id.toLowerCase().includes(keyword) ||
      order.user.name.toLowerCase().includes(keyword);
    const matchPaid =
      filterPaid === 'all' ||
      (filterPaid === 'paid' && order.is_paid) ||
      (filterPaid === 'unpaid' && !order.is_paid);
    return matchSearch && matchPaid;
  });

  return (
    <div className="min-h-screen bg-[#FAF9F6] px-6 py-12 font-sans text-[#111111]">
      {/* Header section with Kumiko inspired borders */}
      <div className="max-w-7xl mx-auto mb-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-[#D1C7B7] pb-10 relative">
          <div className="absolute -bottom-[1px] left-0 w-24 h-[1px] bg-[#984443]"></div>
          <div>
            <div className="text-[0.65rem] uppercase tracking-[0.6em] text-[#984443] font-bold mb-4 opacity-80">
              Administrative / Records
            </div>
            <h2 className="font-serif text-5xl font-medium tracking-tight text-[#111111]">
              訂單管理<span className="text-[0.5em] ml-4 opacity-20 font-sans tracking-widest">ORDER ARCHIVE</span>
            </h2>
          </div>
          <button
            className="group relative px-10 py-3 overflow-hidden transition-all duration-500"
            onClick={() => deleteOrderAll()}
          >
            <div className="absolute inset-0 border border-[#984443]/30 group-hover:border-[#984443] transition-colors"></div>
            <div className="absolute inset-0 bg-[#984443] translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
            <span className="relative text-[0.65rem] uppercase tracking-[0.4em] font-bold text-[#984443] group-hover:text-white transition-colors">
              清空所有訂單
            </span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Search & Filter - Editorial Style */}
        <div className="flex flex-col md:flex-row gap-8 mb-12 items-center">
          <div className="relative group w-full md:w-96">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 text-[#111111]/30 group-focus-within:text-[#984443] transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              className="w-full bg-transparent border-b border-[#D1C7B7] py-3 pl-8 pr-4 text-sm focus:outline-none focus:border-[#111111] transition-all placeholder:italic placeholder:opacity-30"
              placeholder="搜尋訂單編號或客戶姓名..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-6">
            <span className="text-[0.6rem] uppercase tracking-[0.3em] font-bold opacity-30">Status</span>
            <div className="flex gap-4">
              {['all', 'paid', 'unpaid'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterPaid(status)}
                  className={`text-[0.65rem] uppercase tracking-[0.2em] font-bold px-4 py-1.5 transition-kyoto rounded-full border ${
                    filterPaid === status 
                      ? 'bg-[#111111] text-white border-[#111111]' 
                      : 'border-[#D1C7B7] text-[#111111]/40 hover:border-[#111111]'
                  }`}
                >
                  {status === 'all' ? '全部' : status === 'paid' ? '已付款' : '未付款'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="relative">
          {/* Subtle noise pattern overlay for texture if needed, but keeping it clean for now */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#D1C7B7]/30 text-[0.6rem] uppercase tracking-[0.3em] font-bold text-[#111111]/40">
                  <th className="px-4 py-6 font-bold">訂單時間</th>
                  <th className="px-4 py-6 font-bold hidden lg:table-cell">訂單編號</th>
                  <th className="px-4 py-6 font-bold">客戶情資</th>
                  <th className="px-4 py-6 font-bold">付款狀態</th>
                  <th className="px-4 py-6 font-bold text-right">訂單總額</th>
                  <th className="px-4 py-6 font-bold text-center">細節檢索</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D1C7B7]/10">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-32 text-center text-[#111111]/20 italic font-serif text-lg">
                      <div className="flex flex-col items-center gap-6">
                        <div className="w-12 h-[1px] bg-[#984443]/30"></div>
                        目前無任何交易紀錄
                        <div className="w-12 h-[1px] bg-[#984443]/30"></div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-[#111111]/[0.02] transition-colors duration-500 group">
                      <td className="px-4 py-8">
                        <div className="font-medium text-[#111111] text-sm mb-1">
                          {formatDate(order.create_at).split(' ')[0]}
                        </div>
                        <div className="text-[0.6rem] opacity-30 uppercase tracking-tighter">
                          {formatDate(order.create_at).split(' ')[1]}
                        </div>
                      </td>
                      <td className="px-4 py-8 hidden lg:table-cell">
                        <span className="text-[0.65rem] opacity-30 font-mono tracking-tighter border-l border-[#D1C7B7] pl-4">
                          {order.id.slice(0, 8)}...
                        </span>
                      </td>
                      <td className="px-4 py-8">
                        <div className="font-serif text-base text-[#111111] mb-1">
                          {order.user.name}
                        </div>
                        <div className="text-[0.65rem] opacity-40 italic">{order.user.email}</div>
                      </td>
                      <td className="px-4 py-8">
                        <div className="flex items-center gap-3">
                          <div className={`w-1.5 h-1.5 rounded-full ${order.is_paid ? 'bg-[#3A4D39]' : 'bg-[#984443] animate-pulse'}`}></div>
                          <span className={`text-[0.65rem] uppercase tracking-[0.2em] font-bold ${order.is_paid ? 'text-[#3A4D39]' : 'text-[#984443]'}`}>
                            {order.is_paid ? 'PAID' : 'UNPAID'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-8 text-right font-serif text-xl font-medium">
                        <span className="text-xs opacity-30 mr-2">NT$</span>
                        {currency(order.total)}
                      </td>
                      <td className="px-4 py-8 text-center">
                        <button
                          className="px-6 py-2 text-[0.6rem] uppercase tracking-[0.3em] font-bold text-[#111111]/40 border border-[#D1C7B7]/40 hover:border-[#111111] hover:text-[#111111] transition-all duration-300"
                          onClick={() => openOrderModal(order)}
                        >
                          檢視
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-20 flex justify-center pb-20">
          <Pagination pagination={pagination} onChangePage={getOrders} />
        </div>
      </div>

      {/* Bespoke Order Detail Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12">
          <div className="absolute inset-0 bg-[#111111]/90 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          
          <div className="relative w-full max-w-6xl bg-[#FAF9F6] shadow-2xl overflow-hidden flex flex-col max-h-full animate-in fade-in zoom-in duration-500">
            {/* Modal Header - Dark themed for contrast */}
            <div className="bg-[#111111] p-10 flex flex-col md:flex-row justify-between items-start md:items-end border-b border-[#984443]/30">
              <div className="mb-6 md:mb-0">
                <div className="text-[0.6rem] uppercase tracking-[0.6em] text-[#984443] font-bold mb-3">Order Specification</div>
                <h3 className="font-serif text-3xl text-white mb-2">
                  交易情資明細
                </h3>
                <div className="flex items-center gap-4 text-[0.65rem] text-white/40 font-mono">
                  <span>ID: {tempOrder?.id}</span>
                  <span className="w-1 h-1 rounded-full bg-white/20"></span>
                  <span className="uppercase tracking-widest">{tempOrder && formatDate(tempOrder.create_at)}</span>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="group relative w-12 h-12 flex items-center justify-center"
              >
                <div className="absolute inset-0 border border-white/10 group-hover:border-white/40 transition-colors"></div>
                <span className="text-white text-xl font-light group-hover:rotate-90 transition-transform duration-500">✕</span>
              </button>
            </div>

            <div className="flex-grow overflow-y-auto custom-scrollbar p-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                {/* Left Side: User Bio Data */}
                <div className="lg:col-span-4 space-y-12">
                  <section>
                    <div className="flex items-center gap-4 mb-8">
                       <div className="w-8 h-[1px] bg-[#984443]"></div>
                       <h6 className="text-[0.65rem] uppercase tracking-[0.4em] text-[#111111] font-bold">收件情資書</h6>
                    </div>
                    
                    <div className="space-y-8">
                      <div className="group">
                        <label className="text-[0.6rem] uppercase tracking-widest text-[#111111]/40 block mb-2 font-bold group-focus-within:text-[#984443] transition-colors">姓名 / FULL NAME</label>
                        <input
                          type="text"
                          className={`w-full bg-transparent border-b border-[#D1C7B7] py-2 text-lg font-serif focus:outline-none focus:border-[#111111] transition-all ${errors.user?.name ? 'border-[#984443]' : ''}`}
                          {...register('user.name', { required: true })}
                        />
                      </div>
                      <div className="group">
                        <label className="text-[0.6rem] uppercase tracking-widest text-[#111111]/40 block mb-2 font-bold group-focus-within:text-[#984443] transition-colors">聯絡電話 / CONTACT</label>
                        <input
                          type="tel"
                          className="w-full bg-transparent border-b border-[#D1C7B7] py-2 font-mono text-sm focus:outline-none focus:border-[#111111] transition-all"
                          {...register('user.tel', { required: true })}
                        />
                      </div>
                      <div className="group">
                        <label className="text-[0.6rem] uppercase tracking-widest text-[#111111]/40 block mb-2 font-bold group-focus-within:text-[#984443] transition-colors">地址 / SHIPPING ADDRESS</label>
                        <input
                          type="text"
                          className="w-full bg-transparent border-b border-[#D1C7B7] py-2 text-sm focus:outline-none focus:border-[#111111] transition-all"
                          {...register('user.address', { required: true })}
                        />
                      </div>
                      <div className="group">
                        <label className="text-[0.6rem] uppercase tracking-widest text-[#111111]/40 block mb-2 font-bold group-focus-within:text-[#984443] transition-colors">電子郵件 / EMAIL</label>
                        <input
                          type="email"
                          className="w-full bg-transparent border-b border-[#D1C7B7] py-2 text-sm italic focus:outline-none focus:border-[#111111] transition-all"
                          {...register('user.email', { required: true })}
                        />
                      </div>
                    </div>
                  </section>

                  <section>
                    <label className="text-[0.6rem] uppercase tracking-widest text-[#111111]/40 block mb-3 font-bold">客戶留言 / MESSAGE</label>
                    <div className="p-6 bg-white border border-[#D1C7B7]/40 font-serif text-sm italic relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-8 h-8 opacity-5">
                         <svg viewBox="0 0 24 24" fill="currentColor"><path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H15.017C14.4647 8 14.017 8.44772 14.017 9V12C14.017 12.5523 13.5693 13 13.017 13H11.017C10.4647 13 10.017 12.5523 10.017 12V9C10.017 7.34315 11.3601 6 13.017 6H19.017C20.6738 6 22.017 7.34315 22.017 9V15C22.017 17.1111 21.0503 19.0667 19.5397 20.4038C19.3444 20.5772 19.1222 20.7259 18.882 20.8385L18.017 21H14.017ZM3.017 21L3.017 18C3.017 16.8954 3.91243 16 5.017 16H8.017C8.56928 16 9.017 15.5523 9.017 15V9C9.017 8.44772 8.56928 8 8.017 8H4.017C3.46472 8 3.017 8.44772 3.017 9V12C3.017 12.5523 2.56928 13 2.017 13H0.017C-0.535282 13 -1.017 12.5523 -1.017 12V9C-1.017 7.34315 0.326142 6 2.017 6H8.017C9.67386 6 11.017 7.34315 11.017 9V15C11.017 17.1111 10.0503 19.0667 8.53974 20.4038C8.3444 20.5772 8.12216 20.7259 7.88203 20.8385L7.017 21H3.017Z"/></svg>
                      </div>
                      {watch('message') || '本案件目前無備註說明。'}
                    </div>
                  </section>
                </div>

                {/* Right Side: Product Matrix */}
                <div className="lg:col-span-8 flex flex-col">
                  <div className="flex justify-between items-center mb-10 pb-4 border-b border-[#D1C7B7]/30">
                     <h6 className="text-[0.65rem] uppercase tracking-[0.4em] text-[#111111] font-bold">商品明細清冊</h6>
                     <button
                        className="text-[0.6rem] uppercase tracking-[0.2em] font-bold text-[#984443] hover:text-[#111111] transition-colors flex items-center gap-2"
                        onClick={handleSubmit(modifyOrder)}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#984443]"></span>
                        更新訂單數據
                      </button>
                  </div>

                  <div className="space-y-6">
                    {tempOrder && Object.entries(tempOrder.products).map(([id, item]) => (
                      <div key={id} className="flex gap-8 group pb-6 border-b border-[#D1C7B7]/10 last:border-0">
                        <div className="w-24 h-32 bg-white p-1 border border-[#D1C7B7]/30 overflow-hidden shrink-0">
                          <img 
                            src={item.product.imageUrl} 
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" 
                          />
                        </div>
                        <div className="flex-grow flex flex-col justify-between py-1">
                          <div>
                            <div className="text-[0.6rem] uppercase tracking-widest text-[#984443] font-bold mb-2">{item.product.category}</div>
                            <h4 className="font-serif text-xl text-[#111111] mb-1">{item.product.title}</h4>
                            <div className="text-[0.7rem] opacity-30 font-mono italic">UNIT PRICE: ${currency(item.product.price)}</div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <span className="text-[0.6rem] uppercase tracking-widest opacity-40 font-bold">Quantity</span>
                              <div className="flex items-center border border-[#D1C7B7] rounded-sm bg-white overflow-hidden">
                                <input
                                  type="number"
                                  className="w-14 h-8 text-center text-sm font-bold focus:outline-none"
                                  {...register(`products.${id}.qty`, { valueAsNumber: true })}
                                />
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-[0.6rem] uppercase opacity-30 font-bold tracking-widest mb-1">Subtotal</div>
                              <div className="font-serif text-lg font-medium text-[#111111]">
                                ${currency((watch(`products.${id}.qty`) || 0) * item.product.price)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto pt-16 border-t border-[#111111] border-opacity-10">
                    <div className="flex flex-col md:flex-row justify-between items-end gap-12">
                      <div className="order-2 md:order-1">
                        <div className="text-[0.6rem] uppercase tracking-widest text-[#111111]/40 mb-3 font-bold">Status Update</div>
                        <button
                          type="button"
                          className={`px-10 py-3 text-[0.65rem] uppercase tracking-[0.3em] font-bold shadow-sm transition-all duration-500 border ${
                            tempOrder?.is_paid 
                              ? 'border-[#984443] text-[#984443] hover:bg-[#984443] hover:text-white' 
                              : 'bg-[#3A4D39] border-[#3A4D39] text-white hover:bg-[#111111] hover:border-[#111111]'
                          }`}
                          onClick={() => updatePaymentStatus(tempOrder)}
                        >
                          {tempOrder?.is_paid ? '標記為未付款 / UNPAY' : '確認已收款 / CONFIRM'}
                        </button>
                      </div>
                      
                      <div className="text-right order-1 md:order-2">
                        <div className="text-[0.65rem] uppercase tracking-[0.4em] text-[#984443] mb-2 font-bold opacity-80">Total Valuation</div>
                        <div className="font-serif text-6xl font-medium text-[#111111] tracking-tighter">
                          <span className="text-xl opacity-20 align-top mr-4 mt-2 inline-block">NT$</span>
                          {currency(totalPrice)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-8 bg-white border-t border-[#D1C7B7]/30 flex justify-between items-center">
              <button
                type="button"
                className="px-8 py-2 text-[0.6rem] uppercase tracking-[0.4em] font-bold text-[#111111]/30 hover:text-[#984443] transition-colors"
                onClick={() => deleteOrder(tempOrder.id)}
              >
                刪除此筆記錄 / DELETE
              </button>
              <button
                type="button"
                className="px-12 py-3 bg-[#111111] text-white text-[0.6rem] uppercase tracking-[0.4em] font-bold hover:bg-[#984443] transition-all duration-500 shadow-xl"
                onClick={() => setIsModalOpen(false)}
              >
                關閉情資 / CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      <FullPageLoading isLoading={loading} />
    </div>
  );
}

export default AdminOrders;
2 text-[0.7rem] uppercase tracking-[0.2em] font-bold shadow-sm transition-all duration-300 ${
                  tempOrder?.is_paid 
                    ? 'border border-[#984443] text-[#984443] hover:bg-[#984443] hover:text-white' 
                    : 'bg-[#3A4D39] text-white hover:bg-[#111111]'
                }`}
                onClick={() => updatePaymentStatus(tempOrder)}
              >
                {tempOrder?.is_paid ? '標記為未付款' : '確認已收款'}
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
