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
  rememberDeletedTx
} from '../database/offlineSync';

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
  const [salesTimeRange, setSalesTimeRange] = useState('This Month');

  // Drawer and modal states
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAddSaleOpen, setIsAddSaleOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false); // Slide-up Checkout Bottom Sheet
  const [isAddPurchaseOpen, setIsAddPurchaseOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [activeReportModal, setActiveReportModal] = useState(null);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
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

  // Check pending unsynced count
  const refreshPendingCount = async () => {
    try {
      const pending = await getPendingSyncTransactions();
      setPendingSyncCount(pending.length);
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
        setItems(cachedInv);
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
          if (refreshedInv.length > 0) setItems(refreshedInv);
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

  // 2. Dynamic Financial Calculations:
  // - Total Receivable: sum of all transactions where type === 'sale'
  // - Total Payable: sum of all transactions where type === 'purchase'
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

  const totalSale = totalReceivable;

  // Sales timeline derived from REAL transaction dates for the selected range
  const salesTimeline = useMemo(() => {
    const now = new Date();
    let days = 28;
    switch (salesTimeRange) {
      case 'Today': days = 1; break;
      case 'This Week': days = 7; break;
      case 'This Month': days = 28; break;
      case 'Last Month': days = 28; break;
      case 'This Quarter': days = 90; break;
      default: days = 28;
    }

    const rangeStart = new Date(now);
    rangeStart.setDate(now.getDate() - (days - 1));
    rangeStart.setHours(0, 0, 0, 0);

    // One bucket per day (cap bucket count so long ranges stay readable)
    const bucketCount = Math.min(days, 8);
    const buckets = Array.from({ length: bucketCount }, (_, i) => {
      const d = new Date(rangeStart);
      d.setDate(rangeStart.getDate() + Math.floor(i * days / bucketCount));
      return { date: d, amount: 0 };
    });

    const cutoff = days > 28 ? new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()) : rangeStart;
    transactions.forEach(tx => {
      if (tx.type !== 'sale') return;
      const d = new Date(tx.created_at || tx.date);
      if (isNaN(d.getTime()) || d < cutoff) return;
      const amt = Number(tx.amount) || 0;
      let target = buckets[0];
      for (const b of buckets) { if (d >= b.date) target = b; else break; }
      target.amount += amt;
    });

    return buckets.map(b => ({
      date: b.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      amount: b.amount
    }));
  }, [transactions, salesTimeRange]);

  // Computed state combining user entries and Supabase records
  const currentData = useMemo(() => {
    return {
      totalReceivable,
      totalPayable,
      totalSale,
      cashInHand: totalReceivable,
      bankBalance: 0,
      stockValue: items.reduce((sum, itm) => sum + (Number(itm.retail_price || itm.price || 0) * Number(itm.stock_quantity || itm.stock || 0)), 0),
      salesTimeline,
      transactions,
      parties,
      items
    };
  }, [totalReceivable, totalPayable, totalSale, transactions, parties, items, salesTimeline]);

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
          await syncWithSupabase();
          setLastSynced(new Date().toLocaleTimeString());
        }
      } catch (e) {
        console.warn('Network sync postponed:', e);
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
          await syncWithSupabase();
          setLastSynced(new Date().toLocaleTimeString());
        }
      } catch (e) {
        console.warn('Network sync postponed:', e);
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

  const addItem = (item) => {
    setItems(prev => [{ id: `ITM-${Date.now()}`, ...item }, ...prev]);
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
    isUpgradeModalOpen,
    setIsUpgradeModalOpen,
    activeReportModal,
    setActiveReportModal,
    isBannerDismissed,
    setIsBannerDismissed,
    activeNavTab,
    setActiveNavTab,
    businessInfo,
    setBusinessInfo,
    currentData,
    addSale,
    addPurchase,
    deleteTransaction,
    addParty,
    addItem,
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
