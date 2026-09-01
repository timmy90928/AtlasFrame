create extension if not exists postgis;
create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

create type photo_visibility as enum ('PUBLIC', 'UNLISTED', 'PRIVATE');
create type photo_processing_status as enum ('PENDING', 'READY', 'FAILED');
create type location_source as enum ('EXIF', 'MANUAL', 'TRIP', 'INFERRED');
create type location_precision as enum ('EXACT', 'CITY_ONLY', 'HIDDEN', 'APPROXIMATE');
create type reservation_status as enum ('PENDING', 'COMMITTED', 'EXPIRED', 'CANCELLED');

create table alpha_allowlist (
  email varchar(320) primary key,
  is_active boolean not null default true,
  note text,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username varchar(32) not null unique check (username ~ '^[a-z0-9][a-z0-9_-]{2,31}$'),
  display_name varchar(80), avatar_key varchar(512), bio text, website varchar(2048), country_code varchar(2),
  storage_quota_bytes bigint not null default 524288000 check (storage_quota_bytes >= 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table photos (
  id uuid primary key, owner_id uuid not null references profiles(id) on delete cascade,
  title varchar(160), description text, visibility photo_visibility not null default 'PUBLIC',
  captured_at timestamptz, processing_status photo_processing_status not null default 'PENDING',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create index photos_owner_ready_idx on photos(owner_id, created_at desc) where deleted_at is null;

create table photo_assets (
  id uuid primary key, photo_id uuid not null unique references photos(id) on delete cascade,
  object_key varchar(1024) not null unique, mime_type varchar(100) not null,
  file_size bigint not null check (file_size > 0), width integer, height integer, checksum varchar(128),
  created_at timestamptz not null default now()
);

create table photo_metadata (
  photo_id uuid primary key references photos(id) on delete cascade,
  camera_make varchar(120), camera_model varchar(160), lens_model varchar(160), focal_length double precision,
  aperture double precision, shutter_seconds double precision, iso integer, original_captured_at timestamptz,
  original_latitude double precision, original_longitude double precision, orientation integer, width integer, height integer,
  metadata_source varchar(40) not null default 'CLIENT_EXIF', metadata_verified boolean not null default false,
  raw_exif jsonb, created_at timestamptz not null default now()
);

create table places (
  id uuid primary key, parent_id uuid references places(id), type varchar(32) not null default 'CUSTOM',
  name varchar(160) not null, normalized_name varchar(160) not null, slug varchar(200) not null unique,
  coordinates geography(point, 4326) not null, country_code varchar(2),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index places_coordinates_gist_idx on places using gist(coordinates);
create index places_name_trgm_idx on places using gin(normalized_name gin_trgm_ops);

create table photo_locations (
  photo_id uuid primary key references photos(id) on delete cascade,
  owner_id uuid not null references profiles(id) on delete cascade,
  place_id uuid references places(id), coordinates geography(point, 4326), display_name varchar(160),
  source location_source not null default 'MANUAL', precision location_precision not null default 'EXACT',
  is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check ((place_id is null) or (coordinates is not null))
);
create index photo_locations_coordinates_gist_idx on photo_locations using gist(coordinates);
create unique index photo_locations_owner_place_unique_active
  on photo_locations(owner_id, place_id) where place_id is not null and is_active = true;

create table storage_reservations (
  id uuid primary key, user_id uuid not null references profiles(id) on delete cascade,
  photo_id uuid not null unique references photos(id) on delete cascade, reserved_bytes bigint not null check (reserved_bytes > 0),
  expires_at timestamptz not null, status reservation_status not null default 'PENDING', created_at timestamptz not null default now()
);
create index storage_reservations_active_idx on storage_reservations(user_id, expires_at) where status = 'PENDING';

create or replace function atlasframe_assert_allowlisted(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare user_email text;
begin
  select email into user_email from auth.users where id = p_user_id;
  if user_email is null or not exists (select 1 from alpha_allowlist where lower(email) = lower(user_email) and is_active) then
    raise exception 'ALPHA_ALLOWLIST_REQUIRED' using errcode = 'P0001';
  end if;
end; $$;

create or replace function reserve_photo_upload(
  p_user_id uuid, p_photo_id uuid, p_asset_id uuid, p_object_key text, p_mime_type text, p_file_size bigint
) returns timestamptz language plpgsql security definer set search_path = public as $$
declare quota bigint; used_bytes bigint; user_reserved_bytes bigint; platform_reserved_bytes bigint; expires_at_value timestamptz := now() + interval '20 minutes';
begin
  perform atlasframe_assert_allowlisted(p_user_id);
  select storage_quota_bytes into quota from profiles where id = p_user_id for update;
  if quota is null then raise exception 'PROFILE_NOT_FOUND' using errcode = 'P0001'; end if;
  update storage_reservations set status = 'EXPIRED' where status = 'PENDING' and expires_at <= now();
  select coalesce(sum(a.file_size), 0) into used_bytes from photo_assets a join photos p on p.id = a.photo_id where p.owner_id = p_user_id and p.processing_status = 'READY' and p.deleted_at is null;
  select coalesce(sum(reserved_bytes), 0) into user_reserved_bytes from storage_reservations where user_id = p_user_id and status = 'PENDING' and expires_at > now();
  select coalesce(sum(reserved_bytes), 0) into platform_reserved_bytes from storage_reservations where status = 'PENDING' and expires_at > now();
  if used_bytes + user_reserved_bytes + p_file_size > quota then raise exception 'STORAGE_QUOTA_EXCEEDED' using errcode = 'P0001'; end if;
  if (select coalesce(sum(a.file_size), 0) from photo_assets a join photos p on p.id = a.photo_id where p.processing_status = 'READY' and p.deleted_at is null) + platform_reserved_bytes + p_file_size > 8589934592 then raise exception 'PLATFORM_STORAGE_LIMIT_REACHED' using errcode = 'P0001'; end if;
  insert into photos(id, owner_id, processing_status) values (p_photo_id, p_user_id, 'PENDING');
  insert into photo_assets(id, photo_id, object_key, mime_type, file_size) values (p_asset_id, p_photo_id, p_object_key, p_mime_type, p_file_size);
  insert into storage_reservations(id, user_id, photo_id, reserved_bytes, expires_at) values (gen_random_uuid(), p_user_id, p_photo_id, p_file_size, expires_at_value);
  return expires_at_value;
end; $$;

create or replace function complete_photo_upload(p_user_id uuid, p_photo_id uuid, p_metadata jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  update storage_reservations set status = 'EXPIRED' where status = 'PENDING' and expires_at <= now();
  if not exists (select 1 from storage_reservations where photo_id = p_photo_id and user_id = p_user_id and status = 'PENDING' and expires_at > now()) then
    raise exception 'UPLOAD_RESERVATION_EXPIRED' using errcode = 'P0001';
  end if;
  insert into photo_metadata(photo_id, camera_make, camera_model, lens_model, focal_length, aperture, shutter_seconds, iso, original_captured_at, original_latitude, original_longitude, orientation, width, height, raw_exif)
  values (p_photo_id, p_metadata->>'cameraMake', p_metadata->>'cameraModel', p_metadata->>'lensModel', (p_metadata->>'focalLength')::double precision, (p_metadata->>'aperture')::double precision, (p_metadata->>'shutterSeconds')::double precision, (p_metadata->>'iso')::integer, nullif(p_metadata->>'originalCapturedAt', '')::timestamptz, (p_metadata->>'originalLatitude')::double precision, (p_metadata->>'originalLongitude')::double precision, (p_metadata->>'orientation')::integer, (p_metadata->>'width')::integer, (p_metadata->>'height')::integer, p_metadata)
  on conflict (photo_id) do nothing;
  update photos set processing_status = 'READY', captured_at = nullif(p_metadata->>'originalCapturedAt', '')::timestamptz, updated_at = now() where id = p_photo_id and owner_id = p_user_id;
  update storage_reservations set status = 'COMMITTED' where photo_id = p_photo_id and user_id = p_user_id and status = 'PENDING';
end; $$;

create or replace function search_places(p_query text, p_lat double precision, p_lng double precision)
returns table(id uuid, name varchar, latitude double precision, longitude double precision, distance_meters double precision)
language sql stable security definer set search_path = public as $$
  select id, name, st_y(coordinates::geometry), st_x(coordinates::geometry), st_distance(coordinates, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography)
  from places where normalized_name % lower(p_query) or st_dwithin(coordinates, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, 150)
  order by similarity(normalized_name, lower(p_query)) desc, coordinates <-> st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography limit 8;
$$;

create or replace function set_photo_location(p_user_id uuid, p_photo_id uuid, p_place_id uuid, p_replace_existing boolean)
returns void language plpgsql security definer set search_path = public as $$
declare existing_photo_id uuid; place_coordinates geography; place_name text;
begin
  select id into existing_photo_id from photos where id = p_photo_id and owner_id = p_user_id and deleted_at is null;
  if existing_photo_id is null then raise exception 'PHOTO_NOT_FOUND' using errcode = 'P0001'; end if;
  select coordinates, name into place_coordinates, place_name from places where id = p_place_id;
  if place_coordinates is null then raise exception 'PLACE_NOT_FOUND' using errcode = 'P0001'; end if;
  select photo_id into existing_photo_id from photo_locations where owner_id = p_user_id and place_id = p_place_id and is_active and photo_id <> p_photo_id;
  if existing_photo_id is not null and not p_replace_existing then raise exception 'PLACE_PHOTO_ALREADY_EXISTS' using errcode = 'P0001', detail = existing_photo_id::text; end if;
  if existing_photo_id is not null then update photo_locations set place_id = null, coordinates = null, display_name = null, updated_at = now() where photo_id = existing_photo_id; end if;
  insert into photo_locations(photo_id, owner_id, place_id, coordinates, display_name, source, precision) values (p_photo_id, p_user_id, p_place_id, place_coordinates, place_name, 'MANUAL', 'EXACT')
  on conflict (photo_id) do update set place_id = excluded.place_id, coordinates = excluded.coordinates, display_name = excluded.display_name, source = 'MANUAL', precision = 'EXACT', is_active = true, updated_at = now();
end; $$;

create or replace function map_photos_in_bbox(p_username text, p_min_lat double precision, p_min_lng double precision, p_max_lat double precision, p_max_lng double precision)
returns table(photo_id uuid, place_id uuid, lat double precision, lng double precision, thumbnail text, display_name varchar)
language sql stable security definer set search_path = public as $$
  select p.id, l.place_id, st_y(l.coordinates::geometry), st_x(l.coordinates::geometry), '/images/' || p.id || '/thumbnail', l.display_name
  from profiles u join photos p on p.owner_id = u.id join photo_locations l on l.photo_id = p.id
  where u.username = p_username and p.processing_status = 'READY' and p.deleted_at is null and p.visibility = 'PUBLIC' and l.is_active and l.precision = 'EXACT'
    and l.coordinates && st_makeenvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326)::geometry;
$$;

alter table profiles enable row level security;
alter table photos enable row level security;
alter table photo_assets enable row level security;
alter table photo_metadata enable row level security;
alter table places enable row level security;
alter table photo_locations enable row level security;
alter table storage_reservations enable row level security;
create policy "public profiles are readable" on profiles for select using (true);
create policy "public places are readable" on places for select using (true);
create policy "public photos are readable" on photos for select using (visibility = 'PUBLIC' and processing_status = 'READY' and deleted_at is null);
