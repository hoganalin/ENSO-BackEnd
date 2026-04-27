import { useEffect, useState } from 'react';

// 偵測手機 + 平板（< Tailwind lg 1024px）。
// 用於 Recharts 等不吃 Tailwind responsive className 的元件。
export default function useIsBelowLg() {
  const [below, setBelow] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 1023px)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(max-width: 1023px)');
    const onChange = (e) => setBelow(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return below;
}
