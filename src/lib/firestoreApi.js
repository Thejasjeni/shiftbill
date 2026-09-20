import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  increment,
  onSnapshot,
  getDocFromCache,
  getDocs,
  getDocsFromCache,
  query,
  where,
  writeBatch,
  enableNetwork
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebaseClient';
import { ownerOf } from './auth';

// ---------------------------------------------------------------------------
// Firestore data layer — owns the app's three collections and its settings:
//   transactions : one document per sale / purchase / expense
//   inventory    : the product catalog (also the POS item list)
//   vendors      : clients and suppliers
//   settings     : the business profile — one document per account when signed
//                  in, the shared one below when there is nobody to key it to
//
// Offline-first comes from Firestore itself (see firebaseClient): every write
// below is applied to the local cache immediately and replayed automatically
// once the backend is reachable, so callers never queue or retry anything.
// ---------------------------------------------------------------------------

export const TRANSACTIONS = 'transactions';
export const INVENTORY = 'inventory';
export const VENDORS = 'vendors';
export const SETTINGS = 'settings';

// One shop, one profile — so it is a document, not a row in a collection. It is
// addressed by owner: each account keeps its profile at its own uid, so one
// shop's identity can never sit on another account's path (which is what the
// owner-scoped rules would otherwise refuse to hand back), and a device with no
// account keeps the one document this app has always used.
export const SIGNED_OUT_BUSINESS_PROFILE = 'businessProfile';

function businessProfileDoc() {
  return doc(db, SETTINGS, ownerOf() || SIGNED_OUT_BUSINESS_PROFILE);
}

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
// still fails (rules, bad data) is reported instead of blocking the seller;
// the promise settles with that message, or null when the write went through,
// for the caller that has to tell the user (settings saves do).
function commit(write, what) {
  return write.then(
    () => null,
    (err) => {
      console.warn(`${what} could not be saved:`, err.message);
      return err.message;
    }
  );
}

// Ownership: a document carries its writer's uid, which is what lets the
// owner-scoped rules separate one account's ledger from another's (see
// firestore.rules.owner-scoped). Signed out, `ownerOf()` is null and documents
// are written exactly as they always were, which is what keeps the app usable
// before sign-in is provisioned.
function owned(fields) {
  const uid = ownerOf();
  return uid ? { ...fields, ownerId: uid } : fields;
}

const byCreatedAtDesc = (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0);
const byNameAsc = (a, b) => String(a.item_name || '').localeCompare(String(b.item_name || ''));

// Live view of a collection. `onData(rows, pendingWrites, fromCache)` fires
// first from the local cache (instantly, even offline) and again whenever the
// server agrees. Cached rows stay usable even when the listener reports an
// error, so read failures are surfaced through `onError` rather than thrown.
//
// Once someone is signed in the query is scoped to their uid; signed out it
// reads the whole collection, as it always did. Sorting happens here rather
// than through `orderBy` both to keep those two modes in the same order and
// because scoping plus a server sort would need a composite index.
function subscribeCollection(name, onData, { compare, onError } = {}) {
  if (!isFirebaseConfigured || !db) {
    onData([], 0, true);
    return () => {};
  }

  const base = collection(db, name);
  const uid = ownerOf();
  const target = uid ? query(base, where('ownerId', '==', uid)) : base;

  const publish = (snap) => {
    // `synced` is per row and comes from the snapshot's own metadata, so a row
    // only ever claims to be waiting while it really is: the report's status
    // badge reads this instead of a document field nobody writes.
    const rows = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      synced: !d.metadata.hasPendingWrites
    }));
    if (compare) rows.sort(compare);
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
      // A null message means "this read is healthy" — it clears an error a
      // previous attempt reported. Only a real message is a failure.
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
  return subscribeCollection(TRANSACTIONS, onData, { compare: byCreatedAtDesc, onError });
}

export function subscribeInventory(onData, onError) {
  return subscribeCollection(INVENTORY, onData, { compare: byNameAsc, onError });
}

export function subscribeVendors(onData, onError) {
  return subscribeCollection(VENDORS, onData, { compare: byCreatedAtDesc, onError });
}

// Live view of one settings document whose path its caller has already checked
// there is a backend for. Same contract as the collections —
// `onData(data, pendingWrites, fromCache)` with `data` null until one exists —
// so callers can tell "nothing saved yet" from "the answer hasn't arrived".
function subscribeDocument(ref, onData, onError) {
  const publish = (snap) => onData(
    snap.exists() ? snap.data() : null,
    snap.metadata.hasPendingWrites ? 1 : 0,
    snap.metadata.fromCache
  );

  // The local cache answers first (instantly, even offline) so Settings shows
  // the saved profile without waiting on the network.
  getDocFromCache(ref).then(publish).catch(() => {});

  return onSnapshot(
    ref,
    { includeMetadataChanges: true },
    (snap) => {
      publish(snap);
      onError?.(null);
    },
    (err) => {
      console.warn(`Firestore "${ref.path}" listener:`, err.message);
      onError?.(err.message || `Could not read "${ref.path}"`);
    }
  );
}

// The account's own profile, or the shared one while signed out. The path is
// resolved per subscription, so signing in or out follows the account.
export function subscribeBusinessProfile(onData, onError) {
  if (!isFirebaseConfigured || !db) {
    onData(null, 0, true);
    return () => {};
  }
  return subscribeDocument(businessProfileDoc(), onData, onError);
}

// ---- Transactions ----

// Create a sale / purchase / expense. The document id is generated on the
// client before the write, so the caller can reference the record immediately
// without a temporary id or a follow-up read.
export function addTransaction(record) {
  assertConfigured();
  const ref = doc(collection(db, TRANSACTIONS));
  commit(
    setDoc(ref, owned({ ...record, created_at: record.created_at || new Date().toISOString() })),
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
    code: row.code || row.barcode || '',
    lowStockThreshold: row.low_stock_threshold
  };
}

// Insert a new item or edit one in place. Returns the document id.
export function saveInventoryItem(payload, existingId = null) {
  assertConfigured();
  const ref = existingId ? doc(db, INVENTORY, existingId) : doc(collection(db, INVENTORY));
  commit(setDoc(ref, owned(payload), { merge: true }), 'Item');
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

  const stored = owned(row);
  const ref = doc(collection(db, VENDORS));
  commit(setDoc(ref, stored), 'Vendor');
  return { id: ref.id, ...stored };
}

// ---- Settings ----

// Save the business profile to the owner's own document. Merged, so a field an
// older profile shape doesn't carry is left as it was rather than wiped.
// Queues offline like any write; resolves with a failure message, or null once
// the backend has it.
export function saveBusinessProfile(profile) {
  assertConfigured();
  return commit(
    setDoc(businessProfileDoc(), owned(profile), { merge: true }),
    'Business profile'
  );
}

// ---- Ownership ----

// One-time adoption of the ledger written before sign-in existed: every
// document with no ownerId is stamped with the signed-in uid, so releasing the
// owner-scoped rules (which deny documents that aren't owned) can't lock the
// existing data away. Idempotent — once stamped, nothing matches again — and
// offline-safe, since the stamps queue in the cache like any other write.
// Firestore can't query for an absent field, so each collection is read and
// filtered locally; a personal ledger is small and this runs at sign-in.
export async function claimUnownedDocuments(uid) {
  if (!uid || !isFirebaseConfigured || !db) return 0;

  let claimed = 0;
  for (const name of [TRANSACTIONS, INVENTORY, VENDORS]) {
    const snap = await getDocs(collection(db, name));
    const orphans = snap.docs.filter((d) => !d.data().ownerId);
    // Batches cap at 500 writes, so a large ledger is stamped in chunks.
    for (let i = 0; i < orphans.length; i += 400) {
      const batch = writeBatch(db);
      orphans.slice(i, i + 400).forEach((d) => batch.update(d.ref, { ownerId: uid }));
      await batch.commit();
      claimed += Math.min(400, orphans.length - i);
    }
  }

  return claimed;
}
