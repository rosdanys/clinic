-- ============================================================================
-- MIGRATION: Create all clinic tables
-- Description: Creates all tables, relationships, RLS policies, indexes, and
--              triggers for the Clinic Control system.
-- ============================================================================

-- 0. EXTENSIONS
create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. PROFILES (extends auth.users)
-- ============================================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text not null,
  role        text not null check (role in ('Admin', 'Médico', 'Recepción', 'Especialista')),
  phone       text,
  specialty   text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Security definer helper to avoid recursive RLS
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'Admin'
  );
$$ language sql security definer stable;

alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Admins can view all profiles" on public.profiles
  for select using (public.is_admin());

create policy "Admins can insert profiles" on public.profiles
  for insert with check (public.is_admin());

create policy "Admins can update profiles" on public.profiles
  for update using (public.is_admin());

create index if not exists idx_profiles_role on public.profiles(role);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'role', 'Recepción')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 2. INSURANCE PROVIDERS (catálogo)
-- ============================================================================
create table if not exists public.insurance_providers (
  id    uuid primary key default gen_random_uuid(),
  name  text not null unique
);

alter table public.insurance_providers enable row level security;

create policy "Authenticated users can read insurance providers" on public.insurance_providers
  for select using (auth.role() = 'authenticated');

-- ============================================================================
-- 3. EXPENSE CATEGORIES (catálogo)
-- ============================================================================
create table if not exists public.expense_categories (
  id    uuid primary key default gen_random_uuid(),
  name  text not null unique
);

alter table public.expense_categories enable row level security;

create policy "Authenticated users can read expense categories" on public.expense_categories
  for select using (auth.role() = 'authenticated');

-- ============================================================================
-- 4. PROCEDURES (catálogo)
-- ============================================================================
create table if not exists public.procedures (
  id    uuid primary key default gen_random_uuid(),
  name  text not null unique,
  cost  numeric(10,2) not null default 0
);

alter table public.procedures enable row level security;

create policy "Authenticated users can read procedures" on public.procedures
  for select using (auth.role() = 'authenticated');

-- ============================================================================
-- 5. PATIENTS
-- ============================================================================
create table if not exists public.patients (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  date_of_birth         date not null,
  gender                text not null default 'Masculino',
  phone                 text,
  classification        text not null default 'Nuevo' check (classification in ('Nuevo', 'Seguimiento')),
  is_new                boolean not null default true,
  is_established        boolean not null default false,
  consult_reason        text,
  has_insurance         boolean not null default false,
  insurance_provider_id uuid references public.insurance_providers(id) on delete set null,
  created_by            uuid references public.profiles(id) on delete set null,
  created_at            timestamptz not null default now()
);

alter table public.patients enable row level security;

create policy "Authenticated users can read patients" on public.patients
  for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert patients" on public.patients
  for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can update patients" on public.patients
  for update using (auth.role() = 'authenticated');

create policy "Authenticated users can delete patients" on public.patients
  for delete using (auth.role() = 'authenticated');

create index if not exists idx_patients_classification on public.patients(classification);
create index if not exists idx_patients_name on public.patients(name);

-- ============================================================================
-- 6. INVENTORY
-- ============================================================================
create table if not exists public.inventory (
  id                uuid primary key default gen_random_uuid(),
  product           text not null,
  category          text not null,
  initial_quantity  integer not null default 0,
  entries           integer not null default 0,
  exits             integer not null default 0,
  current_stock     integer not null default 0,
  min_stock         integer not null default 0,
  provider          text,
  unit_cost         numeric(10,2) not null default 0,
  total_cost        numeric(10,2) not null default 0,
  expiration_date   date,
  location          text
);

alter table public.inventory enable row level security;

create policy "Authenticated users can read inventory" on public.inventory
  for select using (auth.role() = 'authenticated');

create policy "Authenticated users can update inventory" on public.inventory
  for update using (auth.role() = 'authenticated');

create index if not exists idx_inventory_product on public.inventory(product);
create index if not exists idx_inventory_category on public.inventory(category);

-- ============================================================================
-- 7. APPOINTMENTS
-- ============================================================================
create table if not exists public.appointments (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.patients(id) on delete cascade,
  doctor_id   uuid not null references public.profiles(id) on delete set null,
  date        date not null,
  time        time not null,
  reason      text not null,
  type        text not null default 'Primera vez',
  status      text not null default 'Pendiente' check (status in ('Pendiente', 'Confirmada', 'En curso', 'Completada', 'Cancelada')),
  notes       text,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table public.appointments enable row level security;

create policy "Authenticated users can read appointments" on public.appointments
  for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert appointments" on public.appointments
  for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can update appointments" on public.appointments
  for update using (auth.role() = 'authenticated');

create index if not exists idx_appointments_date on public.appointments(date);
create index if not exists idx_appointments_patient on public.appointments(patient_id);
create index if not exists idx_appointments_doctor on public.appointments(doctor_id);
create index if not exists idx_appointments_status on public.appointments(status);

-- ============================================================================
-- 8. PAYMENTS
-- ============================================================================
create table if not exists public.payments (
  id                uuid primary key default gen_random_uuid(),
  appointment_id    uuid references public.appointments(id) on delete set null,
  patient_id        uuid not null references public.patients(id) on delete cascade,
  concept           text not null,
  consultation_fee  numeric(10,2) not null default 0,
  lab_fee           numeric(10,2) not null default 0,
  meds_fee          numeric(10,2) not null default 0,
  procedure_fee     numeric(10,2) not null default 0,
  other_fee         numeric(10,2) not null default 0,
  total             numeric(10,2) not null default 0,
  amount_paid       numeric(10,2) not null default 0,
  balance           numeric(10,2) not null default 0,
  method            text not null default 'Cash',
  status            text not null default 'Pendiente' check (status in ('Pagado', 'Parcial', 'Pendiente')),
  created_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now()
);

alter table public.payments enable row level security;

create policy "Authenticated users can read payments" on public.payments
  for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert payments" on public.payments
  for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can update payments" on public.payments
  for update using (auth.role() = 'authenticated');

create index if not exists idx_payments_patient on public.payments(patient_id);
create index if not exists idx_payments_status on public.payments(status);

-- ============================================================================
-- 9. ACCOUNTS RECEIVABLE (Cuentas por Cobrar)
-- ============================================================================
create table if not exists public.accounts_receivable (
  id              uuid primary key default gen_random_uuid(),
  payment_id      uuid references public.payments(id) on delete set null,
  patient_id      uuid not null references public.patients(id) on delete cascade,
  concept         text not null,
  total_amount    numeric(10,2) not null default 0,
  paid_amount     numeric(10,2) not null default 0,
  pending_amount  numeric(10,2) not null default 0,
  limit_date      date not null,
  status          text not null default 'Pendiente' check (status in ('Pagado', 'Pendiente')),
  observations    text,
  created_at      timestamptz not null default now()
);

alter table public.accounts_receivable enable row level security;

create policy "Authenticated users can read accounts_receivable" on public.accounts_receivable
  for select using (auth.role() = 'authenticated');

create policy "Authenticated users can update accounts_receivable" on public.accounts_receivable
  for update using (auth.role() = 'authenticated');

create index if not exists idx_cxc_patient on public.accounts_receivable(patient_id);
create index if not exists idx_cxc_status on public.accounts_receivable(status);
create index if not exists idx_cxc_limit_date on public.accounts_receivable(limit_date);

-- ============================================================================
-- 10. PAYROLL (Nómina)
-- ============================================================================
create table if not exists public.payroll (
  id              uuid primary key default gen_random_uuid(),
  employee_id     uuid not null references public.profiles(id) on delete cascade,
  role            text not null,
  base_salary     numeric(10,2) not null default 0,
  hours_worked    numeric(5,2) not null default 0,
  overtime_hours  numeric(5,2) not null default 0,
  commissions     numeric(10,2) not null default 0,
  bonuses         numeric(10,2) not null default 0,
  deductions      numeric(10,2) not null default 0,
  total_paid      numeric(10,2) not null default 0,
  payment_form    text not null default 'Transferencia',
  payment_date    date not null,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);

alter table public.payroll enable row level security;

create policy "Admins can read payroll" on public.payroll
  for select using (public.is_admin());

create policy "Admins can insert payroll" on public.payroll
  for insert with check (public.is_admin());

create index if not exists idx_payroll_employee on public.payroll(employee_id);
create index if not exists idx_payroll_date on public.payroll(payment_date);

-- ============================================================================
-- 11. EXPENSES
-- ============================================================================
create table if not exists public.expenses (
  id              uuid primary key default gen_random_uuid(),
  date            date not null,
  concept         text not null,
  category_id     uuid references public.expense_categories(id) on delete set null,
  provider        text,
  payment_form    text not null default 'Tarjeta',
  amount          numeric(10,2) not null default 0,
  observations    text,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);

alter table public.expenses enable row level security;

create policy "Admins can read expenses" on public.expenses
  for select using (public.is_admin());

create policy "Admins can insert expenses" on public.expenses
  for insert with check (public.is_admin());

create index if not exists idx_expenses_date on public.expenses(date);
create index if not exists idx_expenses_category on public.expenses(category_id);

-- ============================================================================
-- AUTO-UPDATE current_stock trigger for inventory
-- ============================================================================
create or replace function public.update_current_stock()
returns trigger as $$
begin
  new.current_stock := new.initial_quantity + new.entries - new.exits;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_update_current_stock on public.inventory;
create trigger trg_update_current_stock
  before insert or update on public.inventory
  for each row execute function public.update_current_stock();

-- ============================================================================
-- AUTO-CALCULATE total in payments
-- ============================================================================
create or replace function public.calculate_payment_total()
returns trigger as $$
begin
  new.total := new.consultation_fee + new.lab_fee + new.meds_fee + new.procedure_fee + new.other_fee;
  new.balance := new.total - new.amount_paid;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_calculate_payment_total on public.payments;
create trigger trg_calculate_payment_total
  before insert or update on public.payments
  for each row execute function public.calculate_payment_total();

-- ============================================================================
-- AUTO-CALCULATE pending_amount in accounts_receivable
-- ============================================================================
create or replace function public.calculate_pending_amount()
returns trigger as $$
begin
  new.pending_amount := new.total_amount - new.paid_amount;
  if new.pending_amount <= 0 then
    new.status := 'Pagado';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_calculate_pending_amount on public.accounts_receivable;
create trigger trg_calculate_pending_amount
  before insert or update on public.accounts_receivable
  for each row execute function public.calculate_pending_amount();
