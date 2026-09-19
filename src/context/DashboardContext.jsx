import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import {
  saveLocalTransaction,
  getLocalTransactions,
  getPendingSyncTransactions,
  saveLocalInventory,
  getLocalInventory,
  syncWithSupabase,
  deleteLocalTransaction,
  markTransactionSynced,
  rememberDeletedTx,
  getPendingStockDeltas,
  getPendingVendors,
  getPendingInventoryOps,
  queueInventoryOp,
  updateQueuedInventoryInsert,
  replaceLocalInventoryRow,
  normalizeItemForUI,
  beginRemoteInsert,
  endRemoteInsert
} from '../database/offlineSync';
import { buildSalesTimeline, summarizeTimeline, DEFAULT_RANGE } from '../utils/salesTimeline';

const DashboardContext = createContext();

const DEFAULT_BUSINESS_INFO = {
  name: "SwiftBill Store",
  gstin: "29AABCU9603R1ZM",
  city: "Main Store",
  phone: "9495385472",
  upiId: "jaggusts@okhdfcbank",
  currency: "₹"
};

export function DashboardProvider({ children }) {
  // Time range filter for sales chart
  const [salesTimeRange, setSalesTimeRange] = useState(DEFAULT_RANGE);

  // Drawer and modal states
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAddSaleOpen, setIsAddSaleOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false); // Slide-up Checkout Bottom Sheet
  const [isAddPurchaseOpen, setIsAddPurchaseOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [activeReportModal, setActiveReportModal] = useState(null);
  const [activeNavTab, setActiveNavTab] = useState('home');

  // Supabase & Offline-first connection state
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [supabaseError, setSupabaseError] = useState(null);
  const [lastSynced, setLastSynced] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Business profile state (persisted locally so edits survive reloads)
  const [businessInfo, setBusinessInfo] = useState(() => {
    try {
      const saved = localStorage.getItem('swiftbill_business_info');
      if (saved) return { ...DEFAULT_BUSINESS_INFO, ...JSON.parse(saved) };
    } catch { /* ignore corrupt cache */ }
    return DEFAULT_BUSINESS_INFO;
  });

  const [parties, setParties] = useState(() => {
    try {
      const saved = localStorage.getItem('swiftbill_parties');
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return [];
  });

  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('swiftbill_items');
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return [];
  });

  // Persist local-only collections when they change
  useEffect(() => {
    try { localStorage.setItem('swiftbill_business_info', JSON.stringify(businessInfo)); } catch { /* ignore */ }
  }, [businessInfo]);
  useEffect(() => {
    try { localStorage.setItem('swiftbill_parties', JSON.stringify(parties)); } catch { /* ignore */ }
  }, [parties]);
  useEffect(() => {
    try { localStorage.setItem('swiftbill_items', JSON.stringify(items)); } catch { /* ignore */ }
  }, [items]);

  // Stable ref so the realtime listener can re-fetch without re-subscribing
  const fetchAllDataRef = useRef(null);

  // Check pending unsynced count: queued transactions + offline stock deltas
  // + offline vendor entries — everything waiting to upload to Supabase
  const refreshPendingCount = async () => {
    try {
      const pending = await getPendingSyncTransactions();
      const stockDeltas = getPendingStockDeltas().length;
      const vendors = getPendingVendors().length;
      setPendingSyncCount(pending.length + stockDeltas + vendors);
    } catch (e) {
      // ignore
    }
  };

  // 1. Fetch transactions & inventory (Local-First Architecture)
  // `silent` skips the full-screen loading state (used by realtime/refresh paths)
  const fetchAllData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      // First, load from local IndexedDB for immediate rendering (<100ms)
      const cachedTxs = await getLocalTransactions();
      if (cachedTxs && cachedTxs.length > 0) {
        setTransactions(cachedTxs.sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date)));
      }

      const cachedInv = await getLocalInventory();
      if (cachedInv && cachedInv.length > 0) {
        setItems(cachedInv.map(normalizeItemForUI));
      }

      // If online and Supabase configured, perform background bi-directional sync
      if (navigator.onLine && isSupabaseConfigured) {
        const syncRes = await syncWithSupabase();
        if (syncRes.success) {
          setLastSynced(new Date().toLocaleTimeString());
          setSupabaseError(null);

          // Reload fresh transactions from local DB
          const refreshedTxs = await getLocalTransactions();
          setTransactions(refreshedTxs.sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date)));

          const refreshedInv = await getLocalInventory();
          if (refreshedInv.length > 0) setItems(refreshedInv.map(normalizeItemForUI));
        }
      }
      await refreshPendingCount();
    } catch (err) {
      console.warn('Sync/Fetch warning:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllDataRef.current = fetchAllData;
  }, [fetchAllData]);

  useEffect(() => {
    fetchAllData();

    // Listen for Online/Offline state changes (Essential for mobile APK wrapping)
    const handleOnline = () => {
      setIsOnline(true);
      fetchAllDataRef.current?.();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    let channel = null;
    // Setup Supabase Realtime subscription only when configured
    if (isSupabaseConfigured && supabase) {
      channel = supabase
        .channel('public:transactions_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
          // Silent refresh: don't flash the loading state / spin the sync pill
          fetchAllDataRef.current?.(true);
        })
        .subscribe();
    }

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // All-time totals for the summary cards; the chart owns the range-scoped ones
  const totalReceivable = useMemo(() => {
    return transactions
      .filter(t => t.type === 'sale')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [transactions]);

  const totalPayable = useMemo(() => {
    return transactions
      .filter(t => t.type === 'purchase')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [transactions]);

  // Chart timeline + range totals for the selected range
  const salesTimeline = useMemo(
    () => buildSalesTimeline(transactions, salesTimeRange),
    [transactions, salesTimeRange]
  );

  const salesRangeTotals = useMemo(() => summarizeTimeline(salesTimeline), [salesTimeline]);

  // Computed state combining user entries and Supabase records
  const currentData = useMemo(() => {
    return {
      totalReceivable,
      totalPayable,
      cashInHand: totalReceivable,
      bankBalance: 0,
      stockValue: items.reduce((sum, itm) => sum + (Number(itm.retail_price || itm.price || 0) * Number(itm.stock_quantity || itm.stock || 0)), 0),
      salesTimeline,
      salesRangeTotals,
      transactions,
      parties,
      items
    };
  }, [totalReceivable, totalPayable, transactions, parties, items, salesTimeline, salesRangeTotals]);

  // 3. Add Sale: Saves locally first, then syncs to Supabase
  const addSale = async (saleData) => {
    const partyName = saleData.party_name || saleData.partyName || 'Cash Customer';
    const amount = Number(saleData.amount);

    const newRecord = {
      id: saleData.id || `local-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      amount,
      type: 'sale',
      party_name: partyName,
      pricing_tier: saleData.pricing_tier || 'retail',
      payment_mode: saleData.payment_mode || 'Cash',
      items_json: saleData.items_json || [],
      created_at: new Date().toISOString(),
      synced: false
    };

    // Save locally first (Zero-latency offline-first)
    await saveLocalTransaction(newRecord);
    setTransactions(prev => [newRecord, ...prev]);
    await refreshPendingCount();

    // If online, insert remotely and swap the temp local row for the server
    // row BEFORE the next sync — otherwise the still-unsynced local copy gets
    // pushed again and the transaction is duplicated.
    if (navigator.onLine && isSupabaseConfigured) {
      beginRemoteInsert(newRecord.id);
      try {
        const { data: inserted, error } = await supabase
          .from('transactions')
          .insert([{
            amount,
            type: 'sale',
            party_name: partyName,
            pricing_tier: newRecord.pricing_tier,
            payment_mode: newRecord.payment_mode,
            items_json: newRecord.items_json
          }])
          .select()
          .single();

        if (!error && inserted) {
          await markTransactionSynced(newRecord.id, inserted);
          setTransactions(prev => prev.map(t => (t.id === newRecord.id ? { ...inserted, synced: true } : t)));
        }
      } catch (e) {
        console.warn('Network sync postponed:', e);
      } finally {
        endRemoteInsert(newRecord.id);
      }
    }
  };

  // 4b. Add Expense (e.g. petrol): local-first, mirrors addSale/addPurchase
  const addExpense = async (expenseData) => {
    const desc = expenseData.description || 'General Expense';
    const amount = Number(expenseData.amount);

    const newRecord = {
      id: expenseData.id || `local-${Date.now()}-exp`,
      amount,
      type: 'expense',
      party_name: desc,
      payment_mode: 'Cash',
      items_json: [{ name: desc, category: expenseData.category || 'other', quantity: 1, rate: amount, total: amount }],
      created_at: new Date().toISOString(),
      synced: false
    };

    // Save locally first (works offline, shows in Recent Transactions)
    await saveLocalTransaction(newRecord);
    setTransactions(prev => [newRecord, ...prev]);
    await refreshPendingCount();

    // If online, insert remotely and swap the temp local row for the server
    // row BEFORE the next sync (same duplication guard as addSale)
    if (navigator.onLine && isSupabaseConfigured) {
      beginRemoteInsert(newRecord.id);
      try {
        const { data: inserted, error } = await supabase
          .from('transactions')
        .insert([{
            amount,
            type: 'expense',
            party_name: desc,
            payment_mode: 'Cash',
            items_json: newRecord.items_json
          }])
          .select()
          .single();

        if (!error && inserted) {
          await markTransactionSynced(newRecord.id, inserted);
          setTransactions(prev => prev.map(t => (t.id === newRecord.id ? { ...inserted, synced: true } : t)));
        }
      } catch (e) {
        console.warn('Network sync postponed:', e);
      } finally {
        endRemoteInsert(newRecord.id);
      }
    }
  };

  // 4. Add Purchase: Saves locally first, then syncs to Supabase
  const addPurchase = async (purchaseData) => {
    const partyName = purchaseData.party_name || purchaseData.partyName || 'General Supplier';
    const amount = Number(purchaseData.amount);

    const newRecord = {
      id: purchaseData.id || `local-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      amount,
      type: 'purchase',
      party_name: partyName,
      pricing_tier: 'wholesale',
      payment_mode: 'Bank Transfer',
      items_json: [],
      created_at: new Date().toISOString(),
      synced: false
    };

    // Save locally first
    await saveLocalTransaction(newRecord);
    setTransactions(prev => [newRecord, ...prev]);
    await refreshPendingCount();

    // If online, insert remotely and swap the temp local row for the server
    // row BEFORE the next sync (same duplication guard as addSale)
    if (navigator.onLine && isSupabaseConfigured) {
      beginRemoteInsert(newRecord.id);
      try {
        const { data: inserted, error } = await supabase
          .from('transactions')
          .insert([{
            amount,
            type: 'purchase',
            party_name: partyName,
            pricing_tier: 'wholesale',
            payment_mode: 'Bank Transfer',
            items_json: []
          }])
          .select()
          .single();

        if (!error && inserted) {
          await markTransactionSynced(newRecord.id, inserted);
          setTransactions(prev => prev.map(t => (t.id === newRecord.id ? { ...inserted, synced: true } : t)));
        }
      } catch (e) {
        console.warn('Network sync postponed:', e);
      } finally {
        endRemoteInsert(newRecord.id);
      }
    }
  };

  // 5. Delete a transaction (sale or purchase): removes it from the local cache
  // immediately and, when online, from Supabase. If offline (or the remote
  // delete fails), the id is tombstoned so the next sync neither resurrects it
  // from the server nor treats it as pending data.
  const deleteTransaction = async (id) => {
    if (!id) return { success: false, error: 'Missing transaction id' };

    // 1. Remove locally first (zero-latency UI update)
    try {
      await deleteLocalTransaction(id);
    } catch (e) {
      console.warn('Local delete failed:', e);
    }
    setTransactions(prev => prev.filter(t => t.id !== id));

    // 2. Remote delete (skipped entirely for temp local-only rows)
    if (isSupabaseConfigured && supabase && navigator.onLine && !String(id).startsWith('local-')) {
      try {
        const { error } = await supabase.from('transactions').delete().eq('id', id);
        if (!error) {
          await syncWithSupabase();
          setLastSynced(new Date().toLocaleTimeString());
          return { success: true, deleted: 'remote' };
        }
        console.warn('Remote delete failed, tombstoning:', error.message);
      } catch (e) {
        console.warn('Remote delete postponed:', e);
      }
    }

    // 3. Offline / failed / local-only: tombstone only real (remote-backed) ids
    if (!String(id).startsWith('local-')) {
      rememberDeletedTx(id);
    }
    await refreshPendingCount();
    return { success: true, deleted: 'local' };
  };

  const addParty = (party) => {
    setParties(prev => [{ id: `P-${Date.now()}`, ...party }, ...prev]);
  };

  // 6. Items: add or edit. Local-first (IndexedDB + localStorage) so the UI
  // updates instantly and survives offline; server-backed rows replay their
  // change to Supabase (or queue it when offline) inside the next sync.
  const upsertItem = async (item, existingId = null) => {
    // Normalize into one shape (views read both legacy and canonical keys)
    const normalized = {
      name: item.name,
      code: item.code || item.barcode || `SKU-${Math.floor(100 + Math.random() * 900)}`,
      price: Number(item.price) || 0,
      stock: Number(item.stock) || 0,
      unit: item.unit || 'Pcs',
      barcode: item.barcode || null,
      retail_price: Number(item.price) || 0,
      item_name: item.name,
      stock_quantity: Number(item.stock) || 0
    };

    // Server columns for insert/update payloads. `wholesale_price` is NOT NULL
    // in the inventory table — default to the POS's own 85%-of-retail fallback
    // so items without an explicit wholesale price still insert cleanly.
    const serverPayload = {
      item_name: normalized.name,
      retail_price: normalized.price,
      wholesale_price: Number((normalized.price * 0.85).toFixed(2)),
      stock_quantity: normalized.stock,
      barcode: normalized.barcode
    };

    let idToUse = existingId;

    if (existingId) {
      // EDIT: merge so fields not exposed in the form survive
      const prevItem = items.find(i => i.id === existingId) || {};
      const updatedRow = { ...prevItem, ...normalized, id: existingId };
      await saveLocalInventory([updatedRow]);
      setItems(prev => prev.map(i => (i.id === existingId ? updatedRow : i)));

      const hasTempId = String(existingId).startsWith('local-');
      if (hasTempId) {
        // Row was added offline: refresh its queued insert with final values
        updateQueuedInventoryInsert(existingId, serverPayload);
      } else if (isSupabaseConfigured && supabase) {
        if (navigator.onLine) {
          try {
            const { error } = await supabase.from('inventory').update(serverPayload).eq('id', existingId);
            if (error) queueInventoryOp({ type: 'update', id: existingId, payload: serverPayload });
          } catch {
            queueInventoryOp({ type: 'update', id: existingId, payload: serverPayload });
          }
        } else {
          queueInventoryOp({ type: 'update', id: existingId, payload: serverPayload });
        }
      }
    } else {
      // ADD: temp id first (local-first), remote insert with id swap when online
      const tempId = `local-${Date.now()}`;
      const newRow = { id: tempId, ...normalized };
      await saveLocalInventory([newRow]);
      setItems(prev => [newRow, ...prev]);
      idToUse = tempId;

      if (isSupabaseConfigured && supabase && navigator.onLine) {
        try {
          const { data, error } = await supabase
            .from('inventory')
            .insert(serverPayload)
            .select()
            .single();
          if (!error && data) {
            await replaceLocalInventoryRow(tempId, data);
            setItems(prev => prev.map(i => (i.id === tempId ? data : i)));
            idToUse = data.id;
          } else {
            queueInventoryOp({ type: 'insert', tempId, payload: serverPayload });
          }
        } catch {
          queueInventoryOp({ type: 'insert', tempId, payload: serverPayload });
        }
      } else {
        // Offline: queue the insert so the row reaches Supabase on reconnect
        queueInventoryOp({ type: 'insert', tempId, payload: serverPayload });
      }
    }

    await refreshPendingCount();
    return idToUse;
  };

  const manualSync = async () => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        await syncWithSupabase();
      }
      await fetchAllData();
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    salesTimeRange,
    setSalesTimeRange,
    isMobileDrawerOpen,
    setIsMobileDrawerOpen,
    isSearchOpen,
    setIsSearchOpen,
    isAddSaleOpen,
    setIsAddSaleOpen,
    isCheckoutOpen,
    setIsCheckoutOpen,
    isAddPurchaseOpen,
    setIsAddPurchaseOpen,
    isAddExpenseOpen,
    setIsAddExpenseOpen,
    isUpgradeModalOpen,
    setIsUpgradeModalOpen,
    activeReportModal,
    setActiveReportModal,
    activeNavTab,
    setActiveNavTab,
    businessInfo,
    setBusinessInfo,
    currentData,
    addSale,
    addPurchase,
    addExpense,
    deleteTransaction,
    addParty,
    upsertItem,
    // Offline-First & Supabase states
    isSupabaseConfigured,
    isLoading,
    supabaseError,
    lastSynced,
    isOnline,
    pendingSyncCount,
    manualSync,
    fetchAllData
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
