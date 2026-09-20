import React from 'react';

// Empty states are the first-run experience, so they name the next action
// rather than reporting absence.
export default function EmptyState({ icon: Icon, title, hint, action }) {
  return (
    <div className="px-4 py-10 text-center">
      {Icon && (
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-surface-2 text-ink-subtle ring-1 ring-hairline/70">
          <Icon className="h-5 w-5" />
        </span>
      )}
      <p className="mt-3 text-body font-semibold text-ink">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-xs text-micro text-ink-subtle">{hint}</p>}
      {action && <div className="mt-3.5 flex justify-center">{action}</div>}
    </div>
  );
}
