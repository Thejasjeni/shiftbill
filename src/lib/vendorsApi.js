import { supabase, isSupabaseConfigured } from './supabaseClient';

// ---------------------------------------------------------------------------
// Vendors (clients/suppliers) + products service — used by useVendors /
// useProducts hooks. All calls are env-guarded: when Supabase isn't
// configured they throw a friendly error the UI can surface instead of
// crashing on `null.from`.
// ---------------------------------------------------------------------------

function assertSupabaseConfigured() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
    );
  }
}

// Translate a PostgREST error into something user-actionable.
function friendlyError(err, table) {
  // PGRST205 = table missing from schema cache (e.g. migration not run yet)
  if (err?.code === 'PGRST205' || /does not exist/i.test(err?.message || '')) {
    return new Error(
      `The "${table}" table is missing in Supabase. Run database/schema.sql in the Supabase SQL Editor first.`
    );
  }
  return err;
}

// Normalize an inventory/product row into the shape the UI consumes.
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

// Fetch every vendor. Call on component mount so the list survives refreshes.
export async function fetchVendors() {
  assertSupabaseConfigured();
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw friendlyError(error, 'vendors');
  return data || [];
}

// Insert one vendor. Normalizes optional fields before sending.
export async function insertVendor({ name, gstNo, phone, type = 'customer' }) {
  assertSupabaseConfigured();

  const payload = {
    name: name.trim(),
    gst_no: gstNo?.trim() || null,
    phone: phone?.trim() || null,
    type
  };

  const { data, error } = await supabase
    .from('vendors')
    .insert(payload)
    .select()
    .single();

  if (error) throw friendlyError(error, 'vendors');
  return data;
}

// Active products for the Add-Purchase searchable picker.
// Reads the app's existing `inventory` table (the product catalog) and
// normalizes rows for the UI.
export async function fetchProducts() {
  assertSupabaseConfigured();
  const { data, error } = await supabase
    .from('inventory')
    .select('id, item_name, retail_price, wholesale_price, stock_quantity, barcode')
    .order('item_name');

  if (error) throw friendlyError(error, 'inventory');
  return (data || []).map(toProductShape);
}
