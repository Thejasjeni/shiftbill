import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LayoutDashboard, PlusCircle, ShoppingCart, Fuel, Menu } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';

/* ============================================================================
 * Liquid Glass tab bar — hand-rolled CSS + one measurement effect.
 * All visuals (blur, tint, hairline, shadow, pod glow, spring) are tuned in
 * src/index.css under .glass-nav-*. This file only measures the active tab's
 * box and hands the pod its px position; CSS does the motion.
 * Colours are the app's own money semantics, same as the rest of the UI:
 * home=brand, sale=in (green), purchase=out (purple), expense=warn (amber).
 * ============================================================================ */

const TABS = [
  { id: 'home',        icon: LayoutDashboard, label: 'Home',         kind: 'nav',      accent: 'var(--color-brand)', rest: 'muted'  },
  { id: 'addSale',     icon: PlusCircle,      label: 'Add Sale',     kind: 'sale',     accent: 'var(--color-in)',    rest: 'accent' },
  { id: 'addPurchase', icon: ShoppingCart,    label: 'Add Purchase', kind: 'purchase', accent: 'var(--color-out)',   rest: 'accent' },
  { id: 'expense',     icon: Fuel,            label: 'Expense',      kind: 'expense',  accent: 'var(--color-warn)',  rest: 'accent' },
  { id: 'menu',        icon: Menu,            label: 'Menu',         kind: 'menu',     accent: 'var(--color-ink)',   rest: 'muted'  },
];

const vib = (ms = 6) => { try { navigator.vibrate?.(ms); } catch { /* unsupported */ } };

export default function GlassNav() {
  const {
    activeNavTab,
    setActiveNavTab,
    setIsCheckoutOpen,
    setIsAddPurchaseOpen,
    setIsAddExpenseOpen,
    setIsMobileDrawerOpen,
  } = useDashboard();

  const pillRef = useRef(null);
  const tabRefs = useRef({});
  const [pod, setPod] = useState({ left: 0, width: 0, accent: TABS[0].accent });

  // Measure the active tab's box relative to the pill; the pod springs there.
  const measure = useCallback(() => {
    const active = TABS.find(t => t.id === activeNavTab) ?? TABS[0];
    const pill = pillRef.current;
    const btn = tabRefs.current[active.id];
    if (!pill || !btn) return;
    setPod({ left: btn.offsetLeft, width: btn.offsetWidth, accent: active.accent });
  }, [activeNavTab]);

  useLayoutEffect(measure, [measure]);

  // Re-measure when the box can change without a tab switch: window resize,
  // orientation, and the webfont finishing loading (labels change width).
  useEffect(() => {
    window.addEventListener('resize', measure, { passive: true });
    document.fonts?.ready?.then(measure).catch(() => {});
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  const press = (tab) => {
    vib();
    setActiveNavTab(tab.id);
    ({
      sale: setIsCheckoutOpen,
      purchase: setIsAddPurchaseOpen,
      expense: setIsAddExpenseOpen,
      menu: setIsMobileDrawerOpen,
    })[tab.kind]?.(true);
  };

  return (
    <nav className="glass-nav-bar" aria-label="Main navigation">
      <div className="glass-nav-pill" ref={pillRef}>
        <div
          className="glass-nav-pod"
          style={{ left: pod.left, width: pod.width, '--pod-accent': pod.accent }}
          aria-hidden="true"
        />
        {TABS.map(tab => {
          const on = activeNavTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={node => { tabRefs.current[tab.id] = node; }}
              data-tab-id={tab.id}
              data-rest={tab.rest}
              aria-current={on ? 'page' : undefined}
              onClick={() => press(tab)}
              style={{ '--tab-accent': tab.accent }}
              className="glass-nav-tab"
            >
              <tab.icon className="glass-nav-icon" />
              <span className="glass-nav-label">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
