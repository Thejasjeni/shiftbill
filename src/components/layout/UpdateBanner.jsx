import React, { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { checkForUpdate, dismissUpdate, isAppInstall } from '../../lib/updateCheck';

// A quiet, non-blocking announcement that a newer APK exists. Only ever shows
// inside an installed Capacitor app (isAppInstall gates the effect); in a
// browser it renders nothing. The owner can dismiss it for this specific
// version — the next release nags again.
export default function UpdateBanner() {
  const [latestSha, setLatestSha] = useState(null);

  useEffect(() => {
    if (!isAppInstall()) return undefined;
    let alive = true;
    checkForUpdate().then(({ verdict, sha }) => {
      if (alive && verdict === 'show') setLatestSha(sha);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!latestSha) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[60] flex items-center gap-2 bg-[var(--color-brand)] px-4 py-2 text-white shadow-e2">
      <RefreshCw className="h-4 w-4 shrink-0" />
      <p className="flex-1 text-micro">A newer version of SwiftBill is available.</p>
      <a
        href="https://github.com/Thejasjeni/shiftbill/releases/latest"
        target="_blank"
        rel="noreferrer"
        className="shrink-0 rounded-[var(--radius-control)] bg-white/15 px-2.5 py-1 text-micro font-bold hover:bg-white/25"
      >
        Get update
      </a>
      <button
        type="button"
        aria-label="Dismiss update notice"
        onClick={() => {
          dismissUpdate(latestSha);
          setLatestSha(null);
        }}
        className="shrink-0 rounded-full p-1 hover:bg-white/10"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
