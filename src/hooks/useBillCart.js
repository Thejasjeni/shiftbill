import { useMemo, useState } from 'react';

// The bill's lines. This hook owns them — the sheet only shows them, the money
// block and the printed document read them.
//
// Lines are stored as the item's own prices; what a line actually costs is
// derived at render from the current price list. Switching list is therefore
// idempotent: no compounding 0.85 multipliers, no stale rate left behind.
export default function useBillCart(catalogue, tier) {
  const [lines, setLines] = useState([]);

  const add = (item) => {
    setLines((prev) => {
      const existing = prev.find((line) => line.id === item.id);
      if (existing) {
        return prev.map((line) =>
          line.id === item.id ? { ...line, quantity: line.quantity + 1 } : line
        );
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.item_name || item.name,
          retail_price: Number(item.retail_price || item.price || 0),
          wholesale_price: Number(item.wholesale_price || (item.retail_price || item.price || 0) * 0.85),
          quantity: 1
        }
      ];
    });
  };

  const remove = (id) => setLines((prev) => prev.filter((line) => line.id !== id));

  // Dropping to zero removes the line, so the minus button is also a way out
  const setQty = (id, delta) => {
    setLines((prev) =>
      prev
        .map((line) => {
          if (line.id !== id) return line;
          const quantity = line.quantity + delta;
          return quantity > 0 ? { ...line, quantity } : null;
        })
        .filter(Boolean)
    );
  };

  const clear = () => setLines([]);

  const priced = useMemo(
    () => lines.map((line) => {
      const rate = rateFor(line, tier, catalogue);
      return { ...line, rate, total: rate * line.quantity };
    }),
    [lines, tier, catalogue]
  );

  return { lines: priced, add, remove, setQty, clear };
}

// The item's own stored prices win; the catalogue is consulted only for what the
// line was picked from, so a saved bill keeps the rate it was billed at.
function rateFor(line, tier, catalogue) {
  const source = catalogue.find((item) => item.id === line.id || item.item_name === line.name);
  if (tier === 'wholesale') {
    return Number(source?.wholesale_price ?? line.wholesale_price ?? (line.retail_price || line.price || 0) * 0.85) || 0;
  }
  return Number(source?.retail_price ?? line.retail_price ?? line.price ?? line.rate ?? 0) || 0;
}
