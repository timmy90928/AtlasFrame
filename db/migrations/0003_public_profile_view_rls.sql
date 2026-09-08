-- A security-invoker view keeps the public Data API constrained by both RLS
-- and column privileges. Only display-safe profile fields are selectable.
drop view if exists public.public_profiles;
drop policy if exists "public profile fields are readable" on profiles;
create policy "public profile fields are readable" on profiles
  for select to anon, authenticated using (true);

grant select (username, display_name, avatar_key, bio, website, country_code, created_at)
  on profiles to anon, authenticated;

create view public.public_profiles
with (security_barrier = true, security_invoker = true) as
  select username, display_name, avatar_key, bio, website, country_code, created_at
  from profiles;
revoke all on public.public_profiles from public;
grant select on public.public_profiles to anon, authenticated;
