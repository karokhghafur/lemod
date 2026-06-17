import { useState, useEffect, useCallback } from 'react';

const MOBILE_BREAKPOINT = 768;

function getIsMobile() {
  return typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT;
}

export function useSidebar() {
  const [isMobile, setIsMobile] = useState(getIsMobile);
  const [sidebarOpen, setSidebarOpen] = useState(() => !getIsMobile());

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const closeSidebar = useCallback(() => {
    if (window.innerWidth <= MOBILE_BREAKPOINT) setSidebarOpen(false);
  }, []);

  const toggleSidebar = useCallback(() => setSidebarOpen((open) => !open), []);

  return { sidebarOpen, closeSidebar, toggleSidebar, isMobile };
}
