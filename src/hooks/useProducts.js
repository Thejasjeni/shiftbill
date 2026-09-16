import { useCallback, useEffect, useState } from 'react';
import { fetchProducts, toProductShape } from '../lib/vendorsApi';
import { getLocalInventory } from '../database/offlineSync';

// ---------------------------------------------------------------------------
// useProducts — loads the active product list on mount for pickers.
// Online: fetches from Supabase. Offline/unconfigured: falls back to the
// locally cached inventory (IndexedDB) so the picker still works with the
// last-known catalog.
// ---------------------------------------------------------------------------

export function useProducts() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setProducts(await fetchProducts());
    } catch (err) {
      // Offline (or Supabase unreachable): use the local cache instead of
      // failing — the purchase flow must keep working without connectivity
      try {
        const cached = (await getLocalInventory()).map(toProductShape);
        if (cached.length > 0) {
          setProducts(cached);
        } else {
          setError(err.message || 'Failed to load products');
        }
      } catch {
        setError(err.message || 'Failed to load products');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { products, isLoading, error, refetch: load };
}
