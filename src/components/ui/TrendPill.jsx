import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// Percentage change against the same range one period earlier. Returns null
// only when BOTH periods are empty — a period that had activity where the
// previous one had none shows "new" rather than a fake +infinity or a silent
// blank, because "you started selling this month" is real information.
function percentChange(current = 0, previous = 0) {
  const now = Number(current) || 0;
  const before = Number(previous) || 0;
  if (before === 0) return now === 0 ? null : 'new';
  return ((now - before) / Math.abs(before)) * 100;
}

export default function TrendPill({ current, previous, label = 'vs last period' }) {
  const delta = percentChange(current, previous);
  if (delta === null) return null;

  const base = 'num inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-micro font-bold ring-1';

  if (delta === 'new') {
    return (
      <span
        className={`${base} bg-surface-2 text-ink-muted ring-hairline/70`}
        title={`Nothing in ${label} to compare with — this is the first period with activity`}
      >
        new
      </span>
    );
  }

  const flat = Math.abs(delta) < 0.05;
  const up = delta > 0;
  const tone = flat
    ? 'bg-surface-2 text-ink-muted ring-hairline/70'
    : up
      ? 'bg-[var(--color-in)]/10 text-[var(--color-in)] ring-[var(--color-in)]/20'
      : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] ring-[var(--color-danger)]/20';
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown;

  return (
    <span
      className={`${base} ${tone}`}
      title={`${up ? 'Up' : flat ? 'Flat' : 'Down'} ${Math.abs(delta).toFixed(1)}% ${label}`}
    >
      <Icon className="h-3 w-3" />
      {up ? '+' : ''}{delta.toFixed(1)}%
    </span>
  );
}
