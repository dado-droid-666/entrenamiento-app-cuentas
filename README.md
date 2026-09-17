# Plan 15 Nov — App de entrenamiento con cuentas + ML (PWA)

App web (PWA) con plan de 9 semanas hacia una competencia de natación,
personalizado por usuario (cuentas via Supabase) y calibrado por dos modelos
de Machine Learning entrenados sobre datos reales y del propio uso de la app.

**En vivo:** https://swim-goal-4u.netlify.app
**Repositorio:** https://github.com/dado-droid-666/entrenamiento-app-cuentas

> Nota: existe un "Proyecto 1" hermano (`entrenamiento-app`, sin cuentas ni
> ML, 100% local) publicado en https://1swimgoal.netlify.app — este README
> describe el Proyecto 2 (esta carpeta), que es el que tiene cuentas +
> modelos de ML.

---

## Qué hace la app

- **Plan dinámico de 9 semanas** (fases Base → Construcción → Pico →
  Específico → Taper) que se ajusta automáticamente a tu fecha de
  competencia y a los días que elijas para alberca/gimnasio/descanso.
- **Cuentas de usuario** (email + contraseña vía Supabase): cada quien ve
  solo su propio plan, progreso y registro de ejercicios, sincronizado en la
  nube (con respaldo local en el navegador si no hay internet).
- **Especialización por prueba**: eliges qué distancias/estilos vas a nadar
  y el plan agrega bloques específicos (velocidad, fondo, técnica, aguas
  abiertas) en las últimas semanas.
- **Reproductor paso a paso** con temporizador de descanso en los días de
  fuerza.
- **Captura de datos real** (obligatoria) al completar cada sesión: peso y
  reps en fuerza, esfuerzo percibido (escala 1-5 con emojis) en ambas
  disciplinas — esta es la base de datos que alimenta el Modelo 2.
- **Personalización por Machine Learning** (ver detalle abajo): nivel de
  natación calculado con un test estandarizado + Random Forest, y ajuste
  continuo de carga/reps según cómo te vas sintiendo sesión a sesión.

## Los 2 modelos de Machine Learning

### Modelo 1 — Random Forest: nivel inicial del usuario

- **Input**: edad, peso, altura, nivel de experiencia autopercibido, y un
  **test estandarizado de Critical Swim Speed (CSS)**: nadas 400m y 200m a
  máximo esfuerzo, la app calcula tu ritmo objetivo
  (`css_pace = (t400-t200)/(400-200)*100` seg/100m) automáticamente. El
  tiempo de 50m libre es opcional y afina más la predicción.
- **Output**: un *tier* (1=principiante, 2=intermedio, 3=avanzado) que
  calibra el ritmo objetivo de alberca (mostrado en pantalla) y escala las
  sugerencias de reps/tiempo en el modal de registro de fuerza.
- **Datos de entrenamiento** (transparencia total, ver comentarios en
  `ml/train_modelo1.py`): se usó el dataset real *"Olympic Swimming Results
  1912-2020"* (mismo dataset publicado en Kaggle por datasciencedonut,
  descargado desde su mirror en GitHub) como **ancla de nivel elite**
  (ritmo real de nadadores olímpicos). El resto del dataset — perfiles de
  nadadores recreativos (edad/peso/altura/nivel → tier) — es **sintético
  pero calibrado con esa ancla real**, porque no existe un dataset público
  de nadadores recreativos etiquetado por nivel.
- Entrenado con `RandomForestClassifier` (scikit-learn, 15 árboles),
  exportado a JSON (`ml/modelo1_arbol.json`) y ejecutado 100% en el
  navegador con un intérprete de árboles en JS puro (`arboles.js`,
  `modelo1.js`) — sin ONNX ni dependencias pesadas.

### Modelo 2 — Random Forest Regression: ajuste continuo (pooled)

- Sugiere un **factor de ajuste** (±25%) sobre la carga/reps de la próxima
  sesión para un ejercicio específico, a partir del historial reciente del
  usuario: esfuerzo promedio de las últimas 3 sesiones de ese ejercicio,
  tendencia del esfuerzo, adherencia reciente y semana del plan.
- Entrenado sobre los datos de **todos los usuarios agrupados** (no
  aislado por usuario), para que usuarios nuevos también se beneficien de
  patrones aprendidos de otros.
- **Reentrenamiento mensual automático** vía GitHub Actions
  (`.github/workflows/reentrenar-modelo2.yml`): corre el día 1 de cada mes
  (o manualmente desde la pestaña *Actions*), reentrena, commitea el JSON
  si cambió, y despliega a Netlify solo.
- Como la app recién se publicó, hoy entrena con un **dataset sintético de
  bootstrap** (documentado en `ml/train_modelo2.py`), fundamentado en la
  misma lógica de progresión conservadora que ya usa `progresion.js`. En
  cuanto haya historial real acumulado en `sesion_registro`, el mismo
  script puede entrenar con datos reales (ver instrucciones dentro del
  script) sin cambiar una sola línea de código.
- Se combina con el motor de reglas conservador (`progresion.js`) como
  respaldo si el modelo no está disponible o no hay historial suficiente
  para un ejercicio.

## Arquitectura

- **Frontend**: HTML/CSS/JS puro (sin frameworks ni build step), PWA con
  Service Worker para funcionar offline.
- **Backend**: Supabase (Postgres + Auth + RLS). Cada usuario solo puede
  leer/escribir sus propias filas.
- **ML**: entrenamiento offline en Python (scikit-learn), modelos
  exportados a JSON (árboles de decisión/regresión) e interpretados en JS
  en el cliente — cero infraestructura de inferencia adicional que
  mantener.
- **Hosting**: Netlify (deploy manual con `netlify-cli` o automático desde
  la GitHub Action mensual).
- **CI/CD de los modelos**: GitHub Actions.

## Estructura de archivos

```
entrenamiento-app-cuentas/
  index.html              pantallas + estilos + modal de registro
  app.js                  logica: fechas, navegacion, player, progreso, perfil, escalado por tier
  auth.js                 login/registro + sincronizacion con Supabase
  config.js               credenciales de Supabase (URL + anon key)
  data.js                 datos del plan (63 sesiones, 9 semanas) + generador dinamico
  ejercicios.js            catalogo de ejercicios (tipo de carga: reps/peso_reps/tiempo/distancia)
  parser.js                parser texto -> ejercicios estructurados (para el registro y el modal)
  progresion.js            motor de progresion conservador (reglas, respaldo del Modelo 2)
  arboles.js               interprete generico de arboles de decision/regresion (JS)
  modelo1.js               Modelo 1: prediccion de tier (Random Forest)
  modelo2.js               Modelo 2: sugerencia de ajuste continuo (Random Forest Regression)
  manifest.webmanifest      configuracion de instalacion PWA
  sw.js                     service worker (cache offline, precachea tambien los modelos)
  icons/                    iconos 180 / 192 / 512
  ml/
    train_modelo1.py        entrena y exporta Modelo 1
    train_modelo2.py        entrena y exporta Modelo 2 (mensual, via GitHub Action)
    modelo1_arbol.json       bosque exportado del Modelo 1 (servido a la app)
    modelo2_bosque.json      bosque exportado del Modelo 2 (servido a la app)
    olympic_swimming_raw.csv  dataset real usado como ancla del Modelo 1
  sql/
    schema.sql                esquema inicial (profiles, progreso)
    002_sesion_registro.sql   tabla de registro real de ejercicios (peso/reps/tiempo/esfuerzo)
    003_perfil_y_tier.sql     perfil fisico + pruebas_estandar + usuario_tier
  supabase/
    migrations/               copias versionadas de las migraciones (aplicadas via `supabase db push`)
  .github/workflows/
    reentrenar-modelo2.yml   Action mensual: reentrena, commitea y despliega
  PROGRESO.md               bitacora detallada de decisiones y pendientes
```

## Cómo correr en local

1. Abre PowerShell en esta carpeta.
2. Corre: `python -m http.server 5500`
3. Abre en el navegador: http://localhost:5500/index.html
4. Necesitas login (Supabase) para persistir en la nube; sin conexión la
   app sigue funcionando con localStorage.

## Cómo desplegar

```powershell
npx -y netlify-cli@latest deploy --prod --dir "."
```

(o simplemente hacer `git push` a `main` — la GitHub Action se encarga del
resto cuando corresponde reentrenar el Modelo 2).

## Reentrenar los modelos manualmente

```powershell
python ml\train_modelo1.py   # Modelo 1 (rara vez hace falta: su fuente no cambia seguido)
python ml\train_modelo2.py   # Modelo 2 (recomendado hacerlo cuando haya datos reales nuevos)
```

Cada JSON exportado incluye `version` y `trained_at` (timestamp UTC real)
para poder auditar qué versión del modelo está sirviendo la app en
cualquier momento.

## Base de datos (Supabase)

| Tabla | Contenido |
|---|---|
| `profiles` | perfil del usuario: fecha de competencia/inicio, eventos, días, edad, peso, altura, nivel |
| `progreso` | sesiones marcadas como completadas |
| `sesion_registro` | peso/reps/tiempo/esfuerzo real registrado por bloque de ejercicio |
| `pruebas_estandar` | resultados del test CSS (400m/200m/50m) |
| `usuario_tier` | tier asignado por el Modelo 1, con versión del modelo usado |

Todas con Row Level Security: cada usuario solo ve/edita sus propias filas.

## Notas y transparencia sobre los datos de entrenamiento

Este proyecto documenta explícitamente, en los propios scripts de
entrenamiento (`ml/train_modelo1.py`, `ml/train_modelo2.py`), qué parte de
cada dataset es real y qué parte es sintética/calibrada, para no aparentar
más rigor del que realmente hay todavía. Ver también `PROGRESO.md` para el
detalle completo de decisiones tomadas, validaciones hechas y pendientes.
