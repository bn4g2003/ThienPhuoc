'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Component tạo hiệu ứng chuyển trang mượt mà
 * Giúp trang không bị "đơ" khi chuyển
 */
export default function FastPageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    // Bắt đầu transition
    setIsTransitioning(true);

    // Kết thúc transition sau 150ms
    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div
      className={`transition-opacity duration-150 ${
        isTransitioning ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {children}
    </div>
  );
}
