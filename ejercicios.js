// ============================================================================
// Catalogo de ejercicios usados en la plantilla de 9 semanas (data.js).
// Cada ejercicio tiene un tipo_carga que indica que se registra al completarlo:
//   - "peso_reps": se registra peso (kg/lb) y reps reales (fuerza, con carga externa)
//   - "reps":      solo reps reales (fuerza, peso corporal / TRX)
//   - "tiempo":    solo segundos reales sostenidos (planks, isometricos, cardio)
//   - "distancia": metros nadados reales (alberca)
// tipo_esfuerzo indica si aplica captura de esfuerzo (ver ESCALA_ESFUERZO en progresion.js):
//   todos los ejercicios de fuerza y alberca capturan esfuerzo; descanso no.
// ============================================================================

const EJERCICIOS = {
  // ---------------- FUERZA: tren superior / TRX ----------------
  trx_row:          { nombre: "TRX Row",              grupo: "espalda",        tipo_carga: "reps" },
  trx_chest_press:  { nombre: "TRX Chest Press",      grupo: "pecho",          tipo_carga: "reps" },
  trx_y_fly:        { nombre: "TRX Y Fly",            grupo: "hombro_espalda", tipo_carga: "reps" },
  trx_face_pull:    { nombre: "TRX Face Pull",        grupo: "hombro_espalda", tipo_carga: "reps" },
  trx_power_pull:   { nombre: "TRX Power Pull",       grupo: "espalda_rot",    tipo_carga: "reps", por_lado: true },
  trx_pike:         { nombre: "TRX Pike",             grupo: "core",           tipo_carga: "reps" },
  push_ups:         { nombre: "Push-ups",             grupo: "pecho",          tipo_carga: "reps" },

  // ---------------- FUERZA: core ----------------
  trx_knee_tuck:    { nombre: "TRX Knee Tuck",        grupo: "core",           tipo_carga: "reps" },
  plank:            { nombre: "Plank",                grupo: "core",           tipo_carga: "tiempo" },
  trx_plank:        { nombre: "TRX Plank",            grupo: "core",           tipo_carga: "tiempo" },
  side_plank:       { nombre: "Side Plank",           grupo: "core",           tipo_carga: "tiempo", por_lado: true },
  hollow_hold:      { nombre: "Hollow Hold",          grupo: "core",           tipo_carga: "tiempo" },
  dead_bug:         { nombre: "Dead Bug",             grupo: "core",           tipo_carga: "reps", por_lado: true },
  mountain_climbers:{ nombre: "Mountain Climbers",    grupo: "core_cardio",    tipo_carga: "tiempo" },

  // ---------------- FUERZA: pierna / cadera / KB ----------------
  kb_swing:         { nombre: "KB Swing",             grupo: "cadera_post",    tipo_carga: "peso_reps" },
  goblet_squat:     { nombre: "Goblet Squat",         grupo: "cuadriceps",     tipo_carga: "peso_reps" },
  air_squats:       { nombre: "Air Squats",           grupo: "cuadriceps",     tipo_carga: "reps" },
  reverse_lunge:    { nombre: "Reverse Lunge",        grupo: "pierna",         tipo_carga: "reps", por_lado: true },
  split_squat:      { nombre: "Split Squat",          grupo: "pierna",         tipo_carga: "reps", por_lado: true },
  trx_split_squat:  { nombre: "TRX Split Squat",      grupo: "pierna",         tipo_carga: "reps", por_lado: true },
  single_leg_rdl:   { nombre: "Single-leg RDL",       grupo: "isquios",        tipo_carga: "reps", por_lado: true },
  rdl:              { nombre: "RDL",                  grupo: "isquios",        tipo_carga: "peso_reps" },
  trx_ham_curl:     { nombre: "TRX Hamstring Curl",   grupo: "isquios",        tipo_carga: "reps" },

  // ---------------- FUERZA: cardio / finisher ----------------
  jump_rope:        { nombre: "Cuerda (saltos)",      grupo: "cardio",         tipo_carga: "tiempo" },

  // ---------------- DESCANSO / MOVILIDAD (sin registro de esfuerzo) ----------------
  caminata:         { nombre: "Caminata",             grupo: "descanso",       tipo_carga: "tiempo", sin_esfuerzo: true },
  movilidad:        { nombre: "Movilidad",            grupo: "descanso",       tipo_carga: "tiempo", sin_esfuerzo: true },
  foam_roll:        { nombre: "Foam roll",            grupo: "descanso",       tipo_carga: "tiempo", sin_esfuerzo: true },

  // ---------------- ALBERCA ----------------
  nado_calentamiento:{ nombre: "Calentamiento nado",  grupo: "alberca",        tipo_carga: "distancia" },
  control_aire:      { nombre: "Control de aire",     grupo: "alberca",        tipo_carga: "distancia" },
  patada:            { nombre: "Patada",              grupo: "alberca",        tipo_carga: "distancia" },
  tecnica_nado:      { nombre: "Tecnica (drills)",    grupo: "alberca",        tipo_carga: "distancia" },
  serie_principal:   { nombre: "Serie principal",     grupo: "alberca",        tipo_carga: "distancia" },
  progresivos:       { nombre: "Progresivos",         grupo: "alberca",        tipo_carga: "distancia" },
  afloje:            { nombre: "Afloje",              grupo: "alberca",        tipo_carga: "distancia" },
};

function ejercicioInfo(id) {
  return EJERCICIOS[id] || null;
}
