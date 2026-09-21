// Update check for the installed Android app.
//
// The APK ships a snapshot of the web build, so it cannot update itself; the
// best it can do is tell the shop owner a newer APK exists. The current build's
// git SHA is baked in at build time (vite define __BUILD_SHA__), and the
// canonical "what is latest" answer is public/version.json served by the live
// site — regenerated before every build by scripts/generate-version.mjs.
//
// Behaviour contract:
// - checks at most once every 24h (SWEEP_KEY), and never blocks startup
// - any fetch or parse failure is silent: a shop with no internet must never
//   see an error because of an update check
// - a dismissed banner is remembered for that exact version only, so the next
//   release nags again
// - only meaningful on Capacitor (window.Capacitor); in a browser the live site
//   always IS the latest, so there is nothing to say

const SWEEP_KEY = 'swiftbill.updateCheck';
const DISMISS_KEY = 'swiftbill.updateDismissed';
const DAY_MS = 24 * 60 * 60 * 1000;

const readJson = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || {};
  } catch {
    return {};
  }
};

const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or a full store: the check simply re-runs next launch.
  }
};

/** True when the environment is an installed Capacitor app. */
export function isAppInstall() {
  return typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.();
}

/**
 * Decides whether the update banner should show right now.
 * Returns { verdict, sha } — sha is the latest published build when it was
 * fetched this call, null otherwise. Verdicts:
 *   'show'        newer build published, not yet dismissed
 *   'dismissed'   newer build, but the owner already dismissed this one
 *   'same'        this bundle is the latest
 *   'unavailable' not an app install, throttled, or offline/unreadable
 */
export async function checkForUpdate() {
  if (!isAppInstall()) return { verdict: 'unavailable', sha: null };

  const last = readJson(SWEEP_KEY);
  if (last.at && Date.now() - last.at < DAY_MS) return { verdict: 'unavailable', sha: null };

  let latest = null;
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (typeof data.sha === 'string' && data.sha) latest = data.sha;
    }
  } catch {
    // Offline or blocked: stay silent below.
  }
  if (!latest) return { verdict: 'unavailable', sha: null };

  writeJson(SWEEP_KEY, { at: Date.now(), latest });

  if (latest === __BUILD_SHA__) return { verdict: 'same', sha: latest };

  const dismissed = readJson(DISMISS_KEY);
  if (dismissed.sha === latest) return { verdict: 'dismissed', sha: latest };

  return { verdict: 'show', sha: latest };
}

/** Records that the shop owner dismissed this particular newer version. */
export function dismissUpdate(latestSha) {
  writeJson(DISMISS_KEY, { sha: latestSha });
}

/** The SHA this bundle was built from (vite define). */
export function buildSha() {
  return __BUILD_SHA__;
}
