import { useCallback, useEffect, useState } from 'react';
import { fetchProducts } from '../lib/vendorsApi';

// ---------------------------------------------------------------------------
// useProducts — loads the active product list on mount for pickers.
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
      setError(err.message || 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { products, isLoading, error, refetch: load };
}
