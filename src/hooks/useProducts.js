import { useEffect, useState } from 'react';
import { subscribeInventory, toProductShape } from '../lib/firestoreApi';

// ---------------------------------------------------------------------------
// useProducts — live view of the product catalog for pickers.
// The first snapshot comes from Firestore's local cache, so the picker still
// offers the last-known catalog when there is no connection.
// ---------------------------------------------------------------------------

export function useProducts() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    return subscribeInventory(
      (rows) => {
        setProducts(rows.map(toProductShape));
        setIsLoading(false);
      },
      (message) => setError(message || 'Failed to load products')
    );
  }, []);

  return { products, isLoading, error };
}
