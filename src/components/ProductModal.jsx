import { useState } from 'react';

import useMessage from '../hooks/useMessage';
import {
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  uploadAdminImage,
} from '../service/adminProducts';

import Dialog from './admin/Dialog';
import ProductImage from './admin/ProductImage';

const scenesOf = (value) =>
  Array.from({ length: 3 }, (_, index) => String(value?.[index] ?? ''));
const imagePurposes = [
  '包裝細節',
  '生活情境',
  '香氣或材質特寫',
  '比例與使用情境',
  '補充圖片',
];

export default function ProductModal({
  modalType,
  templateProduct,
  closeModal,
  getData,
}) {
  const { showSuccess } = useMessage();
  const [data, setData] = useState(() => ({
    ...templateProduct,
    scenes: scenesOf(templateProduct.scenes),
    imagesUrl: (templateProduct.imagesUrl || []).filter(Boolean).slice(0, 5),
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isDelete = modalType === 'delete';
  const isDemo = document.cookie
    .split('; ')
    .includes('myToken=enso-demo-token');
  const change = (event) => {
    const { name, type, checked, value } = event.target;
    setData((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };
  const changeGallery = (index, value) =>
    setData((previous) => ({
      ...previous,
      imagesUrl: previous.imagesUrl.map((url, i) =>
        i === index ? value : url
      ),
    }));
  const upload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 3 * 1024 * 1024
    ) {
      setError('請選擇 3 MB 以下的 JPG、PNG 或 WebP 圖片。');
      event.target.value = '';
      return;
    }
    setBusy(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file-to-upload', file);
      const response = await uploadAdminImage(formData);
      if (!response.data?.imageUrl || response.data.success === false)
        throw new Error('上傳未成功，請重新選擇圖片。');
      setData((previous) => ({
        ...previous,
        imageUrl: response.data.imageUrl,
      }));
    } catch (reason) {
      setError(
        reason.response?.data?.message ||
          reason.message ||
          '上傳失敗，請稍後重試。'
      );
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  };
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      let response;
      if (isDelete) response = await deleteAdminProduct(data.id);
      else {
        const payload = {
          ...data,
          title: data.title.trim(),
          category: data.category.trim(),
          origin_price: Number(data.origin_price),
          price: Number(data.price),
          inventory: Number(data.inventory || 0),
          is_enabled: data.is_enabled ? 1 : 0,
          scenes: scenesOf(data.scenes),
          imageUrl: (data.imageUrl || '').trim(),
          imagesUrl: data.imagesUrl
            .map((url) => url.trim())
            .filter(Boolean)
            .slice(0, 5),
        };
        response =
          modalType === 'edit'
            ? await updateAdminProduct(data.id, payload)
            : await createAdminProduct(payload);
      }
      if (response.data?.success === false)
        throw new Error(response.data.message || '儲存未成功');
      showSuccess(isDelete ? '商品已刪除' : '商品已儲存');
      closeModal();
      await getData();
    } catch (reason) {
      setError(
        reason.response?.data?.message ||
          reason.message ||
          '操作失敗，請檢查連線後再試。'
      );
    } finally {
      setBusy(false);
    }
  };
  const field = (name, label, type = 'text', required = false) => (
    <label className="workspace-field" key={name}>
      <span>
        {label}
        {required && '（必填）'}
      </span>
      <input
        name={name}
        type={type}
        value={data[name] ?? ''}
        onChange={change}
        required={required}
        {...(type === 'number'
          ? { min: 0, step: name === 'inventory' ? 1 : 'any' }
          : {})}
      />
    </label>
  );
  return (
    <Dialog
      title={
        isDelete ? '刪除商品' : modalType === 'edit' ? '編輯商品' : '新增商品'
      }
      onClose={closeModal}
      busy={busy}
      footer={
        <>
          <button
            className="enso-button-secondary"
            onClick={closeModal}
            disabled={busy}
          >
            取消
          </button>
          <button
            type="submit"
            form="product-editor"
            className={isDelete ? 'enso-button-danger' : 'enso-button-primary'}
            disabled={busy}
          >
            {busy ? '處理中…' : isDelete ? '確認刪除' : '儲存商品'}
          </button>
        </>
      }
    >
      <form id="product-editor" onSubmit={submit}>
        {error && (
          <p role="alert" className="workspace-error">
            {error}
          </p>
        )}
        {isDelete ? (
          <p>確定刪除「{data.title}」？刪除後將無法從商品列表復原。</p>
        ) : (
          <fieldset disabled={busy} className="product-editor-grid">
            <section className="product-media-editor" aria-label="商品圖片管理">
              <h3>商品主圖</h3>
              <div className="enso-image-frame">
                <ProductImage
                  variant="card"
                  src={data.imageUrl}
                  alt={(data.title || '商品') + '主圖預覽'}
                />
              </div>
              {field('imageUrl', '主圖網址')}
              <p className="workspace-hint">支援 https:// 網址或以斜線開頭的站內圖片路徑。</p>
              <label className="workspace-field">
                <span>上傳主圖</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={upload}
                />
              </label>
              <p className="workspace-hint">
                JPG、PNG、WebP，最大 3 MB。建議直式 4：5，保留完整包裝。
              </p>
              {isDemo && (
                <p className="workspace-hint">
                  展示模式上傳會回傳示範圖片，不會將所選檔案存入雲端。正式帳號才會呼叫圖片上傳服務。
                </p>
              )}
              <h3>
                商品圖庫 <small> {data.imagesUrl.length}／5</small>
              </h3>
              <p className="workspace-hint">
                主圖之外最多五張，可預覽、更換及移除。
              </p>
              {data.imagesUrl.map((url, index) => (
                <div className="gallery-editor-row" key={index}>
                  <div className="gallery-editor-preview">
                    <ProductImage
                      variant="thumb"
                      src={url}
                      alt={
                        (data.title || '商品') + imagePurposes[index] + '預覽'
                      }
                    />
                  </div>
                  <label className="workspace-field">
                    <span>{imagePurposes[index]}</span>
                    <input
                      type="text"
                      value={url}
                      placeholder="https://…"
                      onChange={(event) =>
                        changeGallery(index, event.target.value)
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="workspace-link"
                    aria-label={'移除圖庫第 ' + (index + 1) + ' 張'}
                    onClick={() =>
                      setData((previous) => ({
                        ...previous,
                        imagesUrl: previous.imagesUrl.filter(
                          (_, i) => i !== index
                        ),
                      }))
                    }
                  >
                    移除
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="enso-button-secondary"
                disabled={data.imagesUrl.length >= 5}
                onClick={() =>
                  setData((previous) => ({
                    ...previous,
                    imagesUrl: [...previous.imagesUrl, ''],
                  }))
                }
              >
                新增圖庫圖片
              </button>
            </section>
            <section className="product-info-editor" aria-label="商品資料">
              <h3>基本資料</h3>
              {field('title', '商品名稱', 'text', true)}
              <div className="workspace-field-grid">
                {field('category', '分類', 'text', true)}
                {field('unit', '販售單位')}
              </div>
              <div className="workspace-field-grid">
                {field('origin_price', '原價（NT$）', 'number', true)}
                {field('price', '售價（NT$）', 'number', true)}
                {field('inventory', '目前庫存', 'number', true)}
              </div>
              <label className="workspace-checkbox">
                <input
                  type="checkbox"
                  name="is_enabled"
                  checked={!!data.is_enabled}
                  onChange={change}
                />
                上架此商品
              </label>
              <h3>香氣與商品說明</h3>
              {['description', 'content', 'feature'].map((name, index) => (
                <label className="workspace-field" key={name}>
                  <span>
                    {['商品描述', '商品內容與原料', '商品特色'][index]}
                  </span>
                  <textarea
                    name={name}
                    rows={3}
                    value={data[name] || ''}
                    onChange={change}
                  />
                </label>
              ))}
              <div className="workspace-field-grid">
                {field('top_smell', '前調')}
                {field('heart_smell', '中調')}
                {field('base_smell', '後調')}
              </div>
              <h3>使用情境</h3>
              {data.scenes.map((scene, index) => (
                <label className="workspace-field" key={index}>
                  <span>情境 {index + 1}</span>
                  <input
                    value={scene}
                    onChange={(event) =>
                      setData((previous) => ({
                        ...previous,
                        scenes: previous.scenes.map((value, i) =>
                          i === index ? event.target.value : value
                        ),
                      }))
                    }
                  />
                </label>
              ))}
            </section>
          </fieldset>
        )}
      </form>
    </Dialog>
  );
}
