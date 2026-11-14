-- ═══════════════════════════════════════════════════════════════
--  NUESTRO LIBRO — esquema de la base de datos (Supabase)
--  Copiá TODO este archivo en Supabase → SQL Editor → New query → Run.
--  Se puede volver a correr sin romper nada.
-- ═══════════════════════════════════════════════════════════════

-- ─────────────── Perfiles (dueño / invitado) ───────────────
create table if not exists public.perfiles (
  id       uuid primary key references auth.users(id) on delete cascade,
  usuario  text,
  nombre   text,
  rol      text not null default 'invitado' check (rol in ('dueno', 'invitado'))
);

-- ¿El que está conectado es dueño? (se usa en todas las reglas)
create or replace function public.es_dueno()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and rol = 'dueno');
$$;

-- Cada usuario nuevo de Authentication recibe un perfil de invitado automáticamente
create or replace function public.crear_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, usuario, nombre)
  values (new.id, split_part(new.email, '@', 1), initcap(split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario after insert on auth.users
  for each row execute function public.crear_perfil();

-- Usuarios que ya existían antes de correr este archivo
insert into public.perfiles (id, usuario, nombre)
select id, split_part(email, '@', 1), initcap(split_part(email, '@', 1)) from auth.users
on conflict (id) do nothing;

-- ─────────────── Ajustes del libro (una sola fila) ───────────────
create table if not exists public.ajustes (
  id          int primary key default 1 check (id = 1),
  datos       jsonb not null default '{}'::jsonb,
  actualizado timestamptz not null default now()
);
insert into public.ajustes (id) values (1) on conflict (id) do nothing;

-- ─────────────── Hojas ───────────────
create table if not exists public.paginas (
  id      uuid primary key default gen_random_uuid(),
  orden   double precision not null default 0,
  oculta  boolean not null default false,       -- oculta para invitados
  fondo   text,
  creado  timestamptz not null default now()
);

-- ─────────────── Elementos de cada hoja ───────────────
create table if not exists public.elementos (
  id          uuid primary key default gen_random_uuid(),
  pagina_id   uuid not null references public.paginas(id) on delete cascade,
  tipo        text not null check (tipo in ('titulo', 'texto', 'imagen', 'video', 'audio')),
  x           real not null default 10,          -- posición en % de la hoja
  y           real not null default 10,
  w           real not null default 50,          -- ancho en % de la hoja
  h           real,
  rot         real not null default 0,           -- giro en grados
  z           int  not null default 1,           -- capa
  contenido   text,                              -- texto (con negrita/cursiva)
  estilo      jsonb not null default '{}'::jsonb,
  archivo     text,                              -- ruta en el almacenamiento
  descripcion text,
  oculto      boolean not null default false,    -- oculto para invitados
  creado      timestamptz not null default now(),
  creado_por  uuid default auth.uid()
);
create index if not exists elementos_pagina_idx on public.elementos (pagina_id);
create index if not exists elementos_archivo_idx on public.elementos (archivo);

-- ─────────────── Reglas de seguridad (RLS) ───────────────
alter table public.perfiles  enable row level security;
alter table public.ajustes   enable row level security;
alter table public.paginas   enable row level security;
alter table public.elementos enable row level security;

-- perfiles: todos los conectados los leen; solo los dueños los cambian
drop policy if exists "perfiles leer"   on public.perfiles;
drop policy if exists "perfiles editar" on public.perfiles;
create policy "perfiles leer"   on public.perfiles for select to authenticated using (true);
create policy "perfiles editar" on public.perfiles for update to authenticated using (public.es_dueno()) with check (public.es_dueno());

-- ajustes: todos los leen; solo los dueños los cambian
drop policy if exists "ajustes leer"   on public.ajustes;
drop policy if exists "ajustes crear"  on public.ajustes;
drop policy if exists "ajustes editar" on public.ajustes;
create policy "ajustes leer"   on public.ajustes for select to authenticated using (true);
create policy "ajustes crear"  on public.ajustes for insert to authenticated with check (public.es_dueno());
create policy "ajustes editar" on public.ajustes for update to authenticated using (public.es_dueno()) with check (public.es_dueno());

-- hojas: los invitados NO reciben las ocultas
drop policy if exists "paginas leer"   on public.paginas;
drop policy if exists "paginas crear"  on public.paginas;
drop policy if exists "paginas editar" on public.paginas;
drop policy if exists "paginas borrar" on public.paginas;
create policy "paginas leer"   on public.paginas for select to authenticated using (public.es_dueno() or not oculta);
create policy "paginas crear"  on public.paginas for insert to authenticated with check (public.es_dueno());
create policy "paginas editar" on public.paginas for update to authenticated using (public.es_dueno()) with check (public.es_dueno());
create policy "paginas borrar" on public.paginas for delete to authenticated using (public.es_dueno());

-- elementos: los invitados NO reciben los ocultos ni los de hojas ocultas
drop policy if exists "elementos leer"   on public.elementos;
drop policy if exists "elementos crear"  on public.elementos;
drop policy if exists "elementos editar" on public.elementos;
drop policy if exists "elementos borrar" on public.elementos;
create policy "elementos leer" on public.elementos for select to authenticated using (
  public.es_dueno()
  or (not oculto and exists (select 1 from public.paginas p where p.id = pagina_id and not p.oculta))
);
create policy "elementos crear"  on public.elementos for insert to authenticated with check (public.es_dueno());
create policy "elementos editar" on public.elementos for update to authenticated using (public.es_dueno()) with check (public.es_dueno());
create policy "elementos borrar" on public.elementos for delete to authenticated using (public.es_dueno());

-- ─────────────── Archivos (fotos, videos, audios) ───────────────
-- Carpeta privada: nadie la ve sin iniciar sesión, y un invitado
-- no puede abrir el archivo de un elemento oculto ni con el enlace.
insert into storage.buckets (id, name, public, file_size_limit)
values ('recuerdos', 'recuerdos', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

drop policy if exists "recuerdos leer"   on storage.objects;
drop policy if exists "recuerdos subir"  on storage.objects;
drop policy if exists "recuerdos editar" on storage.objects;
drop policy if exists "recuerdos borrar" on storage.objects;
create policy "recuerdos leer" on storage.objects for select to authenticated using (
  bucket_id = 'recuerdos' and (
    public.es_dueno()
    or exists (
      select 1 from public.elementos e join public.paginas p on p.id = e.pagina_id
      where e.archivo = objects.name and not e.oculto and not p.oculta
    )
  )
);
create policy "recuerdos subir"  on storage.objects for insert to authenticated with check (bucket_id = 'recuerdos' and public.es_dueno());
create policy "recuerdos editar" on storage.objects for update to authenticated using (bucket_id = 'recuerdos' and public.es_dueno());
create policy "recuerdos borrar" on storage.objects for delete to authenticated using (bucket_id = 'recuerdos' and public.es_dueno());

-- ─────────────── "Despertador" para que el proyecto no se pause ───────────────
create or replace function public.ping()
returns text language sql security definer set search_path = public as $$
  select 'ok ' || (select count(*) from public.paginas)::text || ' ' || now()::text;
$$;
grant execute on function public.ping() to anon, authenticated;

-- ═══════════════════════════════════════════════════════════════
--  Al final: decile a la base quiénes son los dueños.
--  Cambiá "ari" y "mile" por los usuarios que creaste y corré
--  estas dos líneas (seleccionalas y tocá Run):
--
--  update public.perfiles set rol = 'dueno', nombre = 'Ari'  where usuario = 'ari';
--  update public.perfiles set rol = 'dueno', nombre = 'Mile' where usuario = 'mile';
-- ═══════════════════════════════════════════════════════════════
