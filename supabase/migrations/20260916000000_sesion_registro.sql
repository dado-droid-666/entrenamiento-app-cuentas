-- ============================================================================
-- Migracion 2: registro real de ejercicios por sesion (peso/reps/esfuerzo en
-- fuerza; esfuerzo en alberca). Esta es la base de datos para el futuro
-- motor de progresion/ML: permite comparar lo PLANIFICADO (data.js) vs lo
-- REALMENTE ejecutado por el usuario.
-- No modifica profiles ni progreso (compatibilidad hacia atras).
-- ============================================================================

create table if not exists public.sesion_registro (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  sesion_key text not null,           -- mismo formato que progreso: "{sem}-{dia}"
  ejercicio_id text not null,         -- id del catalogo en ejercicios.js (ej. "kb_swing")
  tipo text not null check (tipo in ('fuerza','alberca')),
  peso_real numeric,                  -- solo fuerza, nullable (ejercicios de peso corporal)
  reps_reales integer,                -- solo fuerza (ejercicios de reps o peso_reps)
  tiempo_seg integer,                 -- solo fuerza (ejercicios isometricos/tiempo, ej. Plank, Cuerda)
  esfuerzo smallint check (esfuerzo between 1 and 5), -- escala 1-5 (ambos tipos)
  created_at timestamptz not null default now()
);

alter table public.sesion_registro enable row level security;

create policy "sesion_registro_select_own"
  on public.sesion_registro for select
  using (auth.uid() = user_id);

create policy "sesion_registro_insert_own"
  on public.sesion_registro for insert
  with check (auth.uid() = user_id);

create policy "sesion_registro_update_own"
  on public.sesion_registro for update
  using (auth.uid() = user_id);

create policy "sesion_registro_delete_own"
  on public.sesion_registro for delete
  using (auth.uid() = user_id);

create index if not exists sesion_registro_user_sesion_idx
  on public.sesion_registro (user_id, sesion_key);
