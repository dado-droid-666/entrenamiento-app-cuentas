-- ============================================================================
-- Migracion 3: perfil fisico + pruebas estandarizadas + tier asignado por el
-- Modelo 1 (Random Forest). Base para personalizar el plan segun edad, peso,
-- altura, nivel de experiencia y una prueba objetiva de nivel en alberca
-- (Critical Swim Speed: time trial de 400m + 200m, + 50m libre opcional).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extender profiles con datos fisicos + nivel autopercibido
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists edad integer,
  add column if not exists peso_kg numeric,
  add column if not exists altura_cm numeric,
  add column if not exists nivel_experiencia text check (nivel_experiencia in ('principiante','intermedio','avanzado'));

-- ---------------------------------------------------------------------------
-- 2. Pruebas estandarizadas (test CSS: 400m + 200m time trial, + 50m opcional)
-- ---------------------------------------------------------------------------
create table if not exists public.pruebas_estandar (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  tiempo_400_seg numeric not null,
  tiempo_200_seg numeric not null,
  tiempo_50_seg numeric,              -- opcional
  css_pace_100_seg numeric not null,  -- calculado: (t400-t200)/(400-200)*100
  created_at timestamptz not null default now()
);

alter table public.pruebas_estandar enable row level security;

create policy "pruebas_estandar_select_own"
  on public.pruebas_estandar for select
  using (auth.uid() = user_id);

create policy "pruebas_estandar_insert_own"
  on public.pruebas_estandar for insert
  with check (auth.uid() = user_id);

create policy "pruebas_estandar_update_own"
  on public.pruebas_estandar for update
  using (auth.uid() = user_id);

create policy "pruebas_estandar_delete_own"
  on public.pruebas_estandar for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. Tier asignado por el Modelo 1 (Random Forest) a partir del perfil +
--    prueba estandarizada. 1=principiante, 2=intermedio, 3=avanzado.
-- ---------------------------------------------------------------------------
create table if not exists public.usuario_tier (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  tier smallint not null check (tier in (1,2,3)),
  modelo_version text not null,
  created_at timestamptz not null default now()
);

alter table public.usuario_tier enable row level security;

create policy "usuario_tier_select_own"
  on public.usuario_tier for select
  using (auth.uid() = user_id);

create policy "usuario_tier_insert_own"
  on public.usuario_tier for insert
  with check (auth.uid() = user_id);

create index if not exists usuario_tier_user_idx on public.usuario_tier (user_id, created_at desc);
