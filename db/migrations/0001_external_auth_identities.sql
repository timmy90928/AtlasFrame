-- AtlasFrame trusts the external Workers API's ES256 AtlasFrame JWT instead of
-- Supabase Auth. Existing profile ids remain stable internal UUIDs.
alter table profiles drop constraint if exists profiles_id_fkey;
alter table profiles add column if not exists auth_subject varchar(255);
alter table profiles add column if not exists auth_email varchar(320);
create unique index if not exists profiles_auth_subject_unique
  on profiles(auth_subject) where auth_subject is not null;

create or replace function atlasframe_assert_allowlisted(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare user_email text;
begin
  select auth_email into user_email from profiles where id = p_user_id;
  if user_email is null or not exists (select 1 from alpha_allowlist where lower(email) = lower(user_email) and is_active) then
    raise exception 'ALPHA_ALLOWLIST_REQUIRED' using errcode = 'P0001';
  end if;
end; $$;
