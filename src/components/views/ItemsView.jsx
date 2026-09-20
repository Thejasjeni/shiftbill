import React, { useState } from 'react';
import { Package, Plus, Search, X, PackagePlus, Pencil, Barcode as BarcodeIcon, Loader2 } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { stockState, thresholdOf, DEFAULT_LOW_STOCK_THRESHOLD } from '../../utils/stock';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';
import Money from '../ui/Money';
import Surface from '../ui/Surface';
import { DIALOG, FIELD, LABEL } from '../ui/controls';
import BarcodeScannerModal from '../pos/BarcodeScannerModal';

// Badge pair for one item's stock state, shared by the card and anywhere else
// that shows it.
function StockBadge({ item }) {
  const state = stockState(item);
  if (state === 'ok') return null;
  return (
    <Badge tone={state === 'out' ? 'danger' : 'warn'}>
      {state === 'out' ? 'Out of stock' : `Low stock · ≤ ${thresholdOf(item)} ${item.unit || 'Pcs'}`}
    </Badge>
  );
}

// The stock line's tone carries the same warning the badge does.
const STOCK_TONE = {
  out: 'text-[var(--color-danger)]',
  low: 'text-[var(--color-warn)]',
  ok: 'text-ink-muted'
};

export default function ItemsView() {
  const { currentData, setIsCheckoutOpen, upsertItem } = useDashboard();
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // null = add mode
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [unit, setUnit] = useState('Pcs');
  const [barcode, setBarcode] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState(String(DEFAULT_LOW_STOCK_THRESHOLD));

  const openAddModal = () => {
    setName(''); setCode(''); setPrice(''); setStock(''); setBarcode(''); setUnit('Pcs');
    setLowStockThreshold(String(DEFAULT_LOW_STOCK_THRESHOLD));
    setEditingItem(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (item) => {
    setName(item.name || item.item_name || '');
    setCode(item.code || '');
    setPrice(String(item.price ?? item.retail_price ?? ''));
    setStock(String(item.stock ?? item.stock_quantity ?? ''));
    setBarcode(item.barcode || '');
    setUnit(item.unit || 'Pcs');
    setLowStockThreshold(String(item.lowStockThreshold ?? thresholdOf(item)));
    setEditingItem(item);
    setIsAddModalOpen(true);
  };

  const handleCreateItem = async (e) => {
    e.preventDefault();
    if (!name.trim() || !price) return;

    setIsSubmitting(true);
    try {
      await upsertItem({
        name: name.trim(),
        code: code.trim() || undefined,
        price: Number(price),
        stock: Number(stock || 0),
        unit,
        barcode: barcode.trim() || null,
        lowStockThreshold: Number(lowStockThreshold) || 0
      }, editingItem?.id || null);
      setIsAddModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = currentData.items.filter(i =>
    String(i.name || '').toLowerCase().includes(search.toLowerCase()) ||
    String(i.code || '').toLowerCase().includes(search.toLowerCase()) ||
    String(i.barcode || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 text-left">
      {/* Header */}
      <Surface className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-title font-bold text-ink">Items &amp; inventory</h1>
          <p className="text-micro text-ink-muted">Stock levels, prices, units, barcodes and item codes</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-1.5 rounded-[var(--radius-control)] bg-[var(--color-brand)] px-4 py-2 text-body font-semibold text-white shadow-e1 transition-opacity hover:opacity-90 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add item</span>
        </button>
      </Surface>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-subtle" />
        <input
          type="text"
          placeholder="Search items by name, SKU or barcode…"
          aria-label="Search items"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${FIELD} pl-9`}
        />
      </div>

      {/* Items Grid */}
      {filtered.length === 0 ? (
        <Surface padding="none">
          <EmptyState
            icon={Package}
            title={currentData.items.length === 0 ? 'No items yet' : 'Nothing matches that search'}
            hint={
              currentData.items.length === 0
                ? 'Add your first product to bill it in one tap and get warned before it runs out.'
                : 'Try a different name, SKU or barcode.'
            }
            action={
              currentData.items.length === 0 ? (
                <button
                  onClick={openAddModal}
                  className="rounded-[var(--radius-control)] bg-[var(--color-brand)]/10 px-3 py-1.5 text-micro font-bold text-[var(--color-brand)] transition-colors hover:bg-[var(--color-brand)]/15 cursor-pointer"
                >
                  + Add first item
                </button>
              ) : null
            }
          />
        </Surface>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {filtered.map(item => {
            const state = stockState(item);
            return (
              <Surface
                key={item.id}
                padding="md"
                className="flex flex-col justify-between transition-shadow hover:shadow-e2 hover:ring-[var(--color-brand)]/30"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-body font-bold text-ink">{item.name}</h2>
                    {item.code && (
                      <span className="num shrink-0 rounded bg-surface-2 px-1.5 py-0.5 text-micro font-bold text-ink-muted">
                        {item.code}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 empty:hidden">
                    <StockBadge item={item} />
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <Money value={item.price} className="text-title font-extrabold text-[var(--color-brand)]" />
                    <span className="text-micro text-ink-subtle">/ {item.unit}</span>
                  </div>
                  {item.barcode && (
                    <div className="num mt-1.5 flex items-center gap-1 text-micro text-ink-subtle">
                      <BarcodeIcon className="h-3 w-3" />
                      <span>{item.barcode}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-hairline/60 pt-3">
                  <div className={`text-micro ${STOCK_TONE[state]}`}>
                    Stock: <strong className="num text-ink">{item.stock} {item.unit}</strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIsCheckoutOpen(true)}
                      className="rounded-[var(--radius-control)] bg-[var(--color-in)]/10 px-2.5 py-1 text-micro font-bold text-[var(--color-in)] transition-colors hover:bg-[var(--color-in)]/15 cursor-pointer"
                    >
                      + Bill
                    </button>
                    <button
                      onClick={() => openEditModal(item)}
                      title="Edit item"
                      aria-label={`Edit item ${item.name}`}
                      className="rounded-[var(--radius-control)] p-1.5 text-ink-subtle transition-colors hover:bg-[var(--color-brand)]/10 hover:text-[var(--color-brand)] cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </Surface>
            );
          })}
        </div>
      )}

      {/* Add / Edit Item Modal */}
      {isAddModalOpen && (
        <div className={DIALOG.overlay}>
          <div className={`${DIALOG.card} flex max-h-[92vh] max-w-md flex-col`}>
            <div className={DIALOG.header}>
              <div className="flex items-center gap-2">
                <PackagePlus className={DIALOG.icon} />
                <h3 className={DIALOG.title}>{editingItem ? 'Edit item' : 'Add item'}</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                aria-label="Close"
                className={DIALOG.close}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-4 overflow-y-auto p-5">
              <div>
                <label className={LABEL} htmlFor="item-name">Item name *</label>
                <input
                  id="item-name"
                  type="text"
                  required
                  placeholder="e.g. Cotton Shirt or Basmati Rice"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={FIELD}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL} htmlFor="item-code">Item code / SKU</label>
                  <input
                    id="item-code"
                    type="text"
                    placeholder="e.g. SKU-101"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className={`${FIELD} num`}
                  />
                </div>
                <div>
                  <label className={LABEL} htmlFor="item-unit">Unit</label>
                  <select
                    id="item-unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className={FIELD}
                  >
                    <option value="Pcs">Pcs</option>
                    <option value="Bags">Bags</option>
                    <option value="Kg">Kg</option>
                    <option value="Ltr">Ltr</option>
                    <option value="Boxes">Boxes</option>
                    <option value="Mtr">Mtr</option>
                  </select>
                </div>
              </div>

              {/* Barcode: manual entry or camera scan */}
              <div>
                <label className={LABEL} htmlFor="item-barcode">Barcode</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <BarcodeIcon className="absolute left-3 top-2.5 h-4 w-4 text-ink-subtle" />
                    <input
                      id="item-barcode"
                      type="text"
                      placeholder="e.g. 8901234567890"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      className={`${FIELD} num pl-9`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="flex shrink-0 items-center gap-1.5 rounded-[var(--radius-control)] bg-[var(--color-brand)]/10 px-3 py-2 text-micro font-bold text-[var(--color-brand)] transition-colors hover:bg-[var(--color-brand)]/15 cursor-pointer"
                  >
                    <BarcodeIcon className="h-3.5 w-3.5" />
                    <span>Scan</span>
                  </button>
                </div>
                <p className="mt-1 text-micro text-ink-subtle">
                  Scan the product's barcode with the camera, or type it — the POS scanner looks here.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL} htmlFor="item-price">Sale price (₹) *</label>
                  <input
                    id="item-price"
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className={`${FIELD} num font-bold`}
                  />
                </div>
                <div>
                  <label className={LABEL} htmlFor="item-stock">
                    {editingItem ? 'Stock (adjust)' : 'Opening stock'}
                  </label>
                  <input
                    id="item-stock"
                    type="number"
                    placeholder="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className={`${FIELD} num`}
                  />
                </div>
              </div>

              {/* Low-stock alert: the level that turns the item's badge amber */}
              <div>
                <label className={LABEL} htmlFor="item-threshold">Low-stock alert at</label>
                <input
                  id="item-threshold"
                  type="number"
                  min="0"
                  placeholder={String(DEFAULT_LOW_STOCK_THRESHOLD)}
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                  className={`${FIELD} num`}
                />
                <p className="mt-1 text-micro text-ink-subtle">
                  Warn when stock falls to this level or below. 0 turns the alert off.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 rounded-[var(--radius-control)] bg-surface py-2.5 text-body font-semibold text-ink-muted ring-1 ring-hairline/70 transition-colors hover:bg-surface-2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-brand)] py-2.5 text-body font-bold text-white shadow-e1 transition-opacity hover:opacity-90 disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{editingItem ? 'Save changes' : 'Save item'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Camera barcode scanner */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(code) => setBarcode(code)}
      />
    </div>
  );
}
