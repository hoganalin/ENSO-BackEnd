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
  productModalRef,

  getData,
}) {
  const { showSuccess, showError } = useMessage();
  const fileInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);

  //tempData.scenes「整理成固定長度 3 的字串陣列」
  const normalizer = (value) => {
    if (Array.isArray(value)) {
      return value
        .slice(0, 3)
        .map((scene) => (scene == null ? '' : String(scene)));
    }
    return ['', '', ''];
  };

  const [tempData, setTempData] = useState(() => ({
    ...templateProduct,
    scenes: normalizer(templateProduct?.scenes),
  }));
  //新增useEffect
  useEffect(() => {
    setTempData({
      ...templateProduct,
      scenes: normalizer(templateProduct?.scenes),
    });
  }, [templateProduct]);

  const resetTempData = () => {
    setTempData({
      ...templateProduct,
      scenes: normalizer(templateProduct?.scenes),
    });
  };
  //處理副圖的url
  const handleImageChange = (index, value) => {
    setTempData((prevData) => {
      const newImages = [...prevData.imagesUrl];
      newImages[index] = value;

      // 填寫最後一個空輸入框時，自動新增空白輸入框
      if (
        value !== '' &&
        index === newImages.length - 1 &&
        newImages.length < 5
      ) {
        newImages.push('');
      }

      // 清空輸入框時，移除最後的空白輸入框
      if (
        value === '' &&
        newImages.length > 1 &&
        newImages[newImages.length - 1] === ''
      ) {
        newImages.pop();
      }

      return { ...prevData, imagesUrl: newImages };
    });
  };

  //新增附圖
  const handleAddImage = () => {
    setTempData((prevData) => {
      const newImages = [...prevData.imagesUrl]; //複製圖片陣列
      newImages.push('');
      //處理特定索引值的圖片網址
      return { ...prevData, imagesUrl: newImages }; //回傳陣列, 把imagesUrl更新
    });
  };
  //刪除附圖
  const handleRemoveImage = () => {
    setTempData((prevData) => {
      const newImages = [...prevData.imagesUrl]; //複製圖片陣列
      newImages.pop();
      return { ...prevData, imagesUrl: newImages }; //回傳陣列, 把imagesUrl更新
    });
  };
  // 建立一個清空檔案欄位的 function
  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // 將 value 設為空字串即可清空顯示的檔名
    }
  };

  const handleSceneChange = (index, value) => {
    setTempData((prevData) => {
      const nextScenes = normalizer(prevData.scenes); //preData指的是上一個state值, 是物件,格式為templateProduct
      nextScenes[index] = value; //把第 index 格改成使用者剛輸入的 value。
      return { ...prevData, scenes: nextScenes }; //回傳新的 state 物件,其他欄位不變，只更新 scenes。
    });
  };

  //更新產品資料 (新增或者編輯)
  const updateProductData = async (id) => {
    const payload = {
      ...tempData,
      origin_price: Number(tempData.origin_price),
      price: Number(tempData.price),
      is_enabled: tempData.is_enabled ? 1 : 0,
      scenes: normalizer(tempData.scenes),
      imagesUrl: tempData.imagesUrl.filter((url) => url !== ''),
    };
    setIsLoading(true);
    try {
      const response =
        modalType === 'edit'
          ? await updateAdminProduct(id, payload)
          : await createAdminProduct(payload);
      getData();
      showSuccess(response.data.message || '操作成功');
      resetTempData();
      closeModal();
    } catch (error) {
      showError(error.response?.data?.message || '操作失敗');
    } finally {
      setIsLoading(false);
    }
  };

  //刪除產品資料
  const deleteProduct = async (id) => {
    setIsLoading(true);
    try {
      await deleteAdminProduct(id);
      getData();
      resetTempData();
      closeModal();
      showSuccess('產品已刪除');
    } catch (error) {
      showError(error.response?.data?.message || '刪除失敗');
    } finally {
      setIsLoading(false);
    }
  };

  //上傳圖片檔案
  const uploadImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file-to-upload', file);
    setIsLoading(true);
    try {
      const response = await uploadAdminImage(formData);
      setTempData((pre) => ({ ...pre, imageUrl: response.data.imageUrl }));
      resetFileInput();
    } catch (error) {
      showError(error.response?.data?.message || '圖片上傳失敗');
    } finally {
      setIsLoading(false);
    }
  };
  //宣告modal 的欄位綁定值
  const modalHandleInputChange = (e) => {
    const { name, value, checked, type } = e.target;
    setTempData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  return (
    <div
      className="modal fade"
      id="productModal"
      tabIndex="-1"
      aria-labelledby="productModalLabel"
      aria-hidden="true"
      ref={productModalRef}
    >
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
          <div
            className={`modal-header bg-${modalType === 'delete' ? 'danger' : 'dark'} text-white`}
          >
            <h1
              className="modal-title fs-5 text-white fw-bold"
              id="productModalLabel"
            >
              {modalType === 'delete'
                ? '刪除'
                : modalType === 'edit'
                  ? '編輯'
                  : '新增'}
              產品
            </h1>
            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
              onClick={() => {
                resetTempData();
                closeModal();
              }}
            ></button>
          </div>
          <div className="modal-body">
            {modalType === 'delete' ? (
              <p className="text-danger">是否真的要刪除{tempData.title}</p>
            ) : (
              <div className="row">
                <div className="col-sm-4">
                  <div className="mb-2">
                    <div className="mb-3">
                      <label htmlFor="fileUpload" className="form-label">
                        上傳圖片
                      </label>
                      <input
                        className="form-control"
                        type="file"
                        name="file-to-upload"
                        id="fileUpload"
                        accept=".jpg,.jpeg,.png"
                        onChange={(e) => uploadImage(e)}
                        ref={fileInputRef} //綁定ref
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="imageUrl" className="form-label">
                        輸入圖片網址
                      </label>
                      <input
                        type="text"
                        id="imageUrl"
                        name="imageUrl"
                        className="form-control"
                        placeholder="請輸入圖片連結"
                        value={tempData.imageUrl || ''}
                        onChange={(e) => modalHandleInputChange(e)}
                      />
                    </div>
                    {tempData.imageUrl && (
                      <img
                        src={tempData.imageUrl}
                        className="img-fluid"
                        alt="主圖"
                      />
                    )}
                  </div>
                  {tempData.imagesUrl &&
                    tempData.imagesUrl.map((url, index) => (
                      <div key={index}>
                        <label
                          htmlFor={`imgUrl_${index}`}
                          className="form-label"
                        >
                          輸入圖片網址
                        </label>
                        <input
                          id={`imgUrl_${index}`}
                          type="text"
                          className="form-control"
                          onChange={(e) =>
                            handleImageChange(index, e.target.value)
                          }
                          placeholder={`圖片網址${index + 1}`}
                          value={url}
                        />
                        {url && (
                          <img src={url} className="img-fluid" alt="副圖" />
                        )}
                      </div>
                    ))}
                  {tempData.imagesUrl &&
                    tempData.imagesUrl.length < 5 &&
                    tempData.imagesUrl[tempData.imagesUrl.length - 1] !==
                      '' && (
                      <button
                        className="btn btn-outline-primary btn-sm d-block w-100"
                        onClick={handleAddImage}
                      >
                        新增圖片
                      </button>
                    )}
                  {tempData.imagesUrl && tempData.imagesUrl.length > 1 && (
                    <button
                      className="btn btn-outline-danger btn-sm d-block w-100"
                      onClick={handleRemoveImage}
                    >
                      刪除圖片
                    </button>
                  )}
                </div>
                <div className="col-sm-8">
                  <div className="row">
                    <div className="mb-3">
                      <label htmlFor="title" className="form-label">
                        標題
                      </label>
                      <input
                        type="text"
                        id="title"
                        name="title"
                        className="form-control"
                        placeholder="請輸入標題"
                        value={tempData.title || ''}
                        onChange={(e) => modalHandleInputChange(e)}
                      />
                    </div>
                  </div>
                  <div className="row">
                    <div className="mb-3 col-md-6">
                      <label htmlFor="category" className="form-label">
                        分類
                      </label>
                      <input
                        type="text"
                        id="category"
                        name="category"
                        className="form-control"
                        placeholder="分類"
                        value={tempData.category || ''}
                        onChange={(e) => modalHandleInputChange(e)}
                      />
                    </div>
                    <div className="mb-3 col-md-6">
                      <label htmlFor="unit" className="form-label">
                        單位
                      </label>
                      <input
                        type="text"
                        id="unit"
                        name="unit"
                        className="form-control"
                        placeholder="單位"
                        value={tempData.unit || ''}
                        onChange={(e) => modalHandleInputChange(e)}
                      />
                    </div>
                  </div>
                  <div className="row">
                    <div className="mb-3 col-md-6">
                      <label htmlFor="origin_price" className="form-label">
                        原價
                      </label>
                      <input
                        min="0"
                        type="number"
                        id="origin_price"
                        name="origin_price"
                        className="form-control"
                        placeholder="原價"
                        value={tempData.origin_price}
                        onChange={(e) => modalHandleInputChange(e)}
                      />
                    </div>
                    <div className="mb-3 col-md-6">
                      <label htmlFor="price" className="form-label">
                        售價
                      </label>
                      <input
                        type="number"
                        id="price"
                        name="price"
                        className="form-control"
                        placeholder="售價"
                        min="0"
                        value={tempData.price || ''}
                        onChange={(e) => modalHandleInputChange(e)}
                      />
                    </div>
                  </div>
                  <div className="row">
                    <div className="mb-3 col-md-6">
                      <label htmlFor="inventory" className="form-label">
                        庫存數量
                      </label>
                      <input
                        type="number"
                        id="inventory"
                        name="inventory"
                        className="form-control"
                        placeholder="庫存數量"
                        min="0"
                        value={tempData.inventory ?? ''}
                        onChange={(e) => modalHandleInputChange(e)}
                      />
                    </div>
                  </div>
                  <hr />

                  <div className="mb-3">
                    <label htmlFor="description" className="form-label">
                      產品描述
                    </label>
                    <textarea
                      name="description"
                      id="description"
                      className="form-control"
                      placeholder="請輸入產品描述"
                      value={tempData.description || ''}
                      onChange={(e) => modalHandleInputChange(e)}
                    ></textarea>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="content" className="form-label">
                      說明內容
                    </label>
                    <textarea
                      name="content"
                      id="content"
                      className="form-control"
                      placeholder="請輸入說明內容"
                      value={tempData.content || ''}
                      onChange={(e) => modalHandleInputChange(e)}
                    ></textarea>
                  </div>
                  {/* 客製化, 新增香煙特性 */}
                  <div className="mb-3">
                    <label htmlFor="feature" className="form-label">
                      香煙特性
                    </label>
                    <textarea
                      name="feature"
                      id="feature"
                      className="form-control"
                      placeholder="請輸入香煙特性"
                      value={tempData.feature || ''}
                      onChange={(e) => modalHandleInputChange(e)}
                    ></textarea>
                  </div>
                  {/* 客製化,新增適合場景 */}
                  <div className="mb-3">
                    <label className="form-label">適合場景</label>
                    <div className="row g-2">
                      {normalizer(tempData.scenes).map((scene, index) => (
                        <div className="col-md-4" key={index}>
                          <input
                            type="text"
                            className="form-control"
                            placeholder={`適合場景 ${index + 1}`}
                            value={scene}
                            onChange={(e) =>
                              handleSceneChange(index, e.target.value)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* 客製化,新增香味基調 */}
                  <div className="mb-3">
                    <label className="form-label">香味基調</label>
                    <div className="row g-2">
                      <div className="col-md-4">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="前調 Top"
                          name="top_smell"
                          id="top_smell"
                          value={tempData.top_smell || ''}
                          onChange={(e) => modalHandleInputChange(e)}
                        />
                      </div>
                      <div className="col-md-4">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="中調 Heart"
                          name="heart_smell"
                          id="heart_smell"
                          value={tempData.heart_smell || ''}
                          onChange={(e) => modalHandleInputChange(e)}
                        />
                      </div>
                      <div className="col-md-4">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="基調 Base"
                          name="base_smell"
                          id="base_smell"
                          value={tempData.base_smell || ''}
                          onChange={(e) => modalHandleInputChange(e)}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="form-check">
                      <input
                        name="is_enabled"
                        id="is_enabled"
                        className="form-check-input"
                        type="checkbox"
                        checked={tempData.is_enabled || false}
                        onChange={(e) => modalHandleInputChange(e)}
                      />
                      <label className="form-check-label " htmlFor="is_enabled">
                        是否啟用
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            {modalType === 'delete' ? (
              <button
                type="button"
                className="btn btn-danger"
                disabled={isLoading}
                onClick={() => deleteProduct(tempData.id)}
              >
                {isLoading ? '刪除中...' : '刪除'}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  data-bs-dismiss="modal"
                  onClick={() => {
                    resetTempData();
                    closeModal();
                  }}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={isLoading}
                  onClick={() => updateProductData(tempData.id)}
                >
                  {isLoading ? '儲存中...' : '確認'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
