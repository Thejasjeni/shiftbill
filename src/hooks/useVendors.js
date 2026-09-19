import { useCallback, useEffect, useState } from 'react';
import { subscribeVendors, insertVendor, refreshFromServer } from '../lib/firestoreApi';

// ---------------------------------------------------------------------------
// useVendors — live list of clients/suppliers, backed by Firestore.
// Persistence across refreshes comes free: each mount resubscribes, so the
// list always shows what the database holds (or its local cache).
// ---------------------------------------------------------------------------

export function useVendors() {
  const [vendors, setVendors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    return subscribeVendors(
      (rows) => {
        setVendors(rows);
        setIsLoading(false);
      },
      (message) => setError(message || 'Failed to load vendors')
    );
  }, []);

  // Submit handler for the persistent form. Works offline: the row lands in
  // Firestore's cache immediately and uploads when a connection is available.
  const addVendor = useCallback(async (vendor) => {
    setIsSaving(true);
    try {
      await insertVendor(vendor);
      return true;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { vendors, isLoading, error, isSaving, addVendor, refetch: refreshFromServer };
}
