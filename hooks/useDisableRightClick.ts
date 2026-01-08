
import { useEffect } from 'react';

/**
 * useDisableRightClick
 * Disables the context menu (right-click) on the page.
 * @param enabled Whether the restriction is active
 */
export function useDisableRightClick(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener('contextmenu', handleContextMenu);
    
    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [enabled]);
}
