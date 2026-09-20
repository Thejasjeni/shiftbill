import React from 'react';

// Tones map to the reserved semantic colours: money direction, warning, danger,
// or plain. Free-form Tailwind colours in a badge are how a palette drifts.
const TONE = {
  neutral: 'bg-surface-2 text-ink-muted ring-hairline/70',
  brand: 'bg-[var(--color-brand)]/10 text-[var(--color-brand)] ring-[var(--color-brand)]/20',
  in: 'bg-[var(--color-in)]/10 text-[var(--color-in)] ring-[var(--color-in)]/20',
  out: 'bg-[var(--color-out)]/10 text-[var(--color-out)] ring-[var(--color-out)]/20',
  warn: 'bg-[var(--color-warn)]/12 text-[var(--color-warn)] ring-[var(--color-warn)]/25',
  danger: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] ring-[var(--color-danger)]/20'
};

export default function Badge({ tone = 'neutral', className = '', children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-micro font-bold ring-1 ${
        TONE[tone] || TONE.neutral
      } ${className}`}
    >
      {children}
    </span>
  );
}
