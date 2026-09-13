import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const DB_NAME = 'swiftbill_offline_db';
const DB_VERSION = 1;

// Open IndexedDB for high-performance mobile offline storage
function openLocalDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('transactions')) {
        const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
        txStore.createIndex('synced', 'synced', { unique: false });
      }
      if (!db.objectStoreNames.contains('inventory')) {
        const invStore = db.createObjectStore('inventory', { keyPath: 'id' });
        invStore.createIndex('barcode', 'barcode', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Save transaction locally in IndexedDB
export async function saveLocalTransaction(tx) {
  const db = await openLocalDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['transactions'], 'readwrite');
    const store = transaction.objectStore('transactions');
    const request = store.put({
      ...tx,
      synced: tx.synced || false,
      updated_at: new Date().toISOString()
    });

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Get all local transactions
export async function getLocalTransactions() {
  const db = await openLocalDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['transactions'], 'readonly');
    const store = transaction.objectStore('transactions');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// Get pending unsynced transactions
export async function getPendingSyncTransactions() {
  const all = await getLocalTransactions();
  return all.filter(t => !t.synced);
}

// Mark transaction as synced, optionally merging the server-generated row in
// place of the temporary local one (keeps IDs unique, avoids duplicates).
export async function markTransactionSynced(id, remoteRow = null) {
  const db = await openLocalDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['transactions'], 'readwrite');
    const store = transaction.objectStore('transactions');

    if (remoteRow && remoteRow.id && remoteRow.id !== id) {
      // Replace the temp local record with the authoritative remote row
      store.delete(id);
      store.put({ ...remoteRow, synced: true, updated_at: new Date().toISOString() });
    } else {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const data = getReq.result;
        if (data) {
          data.synced = true;
          store.put(data);
        }
      };
    }

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// Save inventory items locally
export async function saveLocalInventory(items) {
  if (!items || items.length === 0) return;
  const db = await openLocalDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['inventory'], 'readwrite');
    const store = transaction.objectStore('inventory');
    items.forEach(item => store.put(item));

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// Get all inventory items from local cache
export async function getLocalInventory() {
  const db = await openLocalDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['inventory'], 'readonly');
    const store = transaction.objectStore('inventory');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// Offline-First Sync Service
export async function syncWithSupabase() {
  if (!navigator.onLine || !isSupabaseConfigured || !supabase) {
    return { success: false, reason: 'offline_or_unconfigured' };
  }

  let pushed = 0;
  let pulled = 0;

  try {
    // 1. Push pending local transactions to Supabase
    const pending = await getPendingSyncTransactions();
    for (const tx of pending) {
      const payload = {
        amount: Number(tx.amount) || 0,
        type: tx.type,
        party_name: tx.party_name || tx.partyName || 'Customer',
        pricing_tier: tx.pricing_tier || 'retail',
        payment_mode: tx.payment_mode || 'Cash',
        items_json: tx.items_json || [],
        created_at: tx.created_at || new Date().toISOString()
      };

      const { data: inserted, error } = await supabase
        .from('transactions')
        .insert([payload])
        .select()
        .single();

      if (!error && inserted) {
        // Merge the server row (with its real ID) over the temp local row
        await markTransactionSynced(tx.id, inserted);
        pushed++;
      }
    }

    // 2. Pull latest transactions from Supabase (skip unsynced local rows)
    const { data: remoteTxs, error: txErr } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (!txErr && Array.isArray(remoteTxs)) {
      const localTxs = await getLocalTransactions();
      const localById = new Map(localTxs.map(t => [t.id, t]));

      for (const rTx of remoteTxs) {
        const local = localById.get(rTx.id);
        // Never clobber a pending local edit with the server copy
        if (local && !local.synced) continue;
        // Skip no-op writes when the local copy is already current
        if (local && local.updated_at && rTx.updated_at && local.updated_at >= rTx.updated_at) continue;

        await saveLocalTransaction({ ...rTx, synced: true });
        pulled++;
      }
    }

    // 3. Pull latest inventory from Supabase and cache locally
    const { data: remoteInv, error: invErr } = await supabase
      .from('inventory')
      .select('*')
      .order('item_name');

    if (!invErr && remoteInv) {
      await saveLocalInventory(remoteInv);
    }

    return { success: true, pushed, pulled };
  } catch (err) {
    console.error('Offline sync error:', err);
    return { success: false, error: err.message };
  }
}
