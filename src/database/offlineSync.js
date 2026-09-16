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

// Delete a transaction from the local cache (IndexedDB)
export async function deleteLocalTransaction(id) {
  const db = await openLocalDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['transactions'], 'readwrite');
    transaction.objectStore('transactions').delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// ---- Deletion tombstones ----
// A deleted transaction must not be resurrected by the next sync pull while its
// remote delete is still pending (e.g. deleted while offline). Ids live in
// localStorage and are retried/cleared once the remote delete succeeds.
const TOMBSTONE_KEY = 'swiftbill_deleted_tx_ids';

export function getDeletedTxIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(TOMBSTONE_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

export function rememberDeletedTx(id) {
  try {
    const ids = JSON.parse(localStorage.getItem(TOMBSTONE_KEY) || '[]');
    if (!ids.includes(id)) {
      ids.push(id);
      // Cap the list so it can never grow unbounded
      localStorage.setItem(TOMBSTONE_KEY, JSON.stringify(ids.slice(-500)));
    }
  } catch { /* ignore */ }
}

export function forgetDeletedTx(id) {
  try {
    const ids = JSON.parse(localStorage.getItem(TOMBSTONE_KEY) || '[]').filter(x => x !== id);
    localStorage.setItem(TOMBSTONE_KEY, JSON.stringify(ids));
  } catch { /* ignore */ }
}

// ---- Pending stock deltas ----
// Inventory stock-in goes through a Supabase RPC, which is impossible while
// offline. Queue the delta locally and replay it on the next successful sync
// so purchases recorded offline still bump their product's stock.
const STOCK_DELTA_KEY = 'swiftbill_pending_stock_deltas';

export function getPendingStockDeltas() {
  try {
    return JSON.parse(localStorage.getItem(STOCK_DELTA_KEY) || '[]');
  } catch {
    return [];
  }
}

export function queueStockDelta(productId, delta) {
  if (!productId || !(Number(delta) > 0)) return;
  try {
    const queue = getPendingStockDeltas();
    queue.push({ productId: String(productId), delta: Number(delta), queuedAt: new Date().toISOString() });
    // Cap the queue so it can never grow unbounded
    localStorage.setItem(STOCK_DELTA_KEY, JSON.stringify(queue.slice(-500)));
  } catch { /* ignore */ }
}

// Replay every queued stock delta against the server RPC. Successfully
// applied deltas are removed; failures stay queued for the next sync.
export async function flushStockDeltas() {
  const queue = getPendingStockDeltas();
  if (queue.length === 0) return 0;
  let applied = 0;
  const remaining = [];
  for (const item of queue) {
    try {
      const { error } = await supabase.rpc('increment_inventory_stock', {
        p_id: item.productId,
        p_delta: item.delta
      });
      if (error) {
        remaining.push(item);
      } else {
        applied++;
      }
    } catch {
      remaining.push(item);
    }
  }
  try {
    localStorage.setItem(STOCK_DELTA_KEY, JSON.stringify(remaining));
  } catch { /* ignore */ }
  return applied;
}

// ---- Pending vendors ----
// Vendor registry entries saved while offline queue here and upload to the
// `vendors` table on the next successful sync.
const VENDOR_QUEUE_KEY = 'swiftbill_pending_vendors';

export function getPendingVendors() {
  try {
    return JSON.parse(localStorage.getItem(VENDOR_QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function queueVendor(vendor) {
  try {
    const queue = getPendingVendors();
    queue.push({ ...vendor, queuedAt: new Date().toISOString() });
    // Cap the queue so it can never grow unbounded
    localStorage.setItem(VENDOR_QUEUE_KEY, JSON.stringify(queue.slice(-200)));
  } catch { /* ignore */ }
}

// Upload every queued vendor; failures stay queued for the next sync.
export async function flushPendingVendors() {
  const queue = getPendingVendors();
  if (queue.length === 0) return 0;
  let synced = 0;
  const remaining = [];
  for (const v of queue) {
    try {
      const { error } = await supabase
        .from('vendors')
        .insert({ name: v.name, gst_no: v.gst_no || null, phone: v.phone || null, type: v.type || 'customer' });
      if (error) remaining.push(v);
      else synced++;
    } catch {
      remaining.push(v);
    }
  }
  try {
    localStorage.setItem(VENDOR_QUEUE_KEY, JSON.stringify(remaining));
  } catch { /* ignore */ }
  return synced;
}

// ---- Pending inventory operations (item inserts & edits) ----
// Items added/edited in the Items view are local-first. Server-backed rows
// (real `inventory` ids) replay their changes here when offline; new items
// insert remotely and swap their temporary local id for the server row.
const INVENTORY_OPS_KEY = 'swiftbill_pending_inventory_ops';

export function getPendingInventoryOps() {
  try {
    return JSON.parse(localStorage.getItem(INVENTORY_OPS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function queueInventoryOp(op) {
  try {
    const queue = getPendingInventoryOps();
    queue.push({ ...op, queuedAt: new Date().toISOString() });
    // Cap the queue so it can never grow unbounded
    localStorage.setItem(INVENTORY_OPS_KEY, JSON.stringify(queue.slice(-300)));
  } catch { /* ignore */ }
}

// An item added offline then edited before reconnect: refresh its queued
// insert payload so the server receives the final values, not stale ones.
export function updateQueuedInventoryInsert(tempId, newPayload) {
  try {
    const queue = getPendingInventoryOps().map(op =>
      op.type === 'insert' && op.tempId === tempId ? { ...op, payload: newPayload } : op
    );
    localStorage.setItem(INVENTORY_OPS_KEY, JSON.stringify(queue));
  } catch { /* ignore */ }
}

// Replace a temporary local inventory row with the authoritative server row
// (same pattern as markTransactionSynced for transactions)
export async function replaceLocalInventoryRow(tempId, serverRow) {
  const db = await openLocalDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['inventory'], 'readwrite');
    const store = tx.objectStore('inventory');
    if (tempId && tempId !== serverRow.id) store.delete(tempId);
    store.put({ ...serverRow });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Replay queued inventory inserts/updates; failures stay queued.
export async function flushInventoryOps() {
  const ops = getPendingInventoryOps();
  if (ops.length === 0) return 0;
  let applied = 0;
  const remaining = [];
  for (const op of ops) {
    try {
      if (op.type === 'insert') {
        const { data, error } = await supabase
          .from('inventory')
          .insert(op.payload)
          .select()
          .single();
        if (!error && data) {
          await replaceLocalInventoryRow(op.tempId, data);
          applied++;
        } else {
          remaining.push(op);
        }
      } else {
        const { error } = await supabase
          .from('inventory')
          .update(op.payload)
          .eq('id', op.id);
        if (!error) applied++;
        else remaining.push(op);
      }
    } catch {
      remaining.push(op);
    }
  }
  try {
    localStorage.setItem(INVENTORY_OPS_KEY, JSON.stringify(remaining));
  } catch { /* ignore */ }
  return applied;
}

// UI-friendly aliases over a raw inventory row. Remote rows only carry
// item_name/retail_price/stock_quantity, while views also read
// name/price/stock/unit — merge both shapes so every consumer works.
export function normalizeItemForUI(row) {
  if (!row) return row;
  return {
    ...row,
    name: row.name || row.item_name || 'Unnamed item',
    price: Number(row.retail_price ?? row.price ?? 0) || 0,
    stock: Number(row.stock_quantity ?? row.stock ?? 0) || 0,
    unit: row.unit || 'Pcs',
    code: row.code || row.barcode || ''
  };
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
// Serialize syncs: concurrent runs (e.g. mount + realtime event firing
// together) would double-push rows still pending when the second run reads
// its pending list. All callers await the same in-flight promise instead.
let syncInFlight = null;

// Temp ids whose remote insert is currently in flight (addSale/addPurchase/
// addExpense register before awaiting the insert). The realtime channel can
// trigger a sync the instant the server row lands — before the caller has
// swapped the local row for it — so the push step must skip these to avoid
// inserting the same bill twice.
const insertingRemoteIds = new Set();

export function beginRemoteInsert(tempId) {
  if (tempId) insertingRemoteIds.add(tempId);
}

export function endRemoteInsert(tempId) {
  if (tempId) insertingRemoteIds.delete(tempId);
}

export async function syncWithSupabase() {
  if (!navigator.onLine || !isSupabaseConfigured || !supabase) {
    return { success: false, reason: 'offline_or_unconfigured' };
  }

  if (syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
  let pushed = 0;
  let pulled = 0;

  try {
    // 1. Push pending local transactions to Supabase
    const pending = await getPendingSyncTransactions();
    for (const tx of pending) {
      // Skip rows whose remote insert is mid-flight in addSale/addPurchase/
      // addExpense — pushing here would create a duplicate
      if (insertingRemoteIds.has(tx.id)) continue;
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
      const deletedIds = getDeletedTxIds();

      for (const rTx of remoteTxs) {
        // Skip rows the user deleted locally whose remote delete hasn't landed yet
        if (deletedIds.has(rTx.id)) continue;
        const local = localById.get(rTx.id);
        // Never clobber a pending local edit with the server copy
        if (local && !local.synced) continue;
        // Skip no-op writes when the local copy is already current
        if (local && local.updated_at && rTx.updated_at && local.updated_at >= rTx.updated_at) continue;

        await saveLocalTransaction({ ...rTx, synced: true });
        pulled++;
      }
    }

    // 3. Replay item inserts/edits queued while offline BEFORE pulling, so
    //    the pull returns our own changes instead of clobbering them
    await flushInventoryOps();

    // Pull latest inventory from Supabase and cache locally, skipping rows
    // that still have pending local ops (failed flush — retry next sync)
    const pendingInvIds = new Set(
      getPendingInventoryOps().map(o => String(o.type === 'insert' ? o.tempId : o.id)).filter(Boolean)
    );
    const { data: remoteInv, error: invErr } = await supabase
      .from('inventory')
      .select('*')
      .order('item_name');

    if (!invErr && remoteInv) {
      await saveLocalInventory(remoteInv.filter(r => !pendingInvIds.has(String(r.id))));
    }

    // 4. Retry remote deletes that previously failed while offline
    for (const id of getDeletedTxIds()) {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (!error) forgetDeletedTx(id);
    }

    // 5. Replay stock deltas queued while offline (purchase stock-in)
    await flushStockDeltas();

    // 6. Upload vendors saved while offline
    await flushPendingVendors();

    return { success: true, pushed, pulled };
  } catch (err) {
    console.error('Offline sync error:', err);
    return { success: false, error: err.message };
  } finally {
    syncInFlight = null;
  }
  })();

  return syncInFlight;
}
