-- 004: consentimiento para entrenamiento de modelos ML
-- Aplicar con: npx -y supabase@latest db push (desde entrenamiento-app-cuentas/)
-- Copia versionada: supabase/migrations/20260918000000_consentimiento.sql

alter table public.profiles
  add column if not exists consent_entrenamiento boolean not null default false;

comment on column public.profiles.consent_entrenamiento is
  'Opt-in para exportar datos anonimizados (entrenamiento Modelo 1/2). Retiro = exclusión de futuras exportaciones.';
