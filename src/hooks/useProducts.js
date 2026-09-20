import { useEffect, useState } from 'react';
import { subscribeInventory, toProductShape } from '../lib/firestoreApi';
import { useAuthUser } from '../lib/auth';

// ---------------------------------------------------------------------------
// useProducts — live view of the product catalog for pickers.
// The first snapshot comes from Firestore's local cache, so the picker still
// offers the last-known catalog when there is no connection.
// ---------------------------------------------------------------------------

export function useProducts() {
  const user = useAuthUser();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    return subscribeInventory(
      (rows) => {
        setProducts(rows.map(toProductShape));
        setIsLoading(false);
      },
      // Null means the read recovered; only a message is an error, so the
      // picker never reports a failure while it is in fact showing the catalog.
      (message) => setError(message || null)
    );
    // Re-subscribes on sign-in/out so the catalog matches who is signed in.
  }, [user?.uid]);

  return { products, isLoading, error };
}
