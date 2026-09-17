# Estado del proyecto — para retomar

Ultima actualizacion: 16 sep 2026 — **Proyecto 2 COMPLETADO Y PUBLICADO**

## Resumen de lo que existe

- **`entrenamiento-app/`** (Proyecto 1 — PUBLICADO Y ACTUALIZADO): https://1swimgoal.netlify.app/
  - Funciona sin login (100% local, localStorage).
  - Ya tiene: plan dinamico segun fecha de competencia, seleccion de pruebas
    (alberca/aguas abiertas) que especializa el plan, timer con refuerzo visual
    (flash de pantalla) porque el sonido no suena en iPhone con el switch de
    silencio activado, y selector de dias (alberca/gimnasio/descanso por dia
    de la semana, con rotacion automatica si eliges menos/mas dias de los que
    trae la plantilla original de 3 gym + 2 alberca).
  - **Ya se hizo el deploy** de todos estos cambios via `netlify-cli` (login +
    link + `netlify deploy --prod`). El sitio esta confirmado bajo la cuenta
    real de Netlify (`daniel-alvarado4's team`, account_id
    `6aa8b0b797870be102c94d8c`) — NO es un "drop sin reclamar" como pensamos
    al inicio.
  - **Netlify CLI queda instalado/enlazado**: la carpeta `entrenamiento-app`
    esta linkeada al sitio `1swimgoal` (ver `.netlify/state.json` si existe).
    Para volver a publicar cambios futuros: `npx -y netlify-cli@latest deploy
    --prod --dir "."` desde esa carpeta (ya no hace falta arrastrar a mano).
  - **Pendiente sin resolver**: ~~el HUD/banner de Netlify~~ **RESUELTO**: el
    badge "Powered by Netlify" se controlaba con el campo de sitio
    `built_with_badge_enabled` (distinto de `ai_usage_enabled`, que era una
    pista falsa). Se puso en `false` via API el 14 sep noche, confirmado que
    ya no aparece en el HTML servido. El boton "Plan" ya no deberia estar
    tapado para ningun visitante. Nota: el boton "Hide this badge" que Dani
    encontro en el propio badge solo lo oculta en localStorage de SU
    navegador/dispositivo (no es global) — el fix real fue el campo de sitio.

- **`entrenamiento-app-cuentas/`** (Proyecto 2 — EN PROGRESO): https://swim-goal-4u.netlify.app
  - Copia identica de entrenamiento-app + los mismos cambios recientes.
  - Tiene `auth.js` con pantalla de login/registro (email+contrasena) via
    Supabase. **`config.js` YA esta conectado** a un proyecto real de
    Supabase (`atypoclonwaxvukwvycy`), no son placeholders.
  - `sql/schema.sql` y `supabase/migrations/..._init_schema.sql` ya tienen el
    esquema completo: tablas `profiles` (con columnas `eventos` jsonb, `dias`
    jsonb, y `plan_tier` para cobrar despues) y `progreso`, con Row Level
    Security. Ambas migraciones (init + `sesion_registro`, ver Fase 1 ML
    abajo) ya estan aplicadas en el proyecto real.
  - Supabase CLI ya inicializado y **logueado/enlazado** (`supabase projects
    list` muestra el proyecto como linked). Para aplicar nuevas migraciones:
    `npx -y supabase@latest db push` desde esta carpeta.
  - Netlify CLI tambien enlazado a su propio sitio (`swim-goal-4u`, distinto
    del sitio de Proyecto 1). Para republicar: `npx -y netlify-cli@latest
    deploy --prod --dir "."` desde esta carpeta.

## Siguiente paso pendiente

Falta probar de punta a punta con una cuenta real logueada en
https://swim-goal-4u.netlify.app: crear 2 cuentas de prueba y confirmar que
cada quien ve solo su propio plan/progreso/registro de ejercicios (las
pruebas hechas hasta ahora usaron bypass de login + localStorage en local).

## Como retomar

Simplemente abre una nueva conversacion (o continua esta) y dime algo como:
"Seguimos con Supabase, aqui esta mi token: ..." o "ya revise el dashboard de
Netlify, encontre esto: ..." — con este archivo ya tengo todo el contexto
necesario para continuar sin repetir pasos.

## Fase 1 ML: catalogo de ejercicios + captura de datos (16 sep 2026)

Objetivo: mantener el dominio actual (natacion/triatlon) pero empezar a
recolectar datos reales para poder entrenar un modelo de ML que ajuste la
progresion de cargas en el futuro (ver conversacion completa para el plan de
fases). Se implemento en `entrenamiento-app-cuentas` (Proyecto 2):

- **`ejercicios.js`** (nuevo): catalogo de ~30 ejercicios de fuerza/alberca/
  descanso con `tipo_carga` (reps | peso_reps | tiempo | distancia).
- **`parser.js`** (nuevo): en vez de reescribir a mano los ~200 bloques de las
  63 sesiones de `DEFAULT_SESSIONS` (alto riesgo de romper el archivo que ya
  funciona), se construyo un parser que interpreta el texto YA escrito a mano
  (`d/d2/d3`) contra el catalogo. Cobertura verificada: **362/390 fragmentos
  (93%)** reconocidos automaticamente; el resto son descriptores de descanso
  entre rondas o notas sin ejercicio real (sin impacto). `d/d2/d3` no se
  tocaron: el render del player sigue igual.
- **`progresion.js`** (nuevo): motor de progresion en **modo conservador**
  (`decidirProgresion`/`evaluarSemana`), basado solo en adherencia
  (completado/no completado), sin depender aun de peso/reps/esfuerzo reales.
  Expone tambien `ESCALA_ESFUERZO` (1-5 con emojis) usada por la UI.
- **Captura de datos obligatoria** en el player (`app.js`): al llegar al
  ultimo bloque de una sesion de fuerza o alberca, se abre un modal
  (`#registro-overlay` en `index.html`) que pide:
  - Fuerza: peso + reps reales por ejercicio (o solo reps/segundos si es
    ejercicio de peso corporal/isometrico) + esfuerzo (1-5 con emojis).
  - Alberca: solo esfuerzo (1-5 con emojis) — sin friccion de metros/tiempos.
  - Es obligatorio completar el esfuerzo para poder continuar/marcar la
    sesion como hecha.
- **`sql/002_sesion_registro.sql`** + su copia en
  `supabase/migrations/20260916000000_sesion_registro.sql`: tabla
  `sesion_registro` (user_id, sesion_key, ejercicio_id, tipo, peso_real,
  reps_reales, tiempo_seg, esfuerzo, created_at) con RLS por usuario.
  **YA APLICADA** al proyecto real de Supabase (`atypoclonwaxvukwvycy`) el 16
  sep 2026 via `supabase db push` (CLI ya estaba logueado y linkeado de una
  sesion anterior). Confirmado con `supabase migration list` (local=remoto) y
  una llamada REST de prueba (200, `[]`, protegida por RLS).
- **`auth.js`**: nueva `window.pushRegistroToCloud(sesionKey, registros)` que
  sube el registro a `sesion_registro` (si hay sesion iniciada). Si no hay
  nube o no hay login, el registro queda en localStorage
  (`plan15nov_registro_v1`) para no perderlo.
- **`index.html`**: se agregaron los `<script>` de los 3 archivos nuevos
  (orden importa: `ejercicios.js` -> `parser.js` -> `progresion.js` -> antes
  de `data.js`) y el markup/CSS del modal de registro.
- **Bug encontrado y corregido durante pruebas en navegador (Playwright)**:
  los ejercicios de tipo "tiempo" (Cuerda, Plank) guardaban los segundos en
  la columna `reps_reales`, mezclando semanticas distintas. Se agrego la
  columna `tiempo_seg` dedicada (ver arriba) antes de aplicar la migracion.

### Deploy (16 sep 2026)

Proyecto 2 ya estaba enlazado a un sitio de Netlify propio (no confundir con
`1swimgoal.netlify.app`, que es Proyecto 1):

- **URL para compartir y empezar a registrar: https://swim-goal-4u.netlify.app**
- Site ID: `f3b34cb0-442d-44d0-bef8-fd5564f2f45a` (`.netlify/state.json`).
- Se publico con `npx -y netlify-cli@latest deploy --prod --dir "."` y se
  confirmo que el HTML servido ya incluye `parser.js` y el modal
  `registro-overlay` (los cambios de esta fase).
- Requiere login/registro (email+contrasena) via Supabase para que el
  progreso y el registro de ejercicios se guarden en la nube y cada usuario
  vea solo lo suyo — si alguien entra sin conexion a Supabase, la app sigue
  funcionando 100% local (localStorage) como respaldo.

### Pendiente / siguientes pasos de esta fase
1. ~~Correr `sql/002_sesion_registro.sql` en Supabase~~ **HECHO** (ver arriba).
2. Probar el flujo completo en el navegador (abrir una sesion de fuerza y de
   alberca, confirmar que el modal aparece y guarda bien). **HECHO** via
   Playwright en local; falta una prueba end-to-end con una cuenta real
   logueada contra el sitio publicado, para confirmar el insert real en
   Supabase (las pruebas de hoy usaron bypass de login + localStorage).
3. Revisar a ojo los ~7% de fragmentos no reconocidos por el parser (rest
   entre rondas, notas de taper) por si vale la pena mapearlos tambien.
4. Cuando haya semanas/meses de datos reales en `sesion_registro`, activar la
   fase 2 del motor de progresion (double progression / deload basado en
   peso/reps/esfuerzo real) y evaluar el primer modelo de ML (Opcion A:
   regresion/gradient boosting para predecir carga/reps de la siguiente
   sesion).

## Fase 2 ML: Modelo 1 (Random Forest, perfil inicial) + Modelo 2 (ajuste continuo pooled) — 16/17 sep 2026

Implementado end-to-end y publicado en https://swim-goal-4u.netlify.app.

### Modelo 1 — Random Forest (tier de nivel: 1 principiante / 2 intermedio / 3 avanzado)

- **Prueba estandarizada**: test de Critical Swim Speed (CSS) — el usuario
  nada 400m y 200m a maximo esfuerzo; la app calcula
  `css_pace = (t400-t200)/(400-200)*100` (seg/100m) automaticamente en el
  cliente. Tiempo de 50m libre opcional como feature adicional.
- **UI**: nuevos campos en la pantalla de setup (`index.html`): edad, peso,
  altura, nivel autopercibido, y el bloque de tiempos 400/200/50m con
  resultado de CSS en vivo (`app.js`: `leerPerfilYGuardar`,
  `actualizarCSSResultado`, `segundosDesdeMinSeg`).
- **Datos de entrenamiento — transparencia total**: se uso el dataset real
  "Olympic Swimming Results 1912-2020" (mismo dataset publicado en Kaggle
  por datasciencedonut; se descargo su mirror en GitHub porque no hay
  credenciales de Kaggle configuradas: `ml/olympic_swimming_raw.csv`, 4360
  filas). Ese dataset SOLO tiene resultados de elite (sin edad/peso/altura
  de nadadores recreativos), asi que se uso como "ancla real" para calibrar
  el extremo superior de la escala (ritmo elite real: ~57.5s/100m hombres,
  ~63.9s/100m mujeres, libre). El resto del dataset (perfiles recreativos
  edad/peso/altura/nivel -> tier) es **sintetico pero calibrado con esa
  ancla real**, porque no existe un dataset publico de nadadores
  recreativos etiquetado por nivel. Ver `ml/train_modelo1.py` (documentado
  con esta transparencia en el propio script).
- **Modelo**: `RandomForestClassifier` (15 arboles, profundidad 6,
  scikit-learn), accuracy 99.5% sobre el set de prueba sintetico (alto por
  ser sintetico — no es una validacion contra usuarios reales).
- **Exportacion**: en vez de ONNX, se exporta el bosque completo a JSON
  (`ml/modelo1_arbol.json`, 31 KB) con un interprete generico de arboles en
  JS (`arboles.js`: `recorrerArbolGenerico`, `predecirBosque`), reutilizado
  tambien por el Modelo 2. `modelo1.js` carga el JSON via fetch y expone
  `predecirTier(perfil)`, con fallback heuristico
  (`predecirTierHeuristico`) si el JSON no carga (offline / antes de
  entrenar).
- **Integracion en la app**: el tier se calcula al guardar el setup y se
  persiste en localStorage (`plan15nov_perfil_v1`) + Supabase
  (`usuario_tier`, `profiles.edad/peso_kg/altura_cm/nivel_experiencia`,
  `pruebas_estandar`). Se usa para:
  - Mostrar el ritmo objetivo personalizado (`ritmoObjetivoTexto()`) en la
    tarjeta de "Hoy" para sesiones de alberca, basado en el CSS real del
    usuario (ej. "🎯 Tu ritmo objetivo (CSS): 1:45 /100m").
  - Escalar las sugerencias de reps/segundos mostradas como placeholder en
    el modal de registro de fuerza (`escalarPorTier`), usando
    `TIER_ESCALA` (factor 0.85/1.0/1.15 por tier) definido en `modelo1.js`.

### Modelo 2 — regresion pooled (Random Forest Regressor) para ajuste continuo

- Sugiere un **factor multiplicativo** (0.75-1.25, clamp de seguridad) sobre
  la carga/reps de la proxima sesion, para UN ejercicio especifico de UN
  usuario, a partir de: tier, esfuerzo promedio de las ultimas 3 sesiones de
  ese ejercicio, tendencia de esfuerzo, adherencia reciente (sesiones del
  mismo tipo completadas vs planificadas), semana del plan.
- **Datos de entrenamiento — transparencia total**: como la app recien se
  publico, no hay historial real acumulado en `sesion_registro` todavia. El
  script `ml/train_modelo2.py` funciona en dos modos: si existe
  `ml/sesion_registro_export.csv` (export real, documentado en el propio
  script como generarlo cuando haya datos) entrena con eso; si no, genera un
  dataset sintetico de bootstrap basado en la misma logica de progresion
  conservadora ya usada en `progresion.js` (esfuerzo alto sostenido y en
  aumento -> bajar; esfuerzo bajo + buena adherencia -> subir), para que el
  pipeline funcione desde el dia 1 y se reemplace solo por datos reales mas
  adelante sin cambiar codigo.
- **Modelo**: `RandomForestRegressor` (15 arboles, profundidad 5), MAE=0.023,
  R2=0.83 sobre el set sintetico.
- **Exportacion**: mismo formato JSON generico que Modelo 1
  (`ml/modelo2_bosque.json`), pero con hoja `"valor"` en vez de `"tier"` y
  agregacion por **promedio** (no voto) — `modelo2.js`:
  `sugerirFactorAjuste`, `sugerenciaCombinada` (esta ultima combina Modelo 2
  con el fallback de reglas de `progresion.js` si el modelo no esta
  disponible o no hay historial suficiente).
- **Reentrenamiento mensual**: el script esta listo para correrse cada mes
  (`python ml/train_modelo2.py`), pero **no hay automatizacion (cron/GitHub
  Actions) configurada todavia** porque esta carpeta no es un repositorio
  git (no hay `.git`, no hay remoto de GitHub) — el deploy se hace a mano
  via `netlify deploy --prod`. Pendiente decidir con Dani: (a) crear repo en
  GitHub + Actions programado mensual, o (b) reentrenar manualmente cada mes
  y volver a desplegar.

### Verificacion hecha (Playwright, navegador real)
- Formulario de setup completo (perfil + test CSS) con calculo de CSS en
  vivo verificado (400m=6:30, 200m=3:00 -> CSS=105.0 seg/100m mostrado
  correctamente).
- Modelo 1 real (no heuristico) predijo tier=2 para ese perfil, coherente
  con las bandas calibradas.
- Ritmo objetivo (CSS) se muestra correctamente en sesiones de alberca
  ("1:45 /100m" para 105 seg/100m).
- Modelo 2 wiring verificado end-to-end: features calculadas desde historial
  real de `sesion_registro` local, factor devuelto por el bosque entrenado,
  aplicado a los placeholders de reps en el modal de fuerza. Nota: con solo
  3 puntos de historial sintetico de prueba, el factor devuelto a veces
  queda cerca de 1.0 (poco cambio) porque el modelo de bootstrap es pequeno
  y aproximado — se espera que mejore con datos reales acumulados.
- Sin errores de consola nuevos (solo el 404 de favicon.ico, preexistente).

### Archivos nuevos de esta fase
`modelo1.js`, `modelo2.js`, `arboles.js`, `ml/train_modelo1.py`,
`ml/train_modelo2.py`, `ml/olympic_swimming_raw.csv`,
`ml/modelo1_arbol.json`, `ml/modelo2_bosque.json`,
`sql/003_perfil_y_tier.sql` (+ migracion Supabase aplicada), cambios en
`app.js`, `auth.js`, `index.html`, `sw.js` (cache bump a v8 + precache de
los archivos nuevos).

### Pendiente
1. Decidir automatizacion del reentrenamiento mensual de Modelo 2 (y
   eventualmente Modelo 1) — requiere convertir esta carpeta en repo git +
   GitHub Actions, o hacerlo manual.
2. Cuando haya usuarios reales usando la app, exportar `sesion_registro` a
   `ml/sesion_registro_export.csv` y re-correr `train_modelo2.py` con datos
   reales (documentado en el propio script).
3. Revisar si vale la pena tambien re-entrenar Modelo 1 con datos reales de
   adherencia/resultado de los propios usuarios (hoy solo usa el ancla
   olimpica + sintetico).

## Repo GitHub + Action mensual automatica (17 sep 2026)

- **Repo creado**: https://github.com/dado-droid-666/entrenamiento-app-cuentas
  (publico). `gh` CLI no se pudo instalar (quedo bloqueado por otro proceso
  `msiexec` del sistema, ajeno a esta tarea) — el repo se creo a mano desde
  github.com y se conecto via `git remote add origin` + `git push` normal
  (Git Credential Manager ya tenia sesion de GitHub, no hizo falta token).
- **GitHub Action**: `.github/workflows/reentrenar-modelo2.yml` — corre el
  dia 1 de cada mes (cron `0 6 1 * *`, UTC) o manualmente desde la pestana
  "Actions" del repo ("Run workflow"). Pasos: reentrena Modelo 2
  (`python ml/train_modelo2.py`), si el JSON exportado cambio lo commitea y
  hace push, y despliega a Netlify con `netlify-cli`.

### ⚠️ PENDIENTE — Dani necesita configurar 2 secrets en GitHub para que el deploy automatico funcione

Sin esto, la Action reentrena y commitea el modelo igual, pero el paso de
deploy a Netlify fallara (no puedo generar estas credenciales por ti, por
seguridad — hay que crearlas desde tu propia cuenta):

1. Ve a https://github.com/dado-droid-666/entrenamiento-app-cuentas/settings/secrets/actions
2. Click "New repository secret" y agrega:
   - **`NETLIFY_SITE_ID`** = `f3b34cb0-442d-44d0-bef8-fd5564f2f45a`
     (ya conocido, es el sitio `swim-goal-4u`)
   - **`NETLIFY_AUTH_TOKEN`** = (nuevo Personal Access Token de Netlify)
     Generalo en https://app.netlify.com/user/applications#personal-access-tokens
     -> "New access token" -> copia el valor y pegalo aqui como secret.
3. Listo — la proxima vez que corra la Action (o si la lanzas a mano desde
   la pestana Actions -> "Reentrenar Modelo 2 (mensual) y publicar" -> "Run
   workflow"), va a poder desplegar sola.

### Pendiente (actualizado)
1. Configurar los 2 secrets de arriba (Dani).
2. Cuando haya usuarios reales usando la app, exportar `sesion_registro` a
   `ml/sesion_registro_export.csv` y re-correr `train_modelo2.py` con datos
   reales — opcionalmente automatizar tambien esa exportacion agregando un
   secret `SUPABASE_DB_URL` (connection string de Postgres) al workflow.
3. Revisar si vale la pena tambien re-entrenar Modelo 1 con datos reales de
   adherencia/resultado de los propios usuarios (hoy solo usa el ancla
   olimpica + sintetico).
4. A partir de ahora, todo cambio de codigo deberia hacerse via
   `git add -A; git commit -m "..."; git push` en vez de solo
   `netlify deploy` directo, para que el repo en GitHub quede como fuente de
   verdad.
