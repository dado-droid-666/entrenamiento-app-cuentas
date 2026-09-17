-- ============================================================================
-- Esquema para "Plan 15 Nov" con cuentas de usuario (Supabase / Postgres)
-- Correr esto UNA VEZ en: Supabase Dashboard -> SQL Editor -> New query
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tabla de perfiles (1 fila por usuario, ligada a auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text,
  competition_date date,
  start_date date,
  eventos jsonb not null default '[]'::jsonb, -- ids de EVENTOS_DISPONIBLES elegidos (ej. ["100_libre","5km_aa"])
  dias jsonb, -- patron de 7 valores Lunes..Domingo: "alberca" | "gimnasio" | "descanso"
  plan_tier text not null default 'free', -- gancho para cobrar en el futuro (free / pro / etc.)
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- 2. Tabla de progreso (una fila por sesion marcada como "hecha")
-- ---------------------------------------------------------------------------
create table if not exists public.progreso (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  sesion_key text not null, -- mismo formato que hoy en la app: "{sem}-{dia}"
  hecho_at timestamptz not null default now(),
  unique (user_id, sesion_key)
);

alter table public.progreso enable row level security;

create policy "progreso_select_own"
  on public.progreso for select
  using (auth.uid() = user_id);

create policy "progreso_insert_own"
  on public.progreso for insert
  with check (auth.uid() = user_id);

create policy "progreso_update_own"
  on public.progreso for update
  using (auth.uid() = user_id);

create policy "progreso_delete_own"
  on public.progreso for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. Trigger: al crear un usuario nuevo (signup), crear su fila en profiles
--    automaticamente, para que la app no tenga que hacerlo a mano.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nombre)
  values (new.id, new.raw_user_meta_data->>'nombre');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
