import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface RouterContextType {
  path: string;
  search: string;
  navigate: (to: string) => void;
  params: Record<string, string>;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  const [currentSearch, setCurrentSearch] = useState<string>(() => {
    return window.location.search || '';
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
      setCurrentSearch(window.location.search || '');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((to: string) => {
    try {
      // Split path and query/hash
      const [pathOnly, rawQuery] = to.split('?');
      const searchPart = rawQuery ? `?${rawQuery.split('#')[0]}` : '';
      const cleanPath = pathOnly || '/';

      if (window.location.pathname !== cleanPath || window.location.search !== searchPart) {
        window.history.pushState({}, '', to);
      }

      setCurrentPath(cleanPath);
      setCurrentSearch(searchPart);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      console.warn('Navigation notice:', e);
      setCurrentPath(to);
    }
  }, []);

  // Parse path parameters for dynamic routes like /book/:bookId and /read/:bookId
  const params: Record<string, string> = {};
  if (currentPath.startsWith('/book/')) {
    const extracted = currentPath.replace('/book/', '').split('?')[0].split('#')[0];
    params.bookId = extracted;
    params.id = extracted;
  } else if (currentPath.startsWith('/read/')) {
    const extracted = currentPath.replace('/read/', '').split('?')[0].split('#')[0];
    params.bookId = extracted;
    params.id = extracted;
  }

  return (
    <RouterContext.Provider value={{ path: currentPath, search: currentSearch, navigate, params }}>
      {children}
    </RouterContext.Provider>
  );
};

export const useRouter = (): RouterContextType => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
};
