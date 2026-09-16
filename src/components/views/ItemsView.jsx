import React, { useState } from 'react';
import { Package, Plus, Search, X, PackagePlus, Pencil, Barcode as BarcodeIcon, Loader2 } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import BarcodeScannerModal from '../pos/BarcodeScannerModal';

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

  const openAddModal = () => {
    setName(''); setCode(''); setPrice(''); setStock(''); setBarcode(''); setUnit('Pcs');
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
        barcode: barcode.trim() || null
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">Items & Inventory</h1>
          <p className="text-xs text-slate-500">Track stock levels, pricing, units, barcodes & item codes</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Item</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Search items by name, SKU or barcode..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* Items Grid */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/80">
          <Package className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
          <p className="text-sm font-semibold text-slate-600 mt-2">No inventory items added yet</p>
          <p className="text-xs text-slate-400 mt-0.5">Click "Add Item" above to add products, pricing, and stock</p>
          <button
            onClick={openAddModal}
            className="mt-3 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold cursor-pointer"
          >
            + Create First Item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filtered.map(item => (
            <div
              key={item.id}
              className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-indigo-200 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-sm text-slate-900">{item.name}</h3>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                    {item.code}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-lg font-extrabold text-indigo-600">₹{item.price}</span>
                  <span className="text-xs text-slate-400">/ {item.unit}</span>
                </div>
                {item.barcode && (
                  <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                    <BarcodeIcon className="w-3 h-3" />
                    <span>{item.barcode}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  Stock: <strong className="text-slate-800">{item.stock} {item.unit}</strong>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setIsCheckoutOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold cursor-pointer"
                  >
                    + Bill
                  </button>
                  <button
                    onClick={() => openEditModal(item)}
                    title="Edit item"
                    aria-label={`Edit item ${item.name}`}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
            <div className="bg-[#1E1B4B] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-indigo-300" />
                <h3 className="font-bold text-base">{editingItem ? 'Edit Item' : 'Add Inventory Item'}</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cotton Shirt or Basmati Rice"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Item Code / SKU</label>
                  <input
                    type="text"
                    placeholder="e.g. SKU-101"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Unit</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
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
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Barcode</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <BarcodeIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="e.g. 8901234567890"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold cursor-pointer shrink-0"
                  >
                    <BarcodeIcon className="w-3.5 h-3.5" />
                    <span>Scan</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Scan a product's barcode with the camera, or type it — used by the POS barcode scanner.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Sale Price (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {editingItem ? 'Stock (adjust)' : 'Opening Stock'}
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingItem ? 'Save Changes' : 'Save Item'}</span>
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
