-- Allow users to insert their own profile (for signups before the trigger existed)
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);
