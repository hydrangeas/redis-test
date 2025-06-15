import { useNavigate, useLocation } from 'react-router-dom';
import { useCallback } from 'react';

interface NavigationOptions {
  replace?: boolean;
  state?: any;
  preserveQuery?: boolean;
}

export const useNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navigateTo = useCallback(
    (path: string, options?: NavigationOptions) => {
      const { replace = false, state, preserveQuery = false } = options || {};

      let targetPath = path;
      
      // クエリパラメータを保持
      if (preserveQuery && location.search) {
        targetPath = `${path}${location.search}`;
      }

      navigate(targetPath, { replace, state });
    },
    [navigate, location.search]
  );

  const goBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const goForward = useCallback(() => {
    navigate(1);
  }, [navigate]);

  return {
    navigateTo,
    goBack,
    goForward,
    currentPath: location.pathname,
    currentQuery: location.search,
    currentHash: location.hash,
  };
};