-- FurSteps: shelter dog photos and stories (design doc section 8, Jira FURSB-54).
-- Run once in Supabase project "fursteps-b2b" > SQL Editor > Run.
-- Safe: only ADDS tables, columns, one private photo bucket and functions.
-- Existing dogs (Lima, Cusco, Pepper) stay exactly as they are.
--
-- Flow: shelter staff (or the FurSteps admin) sign in on fursteps.com/shelter with an
-- emailed code, add a dog or a photo -> status "pending" -> the admin approves -> it shows
-- in the app. Nothing reaches walkers or companies without admin approval.
-- Photos are resized in the browser before upload, which also removes all hidden data
-- (EXIF: GPS location, camera, date). The bucket only takes JPEGs up to 3 MB.

-- 1. Shelters, and the shelter's written photo permission.
create table if not exists public.shelters (
  id                     uuid primary key default gen_random_uuid(),
  slug                   text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name                   text not null check (length(trim(name)) between 1 and 80),
  photo_permission_at    timestamptz,          -- when the shelter ticked the permission box
  photo_permission_by    uuid references auth.users(id) on delete set null,
  photo_permission_text  text,                 -- the exact wording they agreed to
  active                 boolean not null default true,
  created_at             timestamptz not null default now()
);
alter table public.shelters enable row level security;
revoke all on public.shelters from anon, authenticated;

-- 2. Who may use the portal. Keyed by email so the admin can add staff before they sign in.
create table if not exists public.portal_users (
  email       text primary key check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role        text not null check (role in ('admin', 'shelter')),
  shelter_id  uuid references public.shelters(id) on delete cascade,
  added_at    timestamptz not null default now(),
  check ((role = 'shelter') = (shelter_id is not null))
);
alter table public.portal_users enable row level security;
revoke all on public.portal_users from anon, authenticated;

insert into public.portal_users (email, role) values ('kristina@fursteps.com', 'admin')
on conflict (email) do nothing;

-- 3. Dogs: which shelter they belong to, and their review status.
alter table public.dogs add column if not exists shelter_id uuid references public.shelters(id) on delete set null;
alter table public.dogs add column if not exists review_status text not null default 'approved'
  check (review_status in ('pending', 'approved', 'rejected'));
alter table public.dogs add column if not exists submitted_by uuid references auth.users(id) on delete set null;
alter table public.dogs add column if not exists updated_at timestamptz not null default now();

-- 4. Photos. The file lives in the private bucket "dog-photos" at dogs/<dog id>/<random>.jpg.
create table if not exists public.dog_photos (
  id           uuid primary key default gen_random_uuid(),
  dog_id       uuid not null references public.dogs(id) on delete cascade,
  path         text not null unique check (path ~ '^dogs/[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'),
  caption      text check (length(caption) <= 200),
  no_people    boolean not null check (no_people),   -- uploader confirms no identifiable people
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  sort         int not null default 0,
  uploaded_by  uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  reviewed_by  uuid references auth.users(id) on delete set null,
  reviewed_at  timestamptz
);
create index if not exists dog_photos_dog_idx on public.dog_photos (dog_id, status);
alter table public.dog_photos enable row level security;
revoke all on public.dog_photos from anon, authenticated;

-- 5. Private bucket: JPEG only, 3 MB max. Nothing is public.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dog-photos', 'dog-photos', false, 3145728, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = 3145728, allowed_mime_types = array['image/jpeg'];

-- 6. Helpers: the caller's portal role and shelter (null if not a portal user).
create or replace function public.portal_role() returns table (role text, shelter_id uuid)
language sql stable security definer set search_path = public as $$
  select p.role, p.shelter_id
  from auth.users u join public.portal_users p on p.email = lower(u.email)
  where u.id = auth.uid() and u.email_confirmed_at is not null
$$;

create or replace function public.portal_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.portal_role()), false)
$$;

-- May the caller manage this dog? Admin: any dog. Shelter staff: dogs of their own shelter.
create or replace function public.portal_can_edit_dog(p_dog uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.portal_role() r
    where r.role = 'admin'
       or (r.role = 'shelter' and exists (select 1 from public.dogs d where d.id = p_dog and d.shelter_id = r.shelter_id))
  )
$$;

-- Storage rules use the file path: dogs/<dog id>/<file>.jpg
create or replace function public.dog_photo_dog_id(p_path text) returns uuid
language sql immutable set search_path = '' as $$
  select case when p_path ~ '^dogs/[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$' then split_part(p_path, '/', 2)::uuid end
$$;

create or replace function public.dog_photo_readable(p_path text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.portal_can_edit_dog(public.dog_photo_dog_id(p_path))
      or exists (
        select 1 from public.dog_photos ph join public.dogs d on d.id = ph.dog_id
        where ph.path = p_path and ph.status = 'approved' and d.active and d.review_status = 'approved'
      )
$$;

-- 7. Storage policies on the private bucket.
drop policy if exists "dog photos: portal upload" on storage.objects;
create policy "dog photos: portal upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'dog-photos' and public.portal_can_edit_dog(public.dog_photo_dog_id(name)));

drop policy if exists "dog photos: read approved or own shelter" on storage.objects;
create policy "dog photos: read approved or own shelter" on storage.objects for select to authenticated
  using (bucket_id = 'dog-photos' and public.dog_photo_readable(name));

drop policy if exists "dog photos: admin removes" on storage.objects;
create policy "dog photos: admin removes" on storage.objects for delete to authenticated
  using (bucket_id = 'dog-photos' and public.portal_is_admin());

-- 8. Portal functions (the web page calls only these).
create or replace function public.portal_me()
returns table (email text, role text, shelter_id uuid, shelter_name text, photo_permission_at timestamptz)
language sql stable security definer set search_path = public as $$
  select lower(u.email), r.role, r.shelter_id, s.name, s.photo_permission_at
  from auth.users u cross join public.portal_role() r left join public.shelters s on s.id = r.shelter_id
  where u.id = auth.uid()
$$;

create or replace function public.portal_list_shelters()
returns table (id uuid, slug text, name text, photo_permission_at timestamptz, staff text[])
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.portal_is_admin() then raise exception 'Admins only'; end if;
  return query
  select s.id, s.slug, s.name, s.photo_permission_at,
         coalesce((select array_agg(p.email order by p.email) from public.portal_users p where p.shelter_id = s.id), '{}')
  from public.shelters s where s.active order by s.name;
end $$;

-- Admin: add a shelter (or rename it) and optionally one staff email.
create or replace function public.portal_save_shelter(p_name text, p_staff_email text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_slug text;
begin
  if not public.portal_is_admin() then raise exception 'Admins only'; end if;
  if length(trim(coalesce(p_name, ''))) not between 1 and 80 then raise exception 'Shelter name must be 1 to 80 characters'; end if;
  v_slug := trim(both '-' from left(regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g'), 40));
  if length(v_slug) < 2 then v_slug := 'shelter-' || substr(md5(random()::text), 1, 6); end if;
  insert into public.shelters (slug, name) values (v_slug, trim(p_name))
  on conflict (slug) do update set name = excluded.name, active = true
  returning id into v_id;
  if coalesce(trim(p_staff_email), '') <> '' then
    insert into public.portal_users (email, role, shelter_id) values (lower(trim(p_staff_email)), 'shelter', v_id)
    on conflict (email) do update set role = 'shelter', shelter_id = excluded.shelter_id
    where public.portal_users.role <> 'admin';
  end if;
  return v_id;
end $$;

-- Shelter staff: record the shelter's photo permission (the exact text is stored).
create or replace function public.portal_give_photo_permission(p_text text) returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  select * into r from public.portal_role();
  if r.role is distinct from 'shelter' then raise exception 'Shelter staff only'; end if;
  if length(coalesce(p_text, '')) < 40 then raise exception 'Permission text missing'; end if;
  update public.shelters set photo_permission_at = now(), photo_permission_by = auth.uid(), photo_permission_text = p_text
  where id = r.shelter_id;
end $$;

-- Dogs the caller can manage, with their photos (all statuses).
create or replace function public.portal_list_dogs()
returns table (id uuid, slug text, name text, age text, breed text, story text, shelter text, shelter_id uuid,
               review_status text, active boolean, updated_at timestamptz, photos jsonb)
language plpgsql stable security definer set search_path = public as $$
declare r record;
begin
  select * into r from public.portal_role();
  if r.role is null then raise exception 'Not a portal user'; end if;
  return query
  select d.id, d.slug, d.name, d.age, d.breed, d.story, d.shelter, d.shelter_id, d.review_status, d.active, d.updated_at,
         coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'path', p.path, 'caption', p.caption, 'status', p.status, 'created_at', p.created_at)
                                    order by p.sort, p.created_at)
                   from public.dog_photos p where p.dog_id = d.id and p.status <> 'rejected'), '[]'::jsonb)
  from public.dogs d
  where r.role = 'admin' or d.shelter_id = r.shelter_id
  order by (d.review_status = 'pending') desc, d.name;
end $$;

-- Add a dog (p_id null) or edit one. Shelter staff: new dogs wait for approval and can be edited
-- only while still pending (so a live dog never vanishes from walkers' screens); for changes to a
-- live dog they email us. Admin saves are approved straight away.
create or replace function public.portal_save_dog(p_id uuid, p_name text, p_age text, p_breed text, p_story text, p_shelter uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare r record; v_id uuid; v_shelter uuid; v_shelter_name text; v_status text; v_slug text;
begin
  select * into r from public.portal_role();
  if r.role is null then raise exception 'Not a portal user'; end if;
  if length(trim(coalesce(p_name, ''))) not between 1 and 40 then raise exception 'Name must be 1 to 40 characters'; end if;
  if length(coalesce(p_age, '')) > 40 or length(coalesce(p_breed, '')) > 60 then raise exception 'Age or breed too long'; end if;
  if length(coalesce(p_story, '')) > 600 then raise exception 'Story must be 600 characters or fewer'; end if;
  v_shelter := case when r.role = 'admin' then p_shelter else r.shelter_id end;
  select name into v_shelter_name from public.shelters where id = v_shelter;
  v_status := case when r.role = 'admin' then 'approved' else 'pending' end;

  if p_id is null then
    v_slug := trim(both '-' from left(regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g'), 30));
    if length(v_slug) < 2 or exists (select 1 from public.dogs where slug = v_slug) then
      v_slug := left(coalesce(nullif(v_slug, ''), 'dog'), 30) || '-' || substr(md5(random()::text), 1, 6);
    end if;
    insert into public.dogs (slug, name, age, breed, story, shelter, shelter_id, review_status, submitted_by, active)
    values (v_slug, trim(p_name), nullif(trim(p_age), ''), nullif(trim(p_breed), ''), nullif(trim(p_story), ''),
            coalesce(v_shelter_name, 'FurSteps partner shelter'), v_shelter, v_status, auth.uid(), true)
    returning id into v_id;
  else
    if not public.portal_can_edit_dog(p_id) then raise exception 'Not your dog'; end if;
    if r.role = 'shelter' and exists (select 1 from public.dogs where id = p_id and review_status = 'approved') then
      raise exception 'This dog is live. Email hey@fursteps.com with changes';
    end if;
    update public.dogs set name = trim(p_name), age = nullif(trim(p_age), ''), breed = nullif(trim(p_breed), ''),
           story = nullif(trim(p_story), ''), review_status = v_status, updated_at = now(),
           shelter_id = case when r.role = 'admin' then coalesce(v_shelter, shelter_id) else shelter_id end,
           shelter = case when r.role = 'admin' and v_shelter_name is not null then v_shelter_name else shelter end
    where id = p_id returning id into v_id;
  end if;
  return v_id;
end $$;

-- After the browser uploads the file, register it. Shelter photos wait for approval.
create or replace function public.portal_add_photo(p_path text, p_caption text, p_no_people boolean) returns uuid
language plpgsql security definer set search_path = public as $$
declare r record; v_dog uuid; v_id uuid;
begin
  select * into r from public.portal_role();
  v_dog := public.dog_photo_dog_id(p_path);
  if v_dog is null or not public.portal_can_edit_dog(v_dog) then raise exception 'Not your dog'; end if;
  if p_no_people is not true then raise exception 'Please confirm there are no identifiable people in the photo'; end if;
  if r.role = 'shelter' and not exists (select 1 from public.shelters where id = r.shelter_id and photo_permission_at is not null) then
    raise exception 'Please give photo permission first';
  end if;
  if not exists (select 1 from storage.objects where bucket_id = 'dog-photos' and name = p_path) then raise exception 'Upload not found'; end if;
  insert into public.dog_photos (dog_id, path, caption, no_people, status, uploaded_by, reviewed_by, reviewed_at, sort)
  values (v_dog, p_path, nullif(trim(left(p_caption, 200)), ''), true,
          case when r.role = 'admin' then 'approved' else 'pending' end, auth.uid(),
          case when r.role = 'admin' then auth.uid() end, case when r.role = 'admin' then now() end,
          coalesce((select max(sort) + 1 from public.dog_photos where dog_id = v_dog), 0))
  returning id into v_id;
  return v_id;
end $$;

-- Admin: approve or reject a dog or a photo. Rejected photo files are then deleted by the page.
create or replace function public.portal_review(p_kind text, p_id uuid, p_decision text) returns text
language plpgsql security definer set search_path = public as $$
declare v_path text;
begin
  if not public.portal_is_admin() then raise exception 'Admins only'; end if;
  if p_decision not in ('approved', 'rejected') then raise exception 'Bad decision'; end if;
  if p_kind = 'dog' then
    update public.dogs set review_status = p_decision, updated_at = now() where id = p_id;
  elsif p_kind = 'photo' then
    update public.dog_photos set status = p_decision, reviewed_by = auth.uid(), reviewed_at = now() where id = p_id
    returning path into v_path;
  else raise exception 'Bad kind'; end if;
  return v_path;
end $$;

-- Admin: show or hide a dog in the app (e.g. when it is adopted).
create or replace function public.portal_set_dog_active(p_id uuid, p_active boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.portal_is_admin() then raise exception 'Admins only'; end if;
  update public.dogs set active = p_active, updated_at = now() where id = p_id;
end $$;

-- 9. The app: only approved, active dogs, and their approved photos.
create or replace function public.list_dogs()
returns table (id uuid, slug text, name text, age text, breed text, story text, shelter text)
language sql stable security definer set search_path = public as $$
  select id, slug, name, age, breed, story, shelter from public.dogs where active and review_status = 'approved' order by name
$$;

create or replace function public.dog_photo_paths()
returns table (dog_id uuid, path text)
language sql stable security definer set search_path = public as $$
  select p.dog_id, p.path from public.dog_photos p join public.dogs d on d.id = p.dog_id
  where p.status = 'approved' and d.active and d.review_status = 'approved'
  order by p.dog_id, p.sort, p.created_at
$$;

-- 10. Who can call what: signed-in users only; each function checks the role itself.
revoke execute on function public.portal_role(), public.portal_is_admin(), public.portal_can_edit_dog(uuid),
  public.dog_photo_dog_id(text), public.dog_photo_readable(text), public.portal_me(), public.portal_list_shelters(),
  public.portal_save_shelter(text, text), public.portal_give_photo_permission(text), public.portal_list_dogs(),
  public.portal_save_dog(uuid, text, text, text, text, uuid), public.portal_add_photo(text, text, boolean),
  public.portal_review(text, uuid, text), public.portal_set_dog_active(uuid, boolean), public.dog_photo_paths()
  from public, anon;
grant execute on function public.portal_role(), public.portal_is_admin(), public.portal_can_edit_dog(uuid),
  public.dog_photo_dog_id(text), public.dog_photo_readable(text), public.portal_me(), public.portal_list_shelters(),
  public.portal_save_shelter(text, text), public.portal_give_photo_permission(text), public.portal_list_dogs(),
  public.portal_save_dog(uuid, text, text, text, text, uuid), public.portal_add_photo(text, text, boolean),
  public.portal_review(text, uuid, text), public.portal_set_dog_active(uuid, boolean), public.dog_photo_paths()
  to authenticated;
