import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

// A status line about what is on screen: something the seller should know, not a
// dialog that blocks them. Tones are the reserved semantic colours, so a notice
// cannot drift into a new shade of amber.
const TONE = {
  warn: 'bg-[var(--color-warn)]/10 text-[var(--color-warn)] ring-[var(--color-warn)]/25',
  danger: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] ring-[var(--color-danger)]/25',
  success: 'bg-[var(--color-in)]/10 text-[var(--color-in)] ring-[var(--color-in)]/25'
};

export default function Notice({ tone = 'warn', role = 'status', className = '', children }) {
  const Icon = tone === 'success' ? CheckCircle2 : AlertTriangle;

  return (
    <p
      role={role}
      className={`flex items-start gap-2 rounded-[var(--radius-control)] px-3 py-2 text-micro ring-1 ${TONE[tone] || TONE.warn} ${className}`}
    >
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
