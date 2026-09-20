// What this shop can bill from.
//
// The checkout may never invent a product, so the three questions that decide
// that — which items are billable right now, what a scanned barcode means, and
// which bill lines the catalogue says are gone — are answered here rather than
// in the sheet that shows them.

import { stockState } from './stock';

// Demo inventory used until the merchant adds real items. Module-level constants
// because the cart memo depends on them: neither case may hand it a fresh array
// on every render.
const NO_ITEMS = [];
const DEMO_INVENTORY = [
  { id: '1', item_name: 'Basmati Rice Premium 5kg', retail_price: 550, wholesale_price: 470, barcode: '8901234567890', stock: 45 },
  { id: '2', item_name: 'Cold Pressed Coconut Oil 1L', retail_price: 320, wholesale_price: 260, barcode: '8909876543210', stock: 80 },
  { id: '3', item_name: 'Organic Atta Flour 10kg', retail_price: 460, wholesale_price: 395, barcode: '8904567890123', stock: 60 }
];

// What an uncatalogued scan is worth: the shop has not priced it, so it lands at
// the ad-hoc rate below rather than being refused.
const UNCATALOGUED_PRICE = { retail: 150, wholesale: 120 };

// The items a bill may be written from. An empty list is not the same as an
// unread one: the demo list may stand in for a shop that has genuinely saved
// nothing yet, never for a catalogue that has not arrived — or a quick tap could
// bill a product nobody sells.
export function selectBillableCatalogue(items, isCatalogueLoaded) {
  if (items.length > 0) return items;
  return isCatalogueLoaded ? DEMO_INVENTORY : NO_ITEMS;
}

// What a scanned code is, against the catalogue as it stands. `unknown` means the
// catalogue has not answered yet — a miss is only really a miss once it has.
export function resolveScan(code, catalogue, isCatalogueLoaded) {
  const known = catalogue.find((item) => item.barcode === code || item.code === code);
  if (known) return { item: known };
  if (!isCatalogueLoaded) return { unknown: true };

  return {
    item: {
      id: `scanned-${Date.now()}`,
      item_name: `Scanned Item (${code.slice(-6)})`,
      retail_price: UNCATALOGUED_PRICE.retail,
      wholesale_price: UNCATALOGUED_PRICE.wholesale,
      barcode: code
    }
  };
}

// Lines on the bill the catalogue says have no stock left. Derived from the bill
// itself, so the warning appears the moment the line is added and clears when it
// is removed — the seller still decides, it just isn't a surprise later.
export function outOfStockLines(lines, catalogue) {
  return lines.filter((line) => {
    const item = catalogue.find((candidate) => candidate.id === line.id);
    return item && stockState(item) === 'out';
  });
}
