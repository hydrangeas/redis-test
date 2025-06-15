import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
  interface Window {
    gtag?: (command: string, targetId: string, config?: any) => void;
  }
}

export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    // Google Analytics
    if (
      import.meta.env.VITE_ENABLE_ANALYTICS === 'true' &&
      typeof window.gtag === 'function' &&
      import.meta.env.VITE_GA_TRACKING_ID
    ) {
      window.gtag('config', import.meta.env.VITE_GA_TRACKING_ID, {
        page_path: location.pathname + location.search,
      });
    }

    // カスタムイベント
    window.dispatchEvent(
      new CustomEvent('pageview', {
        detail: {
          path: location.pathname,
          search: location.search,
          hash: location.hash,
        },
      })
    );
  }, [location]);
};