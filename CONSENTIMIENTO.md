# Consentimiento — datos anonimizados para entrenamiento de modelos

Versión aprobada 18/09/2026. Decisiones: edad en grupos de 5 años, el retiro
solo excluye de futuros entrenamientos (no borra el historial), textos ES+EN.

## ES — checkbox corto (setup)

> Acepto compartir mis datos de entrenamiento anonimizados (grupo de edad en
> rangos de 5 años, peso, altura, tiempos 400m/200m/50m, cargas/reps/tiempos y
> esfuerzo 1-5, adherencia) para mejorar los modelos. Sin email ni nombre.
> Retirarlo solo me excluye de futuros entrenamientos.

## EN — short checkbox (setup)

> I agree to share my anonymized training data (age in 5-year bands, weight,
> height, 400m/200m/50m test times, load/reps/time and effort 1-5 per session,
> adherence) to improve the models. No email or name. Withdrawing only
> excludes me from future training runs.

## ES — aviso expandido

- **Qué se exporta:** perfil físico + pruebas CSS + registro por ejercicio
  (peso/reps/tiempo_seg/esfuerzo) + sesiones completadas vs planificadas.
  Nunca email, nombre, notas libres, IP ni dispositivo.
- **Anonimización:** el usuario se reemplaza por un código aleatorio
  irreversible por exportación; la edad se agrupa en rangos de 5 años.
- **Para qué:** entrenar el Modelo 1 (nivel) y el Modelo 2 (ajuste de carga).
- **Retiro:** desmarcar la casilla y guardar de nuevo excluye del siguiente
  reentrenamiento mensual. Las versiones de modelos ya entrenadas permanecen
  hasta ser reemplazadas (no se pueden "desentrenar"). El historial en la app
  no se borra.
- **Derechos:** ver, descargar y borrar los datos; el borrado excluye de
  futuras exportaciones.

## EN — expanded notice

- **What's exported:** physical profile + CSS tests + per-exercise log
  (load/reps/time_seg/effort) + completed vs planned sessions. Never email,
  name, free-text notes, IP or device.
- **Anonymization:** user id replaced by a random irreversible code per
  export; age grouped in 5-year bands.
- **Purpose:** training Model 1 (level) and Model 2 (load adjustment).
- **Withdrawal:** uncheck and save again to opt out of the next monthly
  retrain. Already-trained model versions remain until replaced (they cannot
  be "untrained"). In-app history is not deleted.
- **Rights:** view, download and delete your data; deletion excludes you from
  future exports.

## Implementación

- UI: checkbox `#consent-entrenamiento` en setup (`index.html`), persistido
  en `plan15nov_perfil_v1.consentEntrenamiento` y subido a
  `profiles.consent_entrenamiento` (`sql/004_consentimiento.sql`).
- Export: `ml/export_anonimo.py` — solo filas con consentimiento, edades en
  bandas, IDs aleatorios por exportación.
