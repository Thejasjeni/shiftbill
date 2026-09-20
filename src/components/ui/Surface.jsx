import React from 'react';

// A surface = the app's one card. Screens compose this instead of re-deriving
// `bg-white border border-... rounded-2xl shadow-xs` in every file, which is how
// the app ended up with four slightly different card treatments.
const PADDING = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-4 sm:p-5'
};

const ELEVATION = {
  0: '',
  1: 'shadow-e1',
  2: 'shadow-e2',
  3: 'shadow-e3'
};

export default function Surface({
  as: Tag = 'section',
  padding = 'lg',
  elevation = 1,
  interactive = false,
  className = '',
  children,
  ...rest
}) {
  return (
    <Tag
      className={[
        'rounded-[var(--radius-card)] bg-surface ring-1 ring-hairline/70',
        PADDING[padding] || PADDING.md,
        ELEVATION[elevation] || ELEVATION[1],
        interactive
          ? 'cursor-pointer transition-[box-shadow,transform] duration-200 ease-[var(--ease-quint)] hover:-translate-y-0.5 hover:shadow-e2 active:scale-[0.995]'
          : '',
        className
      ].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </Tag>
  );
}
