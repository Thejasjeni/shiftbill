import { useEffect } from 'react';

// Opens the command palette from anywhere with ⌘K (macOS) or Ctrl+K.
// The palette itself owns focus, navigation and closing.
export function useCommandPalette(onOpen) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpen();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onOpen]);
}
