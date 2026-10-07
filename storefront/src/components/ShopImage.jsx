import { useState } from 'react';
export default function ShopImage({ src, alt, ...props }) {
  const [failed, setFailed] = useState('');
  return src && failed !== src ? <img src={src} alt={alt} onError={() => setFailed(src)} {...props} /> : <div className="shop-image-fallback" role="img" aria-label={`${alt}，圖片暫時無法載入`}>ENSO<span>{alt}</span></div>;
}
