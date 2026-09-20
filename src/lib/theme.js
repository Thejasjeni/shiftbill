// The appearance preference.
//
// Device-local by design: which palette suits a phone in a dark shop is a
// property of the device, not of the business, so this never travels to the
// shared profile and needs no backend. The palette itself lives in
// index.css as a second block of the same token names; this only remembers
// the choice and puts the attribute on <html> that switches to it.

// Also read by the inline pre-paint guard in index.html <head>, which replays
// this same key as 'swiftbill.theme' before the first paint. Changing the key
// means changing that line too; nothing else knows it.
const STORAGE_KEY = 'swiftbill.theme';

/** What the Settings control offers, in the order it shows them. */
export const THEMES = [
  { id: 'light', label: 'Light' },
  { id: 'oled', label: 'OLED dark' }
];

const isOled = (id) => id === 'oled';

export function getStoredTheme() {
  try {
    return isOled(localStorage.getItem(STORAGE_KEY)) ? 'oled' : 'light';
  } catch {
    // Private mode or a blocked store: the default palette, not a crash.
    return 'light';
  }
}

/** Puts the chosen palette on the document and returns what it applied. */
export function applyTheme(id) {
  const theme = isOled(id) ? 'oled' : 'light';
  if (theme === 'oled') document.documentElement.dataset.theme = 'oled';
  else delete document.documentElement.dataset.theme;

  // The browser's own chrome (Android status bar, installed-app title bar)
  // takes a colour from the meta tag. Read it off the palette's darkest
  // chrome token so the two cannot drift apart.
  const meta = document.querySelector('meta[name="theme-color"]');
  const chrome = getComputedStyle(document.documentElement).getPropertyValue('--color-brand-deep').trim();
  if (meta && chrome) meta.content = chrome;

  return theme;
}

export function saveTheme(id) {
  const theme = applyTheme(id);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Still applied for this session; it just will not be remembered.
  }
  return theme;
}

/**
 * Applies the remembered palette. Called once before the first render so a
 * device set to dark never shows a light frame on load.
 */
export function applyStoredTheme() {
  return applyTheme(getStoredTheme());
}
