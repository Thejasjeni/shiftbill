import React from 'react';
import { formatINR } from '../../utils/money';

// One currency policy for the whole product, owned by utils/money.js. Every
// amount renders through here, which is why digits align in columns (tabular
// figures) and why the app has exactly one rupee format.
const TONE = {
  neutral: 'text-ink',
  muted: 'text-ink-muted',
  in: 'text-[var(--color-in)]',
  out: 'text-[var(--color-out)]',
  warn: 'text-[var(--color-warn)]',
  danger: 'text-[var(--color-danger)]'
};

export default function Money({
  value = 0,
  tone = 'neutral',
  signed = false,
  className = ''
}) {
  const amount = Number(value) || 0;
  // 'auto' picks the money direction, so callers never hand-map sign to colour.
  const resolvedTone = tone === 'auto'
    ? (amount < 0 ? 'danger' : 'neutral')
    : tone;
  // A negative amount ALWAYS prints its minus — dropping it turns a ₹200 loss
  // into a ₹200 profit. `signed` only adds the explicit + for positives.
  const mark = amount > 0 && signed ? '+' : '';

  return (
    <span className={`num whitespace-nowrap font-semibold ${TONE[resolvedTone] || TONE.neutral} ${className}`}>
      {mark}
      {formatINR(amount)}
    </span>
  );
}
