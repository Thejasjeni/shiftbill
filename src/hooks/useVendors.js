import { useCallback, useEffect, useState } from 'react';
import { fetchVendors, insertVendor } from '../lib/vendorsApi';

// ---------------------------------------------------------------------------
// useVendors — loads vendors from Supabase on mount and keeps the list fresh.
// Persistence across refreshes comes free: every mount re-fetches, so what
// shows in the UI is whatever is in the database.
// ---------------------------------------------------------------------------

export function useVendors() {
  const [vendors, setVendors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const rows = await fetchVendors();
      setVendors(rows);
    } catch (err) {
      setError(err.message || 'Failed to load vendors');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Submit handler for the persistent form. Returns true on success.
  // Pass the vendor object through untouched — insertVendor normalizes
  // both gst_no (snake) and gstNo (camel) spellings.
  const addVendor = useCallback(async (vendor) => {
    setIsSaving(true);
    try {
      const row = await insertVendor(vendor);
      setVendors(prev => [row, ...prev]);
      return true;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { vendors, isLoading, error, isSaving, addVendor, refetch: load };
}
