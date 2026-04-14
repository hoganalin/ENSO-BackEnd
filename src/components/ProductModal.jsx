import { useEffect, useState, useRef } from 'react';
import useMessage from '../hooks/useMessage';
import {
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  uploadAdminImage,
} from '../service/adminProducts';

export default function ProductModal({
  modalType,
  templateProduct,
  closeModal,
  getData,
}) {
  const { showSuccess, showError } = useMessage();
  const fileInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);

  // Normalizer to ensure scenes array etc.
  const normalizer = (value) => {
    if (Array.isArray(value)) {
      return value.slice(0, 3).map((scene) => (scene == null ? '' : String(scene)));
    }
    return ['', '', ''];
  };

  const [tempData, setTempData] = useState(() => ({
    ...templateProduct,
    scenes: normalizer(templateProduct?.scenes),
  }));

  useEffect(() => {
    setTempData({
      ...templateProduct,
      scenes: normalizer(templateProduct?.scenes),
    });
  }, [templateProduct]);

  if (!modalType) return null;

  const handleInputChange = (e) => {
    const { name, value, checked, type } = e.target;
    setTempData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleImageChange = (index, value) => {
    const newImages = [...(tempData.imagesUrl || [])];
    newImages[index] = value;
    if (value !== '' && index === newImages.length - 1 && newImages.length < 5) {
      newImages.push('');
    }
    setTempData({ ...tempData, imagesUrl: newImages });
  };

  const handleSceneChange = (index, value) => {
    const nextScenes = [...tempData.scenes];
    nextScenes[index] = value;
    setTempData({ ...tempData, scenes: nextScenes });
  };

  const uploadImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file-to-upload', file);
    setIsLoading(true);
    try {
      const response = await uploadAdminImage(formData);
      setTempData((pre) => ({ ...pre, imageUrl: response.data.imageUrl }));
    } catch (error) {
      showError('圖片上傳失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    const payload = {
      ...tempData,
      origin_price: Number(tempData.origin_price),
      price: Number(tempData.price),
      is_enabled: tempData.is_enabled ? 1 : 0,
      scenes: normalizer(tempData.scenes),
    };
    setIsLoading(true);
    try {
      if (modalType === 'edit') await updateAdminProduct(tempData.id, payload);
      else await createAdminProduct(payload);
      getData();
      showSuccess('操作成功');
      closeModal();
    } catch (error) {
      showError('操作失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await deleteAdminProduct(tempData.id);
      getData();
      showSuccess('產品已刪除');
      closeModal();
    } catch (error) {
      showError('刪除失敗');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 transition-kyoto">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#111111]/40 backdrop-blur-sm"
        onClick={closeModal}
      />
      
      {/* Modal Container */}
      <div className="relative bg-[#FAF9F6] w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl rounded-sm border border-[#D1C7B7] flex flex-col">
        {/* Header */}
        <div className={`sticky top-0 z-10 px-8 py-6 flex items-center justify-between border-b border-[#D1C7B7] bg-[#FAF9F6]`}>
          <div>
            <h2 className="font-serif text-2xl font-medium text-[#111111] tracking-tight">
              {modalType === 'delete' ? '確認刪除' : modalType === 'edit' ? '編錄商物' : '新闢商物'}
            </h2>
            <p className="text-[0.6rem] uppercase tracking-[0.3em] opacity-40 mt-1">
              {modalType === 'delete' ? 'Removal Confirmation' : 'Product Registry Update'}
            </p>
          </div>
          <button onClick={closeModal} className="text-[#111111] opacity-30 hover:opacity-100 transition-kyoto">
            <span className="text-2xl font-light">✕</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-8">
          {modalType === 'delete' ? (
            <div className="py-12 flex flex-col items-center text-center">
              <span className="text-4xl text-[#984443] mb-6 animate-pulse">♢</span>
              <p className="font-serif text-xl mb-2 text-[#111111]">確定要將此產品從目錄中移除嗎？</p>
              <p className="text-sm opacity-50 italic">「{tempData.title}」</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* Image Column */}
              <div className="lg:col-span-4 space-y-6">
                <div>
                  <label className="block text-[0.65rem] uppercase tracking-[0.2em] font-bold opacity-40 mb-3">商品影像 (Primary)</label>
                  <div className="group relative w-full aspect-square bg-white border border-[#D1C7B7] rounded-sm overflow-hidden flex items-center justify-center shadow-inner">
                    {tempData.imageUrl ? (
                      <img src={tempData.imageUrl} alt="Preview" className="w-full h-full object-cover p-2" />
                    ) : (
                      <span className="text-[0.6rem] opacity-20">NO IMAGE</span>
                    )}
                    <input 
                      type="file" 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      onChange={uploadImage}
                      ref={fileInputRef}
                    />
                    <div className="absolute inset-0 bg-[#111111]/0 group-hover:bg-[#111111]/5 transition-kyoto flex items-center justify-center">
                       <span className="opacity-0 group-hover:opacity-100 text-[0.6rem] uppercase tracking-widest text-[#111111] font-bold bg-[#FAF9F6] px-3 py-1.5 shadow-sm border border-[#D1C7B7]">更換影像</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-[0.65rem] uppercase tracking-[0.2em] font-bold opacity-40">附加影像集 (Gallery)</label>
                  {(tempData.imagesUrl || ['']).map((url, idx) => (
                    <input
                      key={idx}
                      type="text"
                      className="w-full bg-white border border-[#D1C7B7] rounded-sm py-2 px-3 text-xs focus:ring-1 focus:ring-[#111111] outline-none transition-kyoto placeholder:opacity-30 italic"
                      placeholder={`影像網址 #${idx + 1}`}
                      value={url}
                      onChange={(e) => handleImageChange(idx, e.target.value)}
                    />
                  ))}
                </div>
              </div>

              {/* Info Column */}
              <div className="lg:col-span-8 space-y-8">
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-[0.65rem] uppercase tracking-[0.2em] font-bold opacity-40">商物標題</label>
                    <input
                      type="text"
                      name="title"
                      className="w-full bg-transparent border-b border-[#D1C7B7] py-2 text-lg font-serif outline-none focus:border-[#111111] transition-kyoto placeholder:opacity-30"
                      placeholder="請輸入商物名稱..."
                      value={tempData.title || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[0.65rem] uppercase tracking-[0.2em] font-bold opacity-40">分類</label>
                    <input
                      type="text"
                      name="category"
                      className="w-full bg-transparent border-b border-[#D1C7B7] py-2 text-sm outline-none focus:border-[#111111] transition-kyoto"
                      value={tempData.category || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[0.65rem] uppercase tracking-[0.2em] font-bold opacity-40">編制單位</label>
                    <input
                      type="text"
                      name="unit"
                      className="w-full bg-transparent border-b border-[#D1C7B7] py-2 text-sm outline-none focus:border-[#111111] transition-kyoto"
                      value={tempData.unit || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <label className="text-[0.65rem] uppercase tracking-[0.2em] font-bold opacity-40">原價</label>
                    <input
                      type="number"
                      name="origin_price"
                      className="w-full bg-transparent border-b border-[#D1C7B7] py-2 text-sm outline-none focus:border-[#111111] transition-kyoto"
                      value={tempData.origin_price}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[0.65rem] uppercase tracking-[0.2em] font-bold opacity-40">售價</label>
                    <input
                      type="number"
                      name="price"
                      className="w-full bg-transparent border-b border-[#D1C7B7] py-2 text-sm outline-none focus:border-[#111111] transition-kyoto"
                      value={tempData.price}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[0.65rem] uppercase tracking-[0.2em] font-bold opacity-40">當前庫存</label>
                    <input
                      type="number"
                      name="inventory"
                      className="w-full bg-transparent border-b border-[#D1C7B7] py-2 text-sm outline-none focus:border-[#111111] transition-kyoto"
                      value={tempData.inventory ?? ''}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[0.6rem] uppercase tracking-[0.4em] font-bold opacity-20 border-b border-[#D1C7B7]/30 pb-2">香道特性與場景</h4>
                  
                  <div className="space-y-2">
                    <label className="text-[0.65rem] uppercase tracking-[0.2em] font-bold opacity-40">產品總覽 (Description)</label>
                    <textarea
                      name="description"
                      rows="2"
                      className="w-full bg-white border border-[#D1C7B7] rounded-sm p-4 text-xs outline-none focus:border-[#111111] transition-kyoto"
                      value={tempData.description || ''}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {tempData.scenes.map((scene, idx) => (
                      <div key={idx} className="space-y-1">
                        <label className="text-[0.6rem] uppercase tracking-[0.2em] opacity-40">合宜場合 {idx + 1}</label>
                        <input
                          type="text"
                          className="w-full bg-white border border-[#D1C7B7] rounded-sm p-2 text-[0.7rem] outline-none focus:border-[#111111]"
                          value={scene}
                          onChange={(e) => handleSceneChange(idx, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <label className="text-[0.6rem] uppercase tracking-[0.2em] opacity-40 font-bold text-[#111111]">基調 Top</label>
                        <input type="text" name="top_smell" className="w-full bg-[#111111]/5 border-none p-2 text-[0.7rem] outline-none" value={tempData.top_smell || ''} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[0.6rem] uppercase tracking-[0.2em] opacity-40 font-bold text-[#984443]">中調 Heart</label>
                        <input type="text" name="heart_smell" className="w-full bg-[#111111]/5 border-none p-2 text-[0.7rem] outline-none" value={tempData.heart_smell || ''} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[0.6rem] uppercase tracking-[0.2em] opacity-40 font-bold text-[#735C00]">末調 Base</label>
                        <input type="text" name="base_smell" className="w-full bg-[#111111]/5 border-none p-2 text-[0.7rem] outline-none" value={tempData.base_smell || ''} onChange={handleInputChange} />
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        name="is_enabled"
                        className="sr-only"
                        checked={tempData.is_enabled || false}
                        onChange={handleInputChange}
                      />
                      <div className={`w-10 h-5 rounded-full transition-kyoto ${tempData.is_enabled ? 'bg-[#3A4D39]' : 'bg-[#D1C7B7]'}`}></div>
                      <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-kyoto ${tempData.is_enabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </div>
                    <span className="text-[0.65rem] uppercase tracking-[0.3em] font-bold opacity-60 group-hover:opacity-100 transition-kyoto">
                      {tempData.is_enabled ? '公開上架中' : '暫時封存'}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 p-8 border-t border-[#D1C7B7] bg-[#FAF9F6] flex justify-end gap-4">
          <button
            onClick={closeModal}
            className="px-8 py-2 text-[0.7rem] uppercase tracking-[0.2em] border border-[#D1C7B7] hover:bg-[#111111] hover:text-[#FAF9F6] transition-kyoto rounded-sm"
          >
            取消
          </button>
          <button
            onClick={modalType === 'delete' ? handleDelete : handleSubmit}
            disabled={isLoading}
            className={`px-10 py-2 text-[0.7rem] uppercase tracking-[0.2em] rounded-sm transition-kyoto shadow-sm ${
              modalType === 'delete' 
                ? 'bg-[#984443] text-white hover:bg-[#803332]' 
                : 'bg-[#111111] text-white hover:bg-[#984443]'
            } disabled:opacity-30`}
          >
            {isLoading ? '處理中...' : '確認執行'}
          </button>
        </div>
      </div>
    </div>
  );
}

