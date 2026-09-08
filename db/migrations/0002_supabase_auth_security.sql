-- AtlasFrame now maps a stable internal profile to a Supabase Auth user.
-- Existing profiles retain their UUID and are linked by verified email at the
-- user's first Supabase sign-in.
alter table profiles add column if not exists auth_user_id uuid references auth.users(id);
create unique index if not exists profiles_auth_user_id_unique
  on profiles(auth_user_id) where auth_user_id is not null;

-- Keep the entire private profile row out of the Data API. The application
-- reads it with the service-role client; public consumers use this fixed view.
drop policy if exists "public profiles are readable" on profiles;
drop policy if exists "public photos are readable" on photos;
drop policy if exists "public places are readable" on places;
alter table alpha_allowlist enable row level security;

revoke all on table alpha_allowlist, profiles, photos, photo_assets,
  photo_metadata, places, photo_locations, storage_reservations
  from anon, authenticated;

create or replace view public.public_profiles
with (security_barrier = true, security_invoker = false) as
  select username, display_name, avatar_key, bio, website, country_code, created_at
  from profiles;
revoke all on public.public_profiles from public;
grant select on public.public_profiles to anon, authenticated;

-- These routines are internal Worker RPCs. SECURITY DEFINER must never be
-- callable through the public Data API.
revoke execute on function atlasframe_assert_allowlisted(uuid) from public, anon, authenticated;
revoke execute on function reserve_photo_upload(uuid, uuid, uuid, text, text, bigint) from public, anon, authenticated;
revoke execute on function complete_photo_upload(uuid, uuid, jsonb) from public, anon, authenticated;
revoke execute on function search_places(text, double precision, double precision) from public, anon, authenticated;
revoke execute on function set_photo_location(uuid, uuid, uuid, boolean) from public, anon, authenticated;
revoke execute on function map_photos_in_bbox(text, double precision, double precision, double precision, double precision) from public, anon, authenticated;
grant execute on function atlasframe_assert_allowlisted(uuid) to service_role;
grant execute on function reserve_photo_upload(uuid, uuid, uuid, text, text, bigint) to service_role;
grant execute on function complete_photo_upload(uuid, uuid, jsonb) to service_role;
grant execute on function search_places(text, double precision, double precision) to service_role;
grant execute on function set_photo_location(uuid, uuid, uuid, boolean) to service_role;
grant execute on function map_photos_in_bbox(text, double precision, double precision, double precision, double precision) to service_role;

create index if not exists photo_locations_place_id_idx on photo_locations(place_id);
create index if not exists places_parent_id_idx on places(parent_id);

create extension if not exists pg_cron with schema extensions;

create or replace function expire_storage_reservations()
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare expired_count integer;
begin
  update storage_reservations
    set status = 'EXPIRED'
    where status = 'PENDING' and expires_at <= now();
  get diagnostics expired_count = row_count;
  return expired_count;
end;
$$;

revoke execute on function expire_storage_reservations() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'atlasframe-expire-storage-reservations') then
    perform cron.unschedule('atlasframe-expire-storage-reservations');
  end if;
end;
$$;

select cron.schedule(
  'atlasframe-expire-storage-reservations',
  '*/15 * * * *',
  'select public.expire_storage_reservations()'
);
