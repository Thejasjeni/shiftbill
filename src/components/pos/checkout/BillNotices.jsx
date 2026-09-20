import React from 'react';
import Notice from '../../ui/Notice';
import { outOfStockLines } from '../../../utils/posCatalogue';

// What the seller must be told about the bill in front of them: a line the
// catalogue says is gone, or a scan that arrived before the catalogue did.
export default function BillNotices({ lines, catalogue, unmatchedScan, isCatalogueLoaded }) {
  const outOfStock = outOfStockLines(lines, catalogue);

  return (
    <>
      {outOfStock.length > 0 && (
        <Notice>
          {outOfStock.map((line) => line.name).join(', ')}{' '}
          {outOfStock.length === 1 ? 'is' : 'are'} out of stock — restock it in
          Items, or bill it anyway if the count is stale.
        </Notice>
      )}

      {unmatchedScan && !isCatalogueLoaded && (
        <Notice>
          Nothing called “{unmatchedScan}” has loaded yet — the catalog is still
          arriving. Scan it again in a moment, or add it in Items first.
        </Notice>
      )}
    </>
  );
}
