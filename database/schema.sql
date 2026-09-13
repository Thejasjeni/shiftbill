-- ============================================================================
-- SwiftBill — Schema additions: vendors (clients/suppliers) + atomic stock-in
-- for the existing `inventory` table.
-- Run in Supabase Dashboard → SQL Editor (idempotent; safe to re-run).
-- (transactions and inventory tables already exist in this project.)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) VENDORS — unified clients/suppliers table (new)
-- ---------------------------------------------------------------------------
create table if not exists public.vendors (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  gst_no     text,
  phone      text,
  type       text not null default 'customer'
             check (type in ('customer', 'supplier')),
  balance    numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at fresh automatically
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists vendors_set_updated_at on public.vendors;
create trigger vendors_set_updated_at
  before update on public.vendors
  for each row execute function public.set_updated_at();

-- Same phone cannot map to two vendor rows (ignores blank/absent phones)
create or replace function public.normalize_phone(raw text)
returns text
language plpgsql
immutable
as $$
begin
  return regexp_replace(coalesce(raw, ''), '[^0-9]', '', 'g');
end;
$$;

create unique index if not exists vendors_phone_unique
  on public.vendors (public.normalize_phone(phone))
  where coalesce(public.normalize_phone(phone), '') <> '';

create index if not exists vendors_name_idx on public.vendors (name);
create index if not exists vendors_type_idx on public.vendors (type);

-- ---------------------------------------------------------------------------
-- 2) Row Level Security — the app talks to Supabase with the anon key
--    client-side, so policies are required for any access at all.
-- ---------------------------------------------------------------------------

alter table public.vendors enable row level security;

-- VARIANT A (single-user / quick start): allow the anon role.
-- Replace with VARIANT B before going multi-user or public.
create policy "vendors_anon_all" on public.vendors for all using (true) with check (true);

-- VARIANT B (multi-user): authenticate users first, then swap policies:
-- create policy "vendors_user_all" on public.vendors for all
--   to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- 3) Atomic stock-in for purchases (works with the EXISTING inventory table)
--    Client-computed totals race; this RPC updates server-side atomically.
-- ---------------------------------------------------------------------------

create or replace function public.increment_inventory_stock(p_id uuid, p_delta numeric)
returns void
language sql
as $$
  update public.inventory
     set stock_quantity = stock_quantity + p_delta
   where id = p_id;
$$;

-- Grant execute to anon so the client can call it (tighten with auth later)
grant execute on function public.increment_inventory_stock(uuid, numeric) to anon, authenticated;
