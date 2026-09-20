// One treatment per control, shared by every form and dialog in the app.
// Components import these instead of re-deriving the same ten utility classes,
// so the look of a text field, a button or a dialog header changes here.

export const FIELD =
  'w-full rounded-[var(--radius-control)] bg-surface px-3 py-2 text-body text-ink ring-1 ring-hairline/70 placeholder:text-ink-subtle transition-shadow focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/40';

export const LABEL = 'mb-1 block text-micro font-bold uppercase tracking-wide text-ink-muted';

export const HINT = 'mt-1 text-micro text-ink-subtle';

const BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-control)] font-bold transition-all active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50';

/** Button treatments. `primary` is the one action a dialog is for. */
export const BUTTON = {
  primary: `${BASE} bg-[var(--color-brand)] px-4 py-2.5 text-body text-white shadow-e1 hover:opacity-90`,
  success: `${BASE} bg-[var(--color-in)] px-4 py-2.5 text-body text-white shadow-e2 hover:opacity-95`,
  secondary: `${BASE} bg-surface px-4 py-2.5 text-body text-ink-muted ring-1 ring-hairline/70 hover:bg-surface-2`,
  quiet: `${BASE} px-3 py-1.5 text-micro text-ink-muted hover:bg-surface-2 hover:text-ink`,
  danger: `${BASE} px-3 py-1.5 text-micro text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10`
};

/** Dialog chrome. `sheet` dialogs rise from the bottom on phones. */
export const DIALOG = {
  overlay: 'fixed inset-0 z-50 flex items-center justify-center bg-scrim p-3 backdrop-blur-sm animate-fadeIn sm:p-4',
  overlaySheet: 'fixed inset-0 z-50 flex items-end justify-center bg-scrim backdrop-blur-sm animate-fadeIn sm:items-center sm:p-4',
  // overflow-hidden so the dark header cannot paint square corners over the
  // card's rounding
  card: 'w-full overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-e3',
  cardSheet: 'w-full overflow-hidden rounded-t-[var(--radius-card)] bg-surface shadow-e3 sm:rounded-[var(--radius-card)]',
  header: 'flex items-center justify-between gap-2 bg-[var(--color-brand-deep)] p-4 text-white',
  headerSheet: 'flex items-center justify-between gap-2 rounded-t-[var(--radius-card)] bg-[var(--color-brand-deep)] p-4 text-white',
  icon: 'h-5 w-5 text-[var(--color-brand-bright)]',
  title: 'text-title font-bold',
  close: 'rounded-[var(--radius-control)] p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white cursor-pointer',
  body: 'space-y-4 p-5',
  footer: 'flex items-center gap-3 pt-1'
};
