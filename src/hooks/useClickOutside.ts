import { useEffect, useRef, useCallback } from 'react';

export function useClickOutside<T extends HTMLElement>(handler: () => void) {
  const ref = useRef<T>(null);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const stableHandler = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) {
      handlerRef.current();
    }
  }, []);

  useEffect(() => {
    // Delay by one tick so the click that opened this component
    // doesn't immediately trigger the outside-click handler.
    const timer = window.setTimeout(() => {
      document.addEventListener('mousedown', stableHandler);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('mousedown', stableHandler);
    };
  }, [stableHandler]);

  return ref;
}
