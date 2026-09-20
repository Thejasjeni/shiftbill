import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LayoutDashboard, PlusCircle, ShoppingCart, Fuel, Menu } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';

/* ============================================================================
 * Liquid Glass tab bar — tap and drag, iOS-style.
 * Tap: the pod lands under the finger on touch-down (instant response), and
 * the tab commits on release with the full click.
 * Drag: the pod tracks the finger 1:1 (its transition is switched off while
 * dragging), tabs light up beneath it with rate-limited micro-ticks, and the
 * tab under the finger commits on release. Releasing outside the bar cancels
 * and the pod springs home.
 * Feedback: navigator.vibrate where supported (Android/Capacitor builds) and
 * a synthesized Web Audio click — no audio assets: a quiet tick on press, a
 * full click on commit, micro-ticks while scrubbing.
 * All visuals (blur, tint, hairline, shadow, pod glow, spring) live in
 * src/index.css under .glass-nav-*. Colours are the app's money semantics:
 * home=brand, sale=in (green), purchase=out (purple), expense=warn (amber).
 * ============================================================================ */

const TABS = [
  { id: 'home',        icon: LayoutDashboard, label: 'Home',         kind: 'nav',      accent: 'var(--color-brand)' },
  { id: 'addSale',     icon: PlusCircle,      label: 'Add Sale',     kind: 'sale',     accent: 'var(--color-in)'    },
  { id: 'addPurchase', icon: ShoppingCart,    label: 'Add Purchase', kind: 'purchase', accent: 'var(--color-out)'   },
  { id: 'expense',     icon: Fuel,            label: 'Expense',      kind: 'expense',  accent: 'var(--color-warn)'  },
  { id: 'menu',        icon: Menu,            label: 'Menu',         kind: 'menu',     accent: 'var(--color-ink)'   },
];

const vib = (ms) => { try { navigator.vibrate?.(ms); } catch { /* unsupported */ } };

/* Synthesized nav click. strong=false is the small press/scrub tick. */
let audioCtx;
function clickSound(strong) {
  try {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;
    // Attack: a fast triangle blip sliding down an octave — the crisp "tick".
    const osc = audioCtx.createOscillator();
    const oscGain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(strong ? 2100 : 1500, t);
    osc.frequency.exponentialRampToValueAtTime(700, t + 0.035);
    oscGain.gain.setValueAtTime(strong ? 0.14 : 0.05, t);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    osc.connect(oscGain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
    // Body: a 12ms noise burst through a lowpass — the soft "thock".
    const len = Math.floor(audioCtx.sampleRate * 0.012);
    const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const noise = audioCtx.createBufferSource();
    noise.buffer = buf;
    const lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = strong ? 3200 : 2400;
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.value = strong ? 0.18 : 0.06;
    noise.connect(lp).connect(noiseGain).connect(audioCtx.destination);
    noise.start(t);
  } catch { /* audio unavailable — stay silent */ }
}

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
  const downRef = useRef(null);        // { x0, startId, moved }
  const lastHoverRef = useRef(null);
  const lastTickRef = useRef(0);
  const [pod, setPod] = useState({ left: 0, width: 0, accent: TABS[0].accent });
  const [drag, setDrag] = useState(null); // { x, width, accent, hoverId, maxLeft }

  // Measure the committed tab's box relative to the pill; the pod springs there.
  const measure = useCallback(() => {
    const active = TABS.find(t => t.id === activeNavTab) ?? TABS[0];
    const el = tabRefs.current[active.id];
    if (!el) return;
    setPod({ left: el.offsetLeft, width: el.offsetWidth, accent: active.accent });
  }, [activeNavTab]);

  useLayoutEffect(measure, [measure]);

  // Re-measure when the box can change without a tab switch: window resize,
  // orientation, and the webfont finishing loading (labels change width).
  useEffect(() => {
    window.addEventListener('resize', measure, { passive: true });
    document.fonts?.ready?.then(measure).catch(() => {});
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  const tabUnder = (clientX) => {
    for (const tab of TABS) {
      const el = tabRefs.current[tab.id];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right) return { tab, el };
    }
    return null;
  };

  const commit = useCallback((tab) => {
    if (!tab) return;
    setActiveNavTab(tab.id);
    ({
      sale: setIsCheckoutOpen,
      purchase: setIsAddPurchaseOpen,
      expense: setIsAddExpenseOpen,
      menu: setIsMobileDrawerOpen,
    })[tab.kind]?.(true);
    clickSound(true);
    vib(10);
  }, [setActiveNavTab, setIsCheckoutOpen, setIsAddPurchaseOpen, setIsAddExpenseOpen, setIsMobileDrawerOpen]);

  /* --- pointer flow: down = land pod + tick; move = track finger; up = commit --- */
  const onPointerDown = (e) => {
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const pill = pillRef.current;
    const rect = pill.getBoundingClientRect();
    const hit = tabUnder(e.clientX);
    try { pill.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
    downRef.current = { x0: e.clientX, startId: hit?.tab.id ?? null, moved: false };
    if (!hit) return;
    const { tab, el } = hit;
    setDrag({
      x: el.offsetLeft + el.offsetWidth / 2,
      width: el.offsetWidth,
      accent: tab.accent,
      hoverId: tab.id,
      maxLeft: rect.width - 12 - el.offsetWidth,
    });
    clickSound(false);
    vib(4);
  };

  const onPointerMove = (e) => {
    const down = downRef.current;
    if (!down) return;
    if (!down.moved && Math.abs(e.clientX - down.x0) > 5) down.moved = true;
    if (!down.moved) return;
    const rect = pillRef.current.getBoundingClientRect();
    const hit = tabUnder(e.clientX);
    const width = hit ? hit.el.offsetWidth : (drag?.width ?? pod.width);
    const accent = hit ? hit.tab.accent : (drag?.accent ?? pod.accent);
    setDrag({
      x: e.clientX - rect.left,
      width,
      accent,
      hoverId: hit?.tab.id ?? null,
      maxLeft: rect.width - 12 - width,
    });
    if (hit && hit.tab.id !== lastHoverRef.current) {
      lastHoverRef.current = hit.tab.id;
      const now = performance.now();
      if (now - lastTickRef.current > 60) {
        lastTickRef.current = now;
        clickSound(false);
        vib(4);
      }
    }
  };

  const onPointerUp = (e) => {
    const down = downRef.current;
    downRef.current = null;
    lastHoverRef.current = null;
    setDrag(null); // pod springs to the committed tab (or home on cancel)
    if (!down) return;
    const hit = tabUnder(e.clientX);
    const target = hit?.tab ?? (down.moved ? null : TABS.find(t => t.id === down.startId));
    if (target) commit(target);
    // dragged and released outside the bar → cancel, nothing commits
  };

  const onPointerCancel = () => {
    downRef.current = null;
    lastHoverRef.current = null;
    setDrag(null);
  };

  const podStyle = drag
    ? { left: Math.max(0, Math.min(drag.maxLeft, drag.x - drag.width / 2)), width: drag.width, '--pod-accent': drag.accent }
    : { left: pod.left, width: pod.width, '--pod-accent': pod.accent };

  return (
    <nav className="glass-nav-bar" aria-label="Main navigation">
      <div
        className="glass-nav-pill"
        ref={pillRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div
          className={`glass-nav-pod${drag ? ' no-anim' : ''}`}
          style={podStyle}
          aria-hidden="true"
        />
        {TABS.map(tab => {
          const on = activeNavTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={node => { tabRefs.current[tab.id] = node; }}
              data-tab-id={tab.id}
              data-drag-hover={drag?.hoverId === tab.id ? 'true' : undefined}
              aria-current={on ? 'page' : undefined}
              onClick={(e) => { if (e.detail === 0) commit(tab); }} // keyboard only; pointer path commits on up
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
