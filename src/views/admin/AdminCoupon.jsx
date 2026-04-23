import { useState, useEffect } from 'react';
import {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from '../../service/coupon';
import useMessage from '../../hooks/useMessage';
import FullPageLoading from '../../components/FullPageLoading';
import Swal from 'sweetalert2';

//日期轉換輔助函式
const formatDate = (timestamp) => {
  if (!timestamp) return '';
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { showSuccess, showError } = useMessage();

  useEffect(() => {
    fetchCoupons();
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

  const openModal = (status, coupon) => {
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
    setIsLoading(true);
    try {
      if (isNewCoupon) {
        await createCoupon({ data: tempCoupon });
        showSuccess('已建立優惠券');
      } else {
        await updateCoupon(tempCoupon.id, { data: tempCoupon });
        showSuccess('資料已更新');
      }
      setIsModalOpen(false);
      fetchCoupons();
    } catch (error) {
      showError(error.response?.data?.message || error.message);
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
      confirmButtonColor: '#984443',
      cancelButtonColor: '#111111',
      confirmButtonText: '確定刪除',
      cancelButtonText: '取消',
      background: '#FAF9F6',
      color: '#111111'
    });

    if (!result.isConfirmed) return;

    setIsLoading(true);
    try {
      await deleteCoupon(id);
      showSuccess('優惠券已移除');
      fetchCoupons();
    } catch (error) {
      showError(error.response?.data?.message || '刪除失敗');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] px-6 py-12 font-sans text-[#111111]">
      <FullPageLoading isLoading={isLoading} />

      {/* Header Section */}
      <div className="max-w-7xl mx-auto mb-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-[#D1C7B7] pb-10 relative">
          <div className="absolute -bottom-[1px] left-0 w-24 h-[1px] bg-[#984443]"></div>
          <div>
            <div className="text-[0.65rem] uppercase tracking-[0.6em] text-[#984443] font-bold mb-4 opacity-80">
              Administrative / Promotions
            </div>
            <h2 className="font-serif text-5xl font-medium tracking-tight text-[#111111]">
              酬賓優惠<span className="text-[0.5em] ml-4 opacity-20 font-sans tracking-widest uppercase">COUPON MANAGEMENT</span>
            </h2>
          </div>
          <button
            className="group relative px-10 py-4 overflow-hidden transition-all duration-700 hover:shadow-2xl"
            onClick={() => openModal('new')}
          >
            <div className="absolute inset-0 bg-[#111111] translate-y-full group-hover:translate-y-0 transition-transform duration-700"></div>
            <div className="absolute inset-0 border border-[#111111]"></div>
            <span className="relative text-[0.7rem] uppercase tracking-[0.4em] font-bold text-[#111111] group-hover:text-[#FAF9F6] transition-colors duration-700">
              簽署新優惠 · ISSUE
            </span>
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-24">
        <div className="p-8 border-l border-[#D1C7B7]/30 hover:border-[#111111] transition-colors duration-500">
           <span className="text-[0.6rem] uppercase tracking-widest font-bold opacity-30 block mb-2">現行優惠總數</span>
           <span className="text-4xl font-serif text-[#111111]">{coupons.length} <small className="text-xs font-sans opacity-20 font-normal">Active</small></span>
        </div>
        <div className="p-8 border-l border-[#D1C7B7]/30 hover:border-[#3A4D39] transition-colors duration-500">
           <span className="text-[0.6rem] uppercase tracking-widest font-bold opacity-30 block mb-2">折扣效應評核</span>
           <span className="text-4xl font-serif text-[#3A4D39]">85% <small className="text-xs font-sans opacity-20 font-normal">Average</small></span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Table Area */}
        <div className="overflow-x-auto mb-20 px-1">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#D1C7B7]/30 text-[0.6rem] uppercase tracking-[0.3em] font-bold text-[#111111]/40">
                <th className="px-4 py-8">活動標題 / DESC</th>
                <th className="px-4 py-8 hidden md:table-cell">優惠代碼 / CODE</th>
                <th className="px-4 py-8">折扣權重 / VALUE</th>
                <th className="px-4 py-8 hidden md:table-cell">有效期限 / EXPIRY</th>
                <th className="px-4 py-8 text-center">狀態 / STATUS</th>
                <th className="px-4 py-8 text-right">核定操作 / ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D1C7B7]/10">
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-32 text-center text-[#111111]/20 italic font-serif text-lg">
                    <div className="flex flex-col items-center gap-6">
                      <div className="w-12 h-[1px] bg-[#984443]/30"></div>
                      目前尚無營運中之優惠文卷存檔
                      <div className="w-12 h-[1px] bg-[#984443]/30"></div>
                    </div>
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-[#111111]/[0.02] transition-colors duration-500 group">
                    <td className="px-4 py-10">
                      <div className="font-serif text-lg text-[#111111] group-hover:text-[#984443] transition-colors duration-500">
                        {coupon.title}
                      </div>
                      <div className="text-[0.65rem] opacity-20 font-mono tracking-tighter mt-1">REF: {coupon.id.slice(-10)}</div>
                    </td>
                    <td className="px-4 py-10 hidden md:table-cell">
                      <code className="text-[0.85rem] font-mono font-bold text-[#111111] tracking-widest bg-[#FAF9F6] border border-[#D1C7B7]/40 px-3 py-1 group-hover:border-[#111111] transition-colors">
                        {coupon.code}
                      </code>
                    </td>
                    <td className="px-4 py-10">
                       <span className="text-2xl font-serif text-[#111111]">
                         {coupon.percent}
                       </span>
                       <span className="text-[0.6rem] uppercase tracking-widest font-black ml-2 opacity-20">Percent Off</span>
                    </td>
                    <td className="px-4 py-10 hidden md:table-cell">
                      <span className="text-sm font-serif italic text-[#111111]/60">
                        {formatDate(coupon.due_date)}
                      </span>
                    </td>
                    <td className="px-4 py-10 text-center">
                       <div className="flex flex-col items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${coupon.is_enabled ? 'bg-[#3A4D39]' : 'bg-[#111111]/10'}`}></span>
                          <span className={`text-[0.55rem] uppercase tracking-[0.2em] font-bold ${coupon.is_enabled ? 'text-[#3A4D39]' : 'opacity-10'}`}>
                            {coupon.is_enabled ? 'Active' : 'Suspended'}
                          </span>
                       </div>
                    </td>
                    <td className="px-4 py-10 text-right">
                      <div className="inline-flex gap-8">
                        <button
                          className="text-[0.65rem] uppercase tracking-[0.3em] font-bold text-[#111111]/40 hover:text-[#111111] transition-colors"
                          onClick={() => openModal('edit', coupon)}
                        >
                          修訂
                        </button>
                        <button
                          className="text-[0.65rem] uppercase tracking-[0.3em] font-bold text-[#984443]/40 hover:text-[#984443] transition-colors"
                          onClick={() => handleDeleteCoupon(coupon.id)}
                        >
                          撤除
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

      {/* State-Driven Modal - Custom Implementation */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12">
           <div className="absolute inset-0 bg-[#111111]/90 backdrop-blur-md animate-in fade-in duration-500" onClick={closeModal}></div>
           
           <div className="relative w-full max-w-4xl bg-[#FAF9F6] shadow-2xl overflow-hidden flex flex-col md:flex-row h-full max-h-[85vh] animate-in fade-in zoom-in duration-700">
              {/* Sidebar Info */}
              <div className="md:w-2/5 bg-[#111111] p-12 flex flex-col justify-between text-white border-r border-[#984443]/20">
                <div>
                   <div className="text-[0.65rem] uppercase tracking-[0.6em] text-[#984443] font-black mb-8">Accession Record</div>
                   <h4 className="font-serif text-4xl font-medium leading-[1.1] mb-12">
                     {isNewCoupon ? '建立新優惠活動' : '修訂優惠條款'}
                     <span className="block text-xs mt-4 opacity-30 font-sans tracking-[0.2em] uppercase font-bold">Policy Alignment</span>
                   </h4>
                   <p className="text-sm italic font-serif leading-relaxed opacity-40">
                      所有對外宣告之特權、優惠與代碼折抵，均需經過嚴格之文卷編印與簽核，方可生效於品牌範疇內。
                   </p>
                </div>

                <div className="pt-12 border-t border-white/5">
                   <button 
                     className="text-[0.65rem] uppercase tracking-[0.4em] font-bold text-white/20 hover:text-white transition-all duration-300 flex items-center gap-4 group"
                     onClick={closeModal}
                   >
                     <span className="w-8 h-[1px] bg-white/10 group-hover:w-12 group-hover:bg-[#984443] transition-all"></span>
                     放棄修訂 / ABANDON
                   </button>
                </div>
              </div>

              {/* Form Content */}
              <div className="flex-grow p-12 overflow-y-auto custom-scrollbar bg-white">
                <div className="max-w-md mx-auto space-y-12">
                   {/* Title Input */}
                   <section className="space-y-4">
                      <label className="text-[0.65rem] uppercase tracking-[0.4em] font-black text-[#111111]/30 block px-1">活動名錄 / NOMENCLATURE</label>
                      <input
                        type="text"
                        className="w-full bg-transparent border-b border-[#D1C7B7] py-4 text-2xl font-serif text-[#111111] focus:outline-none focus:border-[#111111] transition-all placeholder:opacity-10"
                        placeholder="請輸入活動標題..."
                        value={tempCoupon.title}
                        onChange={(e) => setTempCoupon({ ...tempCoupon, title: e.target.value })}
                      />
                   </section>

                   {/* Code Input */}
                   <section className="space-y-4">
                      <label className="text-[0.65rem] uppercase tracking-[0.4em] font-black text-[#111111]/30 block px-1">優惠代碼 / UNIQUE CIPHER</label>
                      <input
                        type="text"
                        className="w-full bg-transparent border-b border-[#D1C7B7] py-4 text-lg font-mono font-bold text-[#984443] focus:outline-none focus:border-[#984443] transition-all uppercase placeholder:opacity-5"
                        placeholder="SUMMER2024"
                        value={tempCoupon.code}
                        onChange={(e) => setTempCoupon({ ...tempCoupon, code: e.target.value })}
                      />
                   </section>

                   <div className="grid grid-cols-2 gap-12">
                      {/* Date Input */}
                      <section className="space-y-4">
                         <label className="text-[0.65rem] uppercase tracking-[0.4em] font-black text-[#111111]/30 block px-1">有效截期 / EXPIRY</label>
                         <input
                           type="date"
                           className="w-full bg-transparent border-b border-[#D1C7B7]/40 py-2 text-sm font-serif focus:outline-none focus:border-[#111111] transition-all"
                           value={formatDate(tempCoupon.due_date)}
                           onChange={(e) => setTempCoupon({ ...tempCoupon, due_date: toTimeStamp(e.target.value) })}
                         />
                      </section>
                      {/* Percent Input */}
                      <section className="space-y-4">
                         <label className="text-[0.65rem] uppercase tracking-[0.4em] font-black text-[#111111]/30 block px-1">折扣權重 / VALUE</label>
                         <div className="relative group">
                            <input
                              type="number"
                              className="w-full bg-transparent border-b border-[#D1C7B7]/40 py-2 text-sm font-mono text-[#111111] focus:outline-none focus:border-[#111111] transition-all"
                              placeholder="80"
                              value={tempCoupon.percent}
                              onChange={(e) => setTempCoupon({ ...tempCoupon, percent: Number(e.target.value) })}
                            />
                            <span className="absolute right-0 bottom-2 text-xs opacity-20">% OFF</span>
                         </div>
                      </section>
                   </div>

                   {/* Toggle Status */}
                   <section className="pt-8 border-t border-[#D1C7B7]/10">
                      <label className="flex items-center gap-6 cursor-pointer group">
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={!!tempCoupon.is_enabled}
                            onChange={(e) => setTempCoupon({ ...tempCoupon, is_enabled: e.target.checked ? 1 : 0 })}
                          />
                          <div className="w-14 h-7 bg-[#FAF9F6] border border-[#D1C7B7] group-hover:border-[#111111] peer-checked:bg-[#111111] peer-checked:border-[#111111] transition-all duration-700"></div>
                          <div className="absolute left-1.5 top-1.5 w-4 h-4 bg-[#D1C7B7] peer-checked:bg-white peer-checked:translate-x-7 transition-all duration-700"></div>
                        </div>
                        <div className="flex flex-col">
                           <span className="text-[0.65rem] uppercase tracking-[0.2em] font-black text-[#111111] opacity-40 group-hover:opacity-100 transition-opacity">
                             生效宣告 · PUBLISH
                           </span>
                           <span className="text-[0.55rem] opacity-20 italic">將此優惠文草正式發佈於大眾檢閱與使用</span>
                        </div>
                      </label>
                   </section>

                   <div className="pt-16">
                      <button 
                         className="w-full group relative py-6 bg-[#111111] overflow-hidden transition-all duration-700 shadow-2xl"
                         onClick={handleUpdateCoupon}
                      >
                         <div className="absolute inset-0 bg-[#984443] translate-y-full group-hover:translate-y-0 transition-transform duration-700"></div>
                         <span className="relative text-[0.7rem] uppercase tracking-[0.6em] font-black text-white">
                           {isNewCoupon ? '正式發佈 · ENACT' : '儲存變更 · ARCHIVE'}
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
