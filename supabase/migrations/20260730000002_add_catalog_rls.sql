-- ============================================================================
-- Add INSERT/UPDATE/DELETE RLS policies for master catalogs
-- Only SELECT policies existed on insurance_providers and procedures
-- ============================================================================

create policy "Admins can insert insurance providers"
  on public.insurance_providers for insert
  with check (public.is_admin());

create policy "Admins can update insurance providers"
  on public.insurance_providers for update
  using (public.is_admin());

create policy "Admins can delete insurance providers"
  on public.insurance_providers for delete
  using (public.is_admin());

create policy "Admins can insert procedures"
  on public.procedures for insert
  with check (public.is_admin());

create policy "Admins can update procedures"
  on public.procedures for update
  using (public.is_admin());

create policy "Admins can delete procedures"
  on public.procedures for delete
  using (public.is_admin());
