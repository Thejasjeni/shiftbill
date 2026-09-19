import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { enableNetwork } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebaseClient';
import {
  subscribeTransactions,
  subscribeInventory,
  addTransaction,
  deleteTransaction as deleteTransactionDoc,
  saveInventoryItem,
  normalizeItemForUI,
  claimUnownedDocuments
} from '../lib/firestoreApi';
import { useAuthUser, signInWithGoogle, signOutOwner } from '../lib/auth';
import { buildSalesTimeline, summarizeTimeline, DEFAULT_RANGE } from '../utils/salesTimeline';
import { countLowStock } from '../utils/stock';
import { DEFAULT_BUSINESS_INFO } from '../data/businessProfile';

const DashboardContext = createContext();

// The old shipped placeholder, kept here only so an upgraded install stops
// billing under the app's own name (see the loader below)
const PLACEHOLDER_BUSINESS_NAME = 'SwiftBill Store';

export function DashboardProvider({ children }) {
  // Sign-in is optional: signed out (or before the project has an auth
  // configuration at all) nothing below behaves any differently. See lib/auth.
  const user = useAuthUser();

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

  // Firestore-backed collections. Both are live views: the first snapshot
  // arrives from the local cache, later ones as the server catches up.
  const [transactions, setTransactions] = useState([]);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSynced, setLastSynced] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Business profile state (persisted locally so edits survive reloads)
  const [businessInfo, setBusinessInfo] = useState(() => {
    try {
      const saved = localStorage.getItem('swiftbill_business_info');
      if (saved) {
        const profile = JSON.parse(saved);
        // The app used to default the business name to its own name; that was
        // never a real choice, so fall back to the current default instead of
        // printing it on bills. Everything the user entered is kept.
        if (profile.name === PLACEHOLDER_BUSINESS_NAME) delete profile.name;
        return { ...DEFAULT_BUSINESS_INFO, ...profile };
      }
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

  // Persist local-only collections when they change
  useEffect(() => {
    try { localStorage.setItem('swiftbill_business_info', JSON.stringify(businessInfo)); } catch { /* ignore */ }
  }, [businessInfo]);
  useEffect(() => {
    try { localStorage.setItem('swiftbill_parties', JSON.stringify(parties)); } catch { /* ignore */ }
  }, [parties]);

  // 1. Live data from Firestore. Subscribing covers what the old hand-rolled
  // sync loop did by hand: cached rows render instantly, local writes appear
  // optimistically, and the server's version replaces them when it lands.
  // Re-runs on sign-in/out so reads switch between scoped and unscoped.
  useEffect(() => {
    let pendingTx = 0;
    let pendingItems = 0;
    const publishPending = () => setPendingSyncCount(pendingTx + pendingItems);

    const unsubTransactions = subscribeTransactions((rows, pending, fromCache) => {
      pendingTx = pending;
      publishPending();
      setTransactions(rows);
      setIsLoading(false);
      if (!fromCache) setLastSynced(new Date().toLocaleTimeString());
    });

    const unsubInventory = subscribeInventory((rows, pending) => {
      pendingItems = pending;
      publishPending();
      setItems(rows.map(normalizeItemForUI));
    });

    // Connectivity is the browser's view; Firestore reconnects and replays its
    // queued writes on its own once the network returns.
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubTransactions();
      unsubInventory();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user?.uid]);

  // Adopt the ledger written before sign-in existed the first time someone
  // signs in, so releasing the owner-scoped rules can't lock it away.
  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    claimUnownedDocuments(uid)
      .then((count) => {
        if (count > 0) console.info(`Attached ${count} existing record(s) to your account`);
      })
      .catch((err) => console.warn('Could not attach existing records:', err.message));
  }, [user?.uid]);

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

  // Computed state combining user entries and Firestore records
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
      items,
      lowStockCount: countLowStock(items)
    };
  }, [totalReceivable, totalPayable, transactions, parties, items, salesTimeline, salesRangeTotals]);

  // `addTransaction` returns as soon as the record is committed to the local
  // cache (Firestore resolves its own promise only once the backend acks, which
  // offline is never) — so recording a bill can't depend on connectivity.
  function record(record) {
    try {
      addTransaction(record);
      return { success: true };
    } catch (err) {
      console.warn('Record not saved:', err.message);
      return { success: false, error: err.message };
    }
  }

  // 3. Add Sale
  const addSale = (saleData) => {
    const partyName = saleData.party_name || saleData.partyName || 'Cash Customer';
    return record({
      amount: Number(saleData.amount),
      type: 'sale',
      party_name: partyName,
      pricing_tier: saleData.pricing_tier || 'retail',
      payment_mode: saleData.payment_mode || 'Cash',
      items_json: saleData.items_json || []
    });
  };

  // 4b. Add Expense (e.g. petrol)
  const addExpense = (expenseData) => {
    const desc = expenseData.description || 'General Expense';
    const amount = Number(expenseData.amount);
    return record({
      amount,
      type: 'expense',
      party_name: desc,
      payment_mode: 'Cash',
      items_json: [{ name: desc, category: expenseData.category || 'other', quantity: 1, rate: amount, total: amount }]
    });
  };

  // 4. Add Purchase
  const addPurchase = (purchaseData) => {
    const partyName = purchaseData.party_name || purchaseData.partyName || 'General Supplier';
    const amount = Number(purchaseData.amount);
    return record({
      amount,
      type: 'purchase',
      party_name: partyName,
      pricing_tier: 'wholesale',
      payment_mode: 'Bank Transfer',
      items_json: purchaseData.items_json || []
    });
  };

  // 5. Delete a transaction. Offline this still succeeds: the delete sits in
  // the cache and is applied remotely on reconnect — no tombstones needed,
  // because a queued delete can't be resurrected by a later server read.
  const deleteTransaction = (id) => {
    if (!id) return { success: false, error: 'Missing transaction id' };
    try {
      deleteTransactionDoc(id);
      return { success: true };
    } catch (err) {
      console.warn('Delete not saved:', err.message);
      return { success: false, error: err.message };
    }
  };

  const addParty = (party) => {
    setParties(prev => [{ id: `P-${Date.now()}`, ...party }, ...prev]);
  };

  // 6. Items: add or edit. `wholesale_price` is NOT NULL in the catalog, so
  // default it to the POS's own 85%-of-retail fallback. The low-stock threshold
  // rides along so the warning badge survives reloads and devices.
  const upsertItem = (item, existingId = null) => {
    const price = Number(item.price) || 0;
    const serverPayload = {
      item_name: item.name,
      retail_price: price,
      wholesale_price: Number((price * 0.85).toFixed(2)),
      stock_quantity: Number(item.stock) || 0,
      barcode: item.barcode || null,
      low_stock_threshold: Number(item.lowStockThreshold) || 0
    };

    try {
      return saveInventoryItem(serverPayload, existingId);
    } catch (err) {
      console.warn('Item not saved:', err.message);
      return existingId;
    }
  };

  // The pill's refresh button: ask Firestore to reconnect now instead of
  // waiting for its own backoff.
  const manualSync = async () => {
    setIsLoading(true);
    try {
      if (isFirebaseConfigured && db) await enableNetwork(db);
      setLastSynced(new Date().toLocaleTimeString());
    } catch (err) {
      console.warn('Manual sync failed:', err.message);
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
    // Offline-first & Firebase connection states
    isFirebaseConfigured,
    isLoading,
    lastSynced,
    isOnline,
    pendingSyncCount,
    manualSync,
    // Accounts (optional — the app works signed out)
    user,
    signIn: signInWithGoogle,
    signOut: signOutOwner
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
