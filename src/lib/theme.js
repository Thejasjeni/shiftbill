// The app is OLED dark only — there is no light mode to switch to.
// The palette lives in index.css as the only token block; this module only
// guarantees the <html> attribute and the browser chrome meta tag are set
// before the first paint, so a dark device never flashes a light frame.

/** Puts the OLED palette on the document and returns 'oled'. */
export function applyTheme() {
  document.documentElement.dataset.theme = 'oled';

  // The browser's own chrome (Android status bar, installed-app title bar)
  // takes a colour from the meta tag. Read it off the palette's darkest
  // chrome token so the two cannot drift apart.
  const meta = document.querySelector('meta[name="theme-color"]');
  const chrome = getComputedStyle(document.documentElement).getPropertyValue('--color-brand-deep').trim();
  if (meta && chrome) meta.content = chrome;

  return 'oled';
}

/**
 * Applies OLED before the first render so a dark device never flashes light.
 */
export function applyStoredTheme() {
  return applyTheme();
}
