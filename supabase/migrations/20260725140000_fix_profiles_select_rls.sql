-- Allow all authenticated users to read profiles (needed for doctor/employee selectors)
drop policy if exists "Authenticated users can view all profiles" on public.profiles;

create policy "Authenticated users can view all profiles"
  on public.profiles for select
  using (auth.role() = 'authenticated');
