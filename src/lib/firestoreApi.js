import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  increment,
  onSnapshot,
  getDocsFromCache,
  query,
  orderBy,
  enableNetwork
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebaseClient';

// ---------------------------------------------------------------------------
// Firestore data layer — owns the app's three collections:
//   transactions : one document per sale / purchase / expense
//   inventory    : the product catalog (also the POS item list)
//   vendors      : clients and suppliers
//
// Offline-first comes from Firestore itself (see firebaseClient): every write
// below is applied to the local cache immediately and replayed automatically
// once the backend is reachable, so callers never queue or retry anything.
// ---------------------------------------------------------------------------

export const TRANSACTIONS = 'transactions';
export const INVENTORY = 'inventory';
export const VENDORS = 'vendors';

function assertConfigured() {
  if (!isFirebaseConfigured || !db) {
    throw new Error(
      'Firebase is not configured. Set the VITE_FIREBASE_* values in your .env file.'
    );
  }
}

// Firestore only settles a write's promise once the BACKEND acknowledges it,
// which by definition never happens while offline — awaiting one would freeze
// a checkout until the network came back. The write itself is committed to the
// durable local cache the moment it is issued, and Firestore replays it on its
// own, so the local commit is what this app treats as success. Anything that
// still fails (rules, bad data) is reported instead of blocking the seller.
function commit(write, what) {
  write.catch((err) => console.warn(`${what} could not be saved:`, err.message));
}

// Live view of a collection. `onData(rows, pendingWrites, fromCache)` fires
// first from the local cache (instantly, even offline) and again whenever the
// server agrees. Cached rows stay usable even when the listener reports an
// error, so read failures are surfaced through `onError` rather than thrown.
function subscribeCollection(name, onData, { orderField, direction = 'desc', onError } = {}) {
  if (!isFirebaseConfigured || !db) {
    onData([], 0, true);
    return () => {};
  }

  const base = collection(db, name);
  const target = orderField ? query(base, orderBy(orderField, direction)) : base;

  const publish = (snap) => {
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const pending = snap.docs.filter((d) => d.metadata.hasPendingWrites).length;
    onData(rows, pending, snap.metadata.fromCache);
  };

  // Paint from the local cache before anything else. This read never touches
  // the network, so a fresh install that has no connection (or can't reach the
  // backend yet) renders its real state instead of waiting on a listener that
  // may have nothing to deliver.
  getDocsFromCache(target).then(publish).catch(() => {});

  return onSnapshot(
    target,
    // Metadata changes matter here: a locally queued write turning into an
    // acknowledged one changes nothing about the document, so without this the
    // listener never re-fires and the "waiting to sync" badge sticks.
    { includeMetadataChanges: true },
    (snap) => {
      publish(snap);
      onError?.(null);
    },
    (err) => {
      console.warn(`Firestore "${name}" listener:`, err.message);
      onError?.(err.message || `Could not read "${name}"`);
    }
  );
}

// Ask Firestore to retry its connection now instead of waiting out its backoff.
export async function refreshFromServer() {
  if (db) await enableNetwork(db);
}

export function subscribeTransactions(onData, onError) {
  return subscribeCollection(TRANSACTIONS, onData, { orderField: 'created_at', onError });
}

export function subscribeInventory(onData, onError) {
  return subscribeCollection(INVENTORY, onData, { orderField: 'item_name', direction: 'asc', onError });
}

export function subscribeVendors(onData, onError) {
  return subscribeCollection(VENDORS, onData, { orderField: 'created_at', onError });
}

// ---- Transactions ----

// Create a sale / purchase / expense. The document id is generated on the
// client before the write, so the caller can reference the record immediately
// without a temporary id or a follow-up read.
export function addTransaction(record) {
  assertConfigured();
  const ref = doc(collection(db, TRANSACTIONS));
  commit(
    setDoc(ref, { ...record, created_at: record.created_at || new Date().toISOString() }),
    'Transaction'
  );
  return ref.id;
}

export function deleteTransaction(id) {
  if (!id) throw new Error('Missing transaction id');
  assertConfigured();
  commit(deleteDoc(doc(db, TRANSACTIONS, id)), 'Delete');
}

// ---- Inventory ----

// Inventory rows keep the column names remote rows have always used
// (item_name / retail_price / stock_quantity / barcode) so every consumer and
// the migration script keep working unchanged.
export function toProductShape(row) {
  return {
    id: row.id,
    name: row.item_name || row.name || 'Unnamed item',
    unit: row.unit || 'units',
    price: Number(row.retail_price ?? row.price ?? 0),
    stock: Number(row.stock_quantity ?? row.stock ?? 0),
    barcode: row.barcode || null
  };
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

// Insert a new item or edit one in place. Returns the document id.
export function saveInventoryItem(payload, existingId = null) {
  assertConfigured();
  const ref = existingId ? doc(db, INVENTORY, existingId) : doc(collection(db, INVENTORY));
  commit(setDoc(ref, payload, { merge: true }), 'Item');
  return ref.id;
}

// Stock-in for a purchase. `increment` is applied server-side, so concurrent
// edits can't overwrite each other, and it queues when offline like any other
// write. Replaces the old Postgres RPC + hand-rolled retry queue.
export function incrementStock(productId, delta) {
  const amount = Number(delta);
  if (!productId || !(amount > 0)) return;
  assertConfigured();
  commit(
    updateDoc(doc(db, INVENTORY, productId), { stock_quantity: increment(amount) }),
    'Stock update'
  );
}

// ---- Vendors ----

// Insert one vendor. Accepts both gstNo (camel) and gst_no (snake) so callers
// can't silently drop the GST number through a naming mismatch.
export function insertVendor(vendor) {
  assertConfigured();
  const { name, phone, type = 'customer' } = vendor;
  const gstRaw = vendor.gstNo ?? vendor.gst_no;

  const row = {
    name: String(name || '').trim(),
    gst_no: gstRaw?.trim() || null,
    phone: phone?.trim() || null,
    type,
    created_at: new Date().toISOString()
  };

  const ref = doc(collection(db, VENDORS));
  commit(setDoc(ref, row), 'Vendor');
  return { id: ref.id, ...row };
}
