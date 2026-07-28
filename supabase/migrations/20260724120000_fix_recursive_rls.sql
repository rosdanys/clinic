-- ============================================================================
-- FIX: Recursive RLS policies causing 500 errors
-- Replaces ALL subqueries to profiles with security definer helper
-- ============================================================================

-- 1. Create security definer helper (bypasses RLS, no recursion)
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'Admin'
  );
$$ language sql security definer stable;

-- 2. Fix profiles policies
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Admins can insert profiles" on public.profiles;
drop policy if exists "Admins can update profiles" on public.profiles;

create policy "Admins can view all profiles" on public.profiles
  for select using (public.is_admin());

create policy "Admins can insert profiles" on public.profiles
  for insert with check (public.is_admin());

create policy "Admins can update profiles" on public.profiles
  for update using (public.is_admin());

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- 3. Fix payroll policies
drop policy if exists "Admins can read payroll" on public.payroll;
drop policy if exists "Admins can insert payroll" on public.payroll;

create policy "Admins can read payroll" on public.payroll
  for select using (public.is_admin());

create policy "Admins can insert payroll" on public.payroll
  for insert with check (public.is_admin());

-- 4. Fix expenses policies
drop policy if exists "Admins can read expenses" on public.expenses;
drop policy if exists "Admins can insert expenses" on public.expenses;

create policy "Admins can read expenses" on public.expenses
  for select using (public.is_admin());

create policy "Admins can insert expenses" on public.expenses
  for insert with check (public.is_admin());
