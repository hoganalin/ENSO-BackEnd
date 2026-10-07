import { useState } from 'react';

import { getDemoImageVariant } from '../../service/demoProductImages';

export default function ProductImage({ src, alt, variant = 'full', className = '', ...props }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const isDemo = typeof document !== 'undefined' &&
    document.cookie.split('; ').includes('myToken=enso-demo-token');
  const displaySrc = isDemo ? getDemoImageVariant(src, variant) : src;

  if (!src || failedSrc === displaySrc) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center bg-[#efe6e1] text-center text-[0.7rem] font-semibold tracking-[0.08em] text-[#53607a] ${className}`}
        role="img"
        aria-label={`${alt || '商品'}圖片暫時無法顯示`}
      >
        {src ? '圖片無法載入' : '尚未提供圖片'}
      </div>
    );
  }

  return (
    <img
      {...props}
      src={displaySrc}
      decoding="async"
      alt={alt || '商品圖片'}
      className={className}
      onError={() => setFailedSrc(displaySrc)}
    />
  );
}
