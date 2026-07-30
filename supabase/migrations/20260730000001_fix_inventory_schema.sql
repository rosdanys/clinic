-- ============================================================================
-- Fix inventory schema: missing columns, RLS policies, and triggers
-- ============================================================================

-- 1. Add missing columns used by the Settings > Inventario form
alter table public.inventory
  add column if not exists purchase_date date,
  add column if not exists observations text,
  add column if not exists created_by uuid references public.profiles(id),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- 2. RLS policies for INSERT and DELETE (only SELECT and UPDATE existed)
create policy "Authenticated users can insert inventory"
  on public.inventory for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can delete inventory"
  on public.inventory for delete
  using (auth.role() = 'authenticated');

-- 3. Extend existing trigger to also calculate total_cost = current_stock * unit_cost
create or replace function public.update_current_stock()
returns trigger as $$
begin
  new.current_stock := new.initial_quantity + new.entries - new.exits;
  new.total_cost := new.current_stock * new.unit_cost;
  return new;
end;
$$ language plpgsql;

-- 4. Auto-update updated_at on row modification
create or replace function public.update_inventory_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_inventory_updated_at on public.inventory;
create trigger trg_inventory_updated_at
  before update on public.inventory
  for each row execute function public.update_inventory_timestamp();
