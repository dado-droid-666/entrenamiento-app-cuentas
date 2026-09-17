// ============================================================================
// Datos del plan: 9 semanas | Lun 14 Sep 2026 -> Dom 15 Nov 2026 (COMPETENCIA)
// 2 albercas/semana (Martes + Sabado) | L/X/V fuerza | Jueves descanso activo
// ============================================================================

let PLAN_START = "2026-09-14"; // Lunes semana 1 (se recalcula si el usuario configura su propia fecha)
let COMPETITION_DATE = "2026-11-15"; // dia de la competencia (se recalcula al configurar)

const DAY_ORDER = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];
const DAY_OFFSET = { Lunes: 0, Martes: 1, Miercoles: 2, Jueves: 3, Viernes: 4, Sabado: 5, Domingo: 6 };

// tipo: fuerza | alberca | descanso | competencia
// bloques: pasos secuenciales para el "player" (uno a la vez)
// Estas 9 semanas son la PLANTILLA base (fases Base -> Taper). Se usan para generar
// el plan real segun la fecha de competencia que el usuario configure (ver generatePlan()).

let DEFAULT_SESSIONS = [
// ============================== SEMANA 1 — BASE ==============================
{ sem:1, dia:"Lunes", fase:"Base", tipo:"fuerza", sesion:"Fuerza A", objetivo:"Base TRX + core + traccion", total:"35-45 min",
  bloques:[
    {t:"Calentamiento", d:"4' cuerda + movilidad hombros/cadera/tobillo"},
    {t:"Superserie 1", d:"TRX Row 3x12", d2:"TRX Chest Press 3x10"},
    {t:"Superserie 2", d:"TRX Y Fly 3x10", d2:"TRX Power Pull 3x10/lado"},
    {t:"Superserie 3", d:"TRX Knee Tuck 3x10", d2:"Plank 3x30\""},
    {t:"Finisher", d:"Cuerda 6x30\"/30\""},
  ]},
{ sem:1, dia:"Martes", fase:"Base", tipo:"alberca", sesion:"Alberca A", objetivo:"Tecnica + base aerobica", total:"1900 m",
  bloques:[
    {t:"Calentamiento", d:"300 m suave variado"},
    {t:"Control de aire", d:"4x50 respirando 3/5/7"},
    {t:"Patada", d:"6x50 (2 crol tabla, 2 dorsal, 2 subacuatica suave)"},
    {t:"Tecnica", d:"6x50 (2 catch-up, 2 fingertip drag, 2 un brazo libre)"},
    {t:"Serie principal", d:"6x100 libre aerobico, 20\" descanso"},
    {t:"Afloje", d:"100 m suave"},
  ]},
{ sem:1, dia:"Miercoles", fase:"Base", tipo:"fuerza", sesion:"Fuerza B", objetivo:"Pierna + cadera + KB", total:"35-45 min",
  bloques:[
    {t:"Calentamiento", d:"4' cuerda + movilidad + 10 sentadillas + 10 puentes"},
    {t:"Circuito 1", d:"KB Swing 3x15", d2:"Goblet Squat 3x12", d3:"Reverse Lunge 3x8/pierna"},
    {t:"Circuito 2", d:"Single-leg RDL 3x8/pierna", d2:"TRX Hamstring Curl 3x12", d3:"Dead Bug 3x10/lado"},
    {t:"Finisher", d:"Cuerda 8x20\"/40\""},
  ]},
{ sem:1, dia:"Jueves", fase:"Base", tipo:"descanso", sesion:"Descanso activo", objetivo:"Recuperacion entre fuerza y alberca", total:"30-40 min",
  bloques:[
    {t:"Cardio suave", d:"Caminata 20-30' o bici suave"},
    {t:"Movilidad", d:"Hombros / cadera / tobillo 10' + foam roll. Sin carga."},
  ]},
{ sem:1, dia:"Viernes", fase:"Base", tipo:"fuerza", sesion:"Fuerza C", objetivo:"Stamina / HYROX", total:"35-50 min",
  bloques:[
    {t:"Calentamiento", d:"4' cuerda + movilidad"},
    {t:"4 rondas", d:"TRX Row 12 + KB Swing 15 + Push-ups 12 + TRX Plank 30\" + Jump Rope 45\"", d2:"Descanso 60\" entre rondas"},
    {t:"Finisher", d:"3 rondas TRX Power Pull 8/lado + Mountain Climbers 30\""},
  ]},
{ sem:1, dia:"Sabado", fase:"Base", tipo:"alberca", sesion:"Alberca C", objetivo:"Especifico + velocidad", total:"2300 m",
  bloques:[
    {t:"Calentamiento", d:"400 m suave"},
    {t:"Control de aire", d:"4x50 control"},
    {t:"Patada", d:"6x50 patada"},
    {t:"Tecnica", d:"6x50 tecnica"},
    {t:"Serie principal", d:"3x200 libre descendente", d2:"6x50 ritmo 100 (25\" desc)", d3:"4x50 fly controlado + 4x25 sprint"},
    {t:"Afloje", d:"100 m suave"},
  ]},
{ sem:1, dia:"Domingo", fase:"Base", tipo:"descanso", sesion:"Recuperacion", objetivo:"Movilidad", total:"-",
  bloques:[{t:"Descanso", d:"Caminata 20-30' + movilidad 10'"}]},

// ============================== SEMANA 2 — BASE ==============================
{ sem:2, dia:"Lunes", fase:"Base", tipo:"fuerza", sesion:"Fuerza A", objetivo:"Base TRX + core + traccion", total:"35-45 min",
  bloques:[
    {t:"Calentamiento", d:"4' cuerda + movilidad"},
    {t:"Serie principal", d:"TRX Row 4x12 + TRX Chest Press 4x10", d2:"TRX Y Fly 3x12 + TRX Power Pull 3x10/lado", d3:"TRX Knee Tuck 3x12 + Plank 3x35\""},
  ]},
{ sem:2, dia:"Martes", fase:"Base", tipo:"alberca", sesion:"Alberca A", objetivo:"Tecnica + base aerobica", total:"2000 m",
  bloques:[
    {t:"Calentamiento", d:"300 m suave"},
    {t:"Control de aire", d:"4x50 aire"},
    {t:"Patada", d:"6x50 patada"},
    {t:"Tecnica", d:"6x50 tecnica"},
    {t:"Serie principal", d:"8x100 libre aerobico, 15-20\" descanso"},
    {t:"Afloje", d:"100 m"},
  ]},
{ sem:2, dia:"Miercoles", fase:"Base", tipo:"fuerza", sesion:"Fuerza B", objetivo:"Pierna + cadera + KB", total:"35-50 min",
  bloques:[
    {t:"Calentamiento", d:"4' cuerda + movilidad + 10 sentadillas + 10 puentes"},
    {t:"Serie principal", d:"KB Swing 4x15 + Goblet Squat 4x12", d2:"Reverse Lunge 3x10/pierna + TRX Hamstring Curl 3x12", d3:"TRX Split Squat 3x10/pierna + Hollow Hold 3x25\""},
  ]},
{ sem:2, dia:"Jueves", fase:"Base", tipo:"descanso", sesion:"Descanso activo", objetivo:"Recuperacion entre fuerza y alberca", total:"30-40 min",
  bloques:[{t:"Cardio suave", d:"Caminata 20-30' o bici suave"},{t:"Movilidad", d:"10' + foam roll. Sin carga."}]},
{ sem:2, dia:"Viernes", fase:"Base", tipo:"fuerza", sesion:"Fuerza C", objetivo:"Stamina / HYROX", total:"35-50 min",
  bloques:[
    {t:"Calentamiento", d:"4' cuerda + movilidad"},
    {t:"5 rondas", d:"TRX Row 10 + KB Swing 15 + Push-ups 10 + TRX Knee Tuck 10 + Jump Rope 45\"", d2:"Descanso 45\""},
  ]},
{ sem:2, dia:"Sabado", fase:"Base", tipo:"alberca", sesion:"Alberca C", objetivo:"Especifico + velocidad", total:"2400 m",
  bloques:[
    {t:"Calentamiento", d:"400 m suave"},
    {t:"Control de aire", d:"4x50 aire"},
    {t:"Patada", d:"6x50 patada"},
    {t:"Tecnica", d:"6x50 tecnica"},
    {t:"Serie principal", d:"2x200 libre + 4x100 ritmo medio", d2:"8x50 alt ritmo 100/200", d3:"4x25 fly fuertes"},
    {t:"Afloje", d:"100 m"},
  ]},
{ sem:2, dia:"Domingo", fase:"Base", tipo:"descanso", sesion:"Recuperacion", objetivo:"Movilidad", total:"-",
  bloques:[{t:"Descanso", d:"Movilidad 15' + foam roll"}]},

// ============================== SEMANA 3 — BASE FUERTE ==============================
{ sem:3, dia:"Lunes", fase:"Base", tipo:"fuerza", sesion:"Fuerza A", objetivo:"TRX mas intenso + core", total:"40-50 min",
  bloques:[
    {t:"Calentamiento", d:"4' cuerda + movilidad"},
    {t:"Serie principal", d:"TRX Row 4x10 + TRX Chest Press 4x10", d2:"TRX Face Pull/Y Fly 4x10 + TRX Power Pull 3x12/lado", d3:"TRX Pike 3x8 + Side Plank 3x30\"/lado"},
  ]},
{ sem:3, dia:"Martes", fase:"Base", tipo:"alberca", sesion:"Alberca A", objetivo:"Base aerobica", total:"2100 m",
  bloques:[
    {t:"Calentamiento", d:"300 m suave"},
    {t:"Control de aire", d:"4x50 aire"},
    {t:"Patada", d:"6x50 patada"},
    {t:"Tecnica", d:"6x50 tecnica"},
    {t:"Serie principal", d:"4x200 libre aerobico, 20\" descanso", d2:"4x50 libre suave tecnico"},
    {t:"Afloje", d:"100 m"},
  ]},
{ sem:3, dia:"Miercoles", fase:"Base", tipo:"fuerza", sesion:"Fuerza B", objetivo:"Pierna + cadera + KB", total:"40-50 min",
  bloques:[
    {t:"Calentamiento", d:"4' cuerda + movilidad"},
    {t:"Serie principal", d:"KB Swing 4x18 + Goblet Squat 4x10", d2:"Split Squat 3x10/pierna + Single-leg RDL 3x8/pierna", d3:"TRX Hamstring Curl 3x12 + Dead Bug 3x12/lado"},
  ]},
{ sem:3, dia:"Jueves", fase:"Base", tipo:"descanso", sesion:"Descanso activo", objetivo:"Recuperacion entre fuerza y alberca", total:"30-40 min",
  bloques:[{t:"Cardio suave", d:"Caminata 20-30' o bici suave"},{t:"Movilidad", d:"10' + foam roll. Sin carga."}]},
{ sem:3, dia:"Viernes", fase:"Base", tipo:"fuerza", sesion:"Fuerza C", objetivo:"EMOM stamina", total:"35-50 min",
  bloques:[
    {t:"Calentamiento", d:"4' cuerda + movilidad"},
    {t:"EMOM 12'", d:"min1 TRX Row 12 / min2 KB Swing 15 / min3 Push-ups 12 / min4 Jump Rope 45\" x3 vueltas"},
    {t:"Finisher", d:"TRX Plank 3x35\" + Power Pull 3x8/lado"},
  ]},
{ sem:3, dia:"Sabado", fase:"Base", tipo:"alberca", sesion:"Alberca C", objetivo:"Especifico", total:"2500 m",
  bloques:[
    {t:"Calentamiento", d:"400 m suave"},
    {t:"Control de aire", d:"4x50 aire"},
    {t:"Patada", d:"6x50 patada"},
    {t:"Tecnica", d:"6x50 tecnica"},
    {t:"Serie principal", d:"3x200 libre ritmo sostenido", d2:"8x50 (4 ritmo 100 + 4 suave)", d3:"4x50 fly/libre + 4x25 sprint"},
    {t:"Afloje", d:"100 m"},
  ]},
{ sem:3, dia:"Domingo", fase:"Base", tipo:"descanso", sesion:"Recuperacion", objetivo:"Movilidad", total:"-",
  bloques:[{t:"Descanso", d:"Movilidad 15' + foam roll"}]},

// ============================== SEMANA 4 — CONSTRUCCION ==============================
{ sem:4, dia:"Lunes", fase:"Construccion", tipo:"fuerza", sesion:"Fuerza A", objetivo:"Fuerza funcional", total:"40-50 min",
  bloques:[
    {t:"Calentamiento", d:"4' cuerda + movilidad"},
    {t:"Serie principal", d:"TRX Row 5x10 + TRX Chest Press 5x10", d2:"TRX Y Fly 4x10 + TRX Power Pull 4x10/lado", d3:"TRX Pike 4x8 + Plank 3x40\""},
  ]},
{ sem:4, dia:"Martes", fase:"Construccion", tipo:"alberca", sesion:"Alberca A", objetivo:"Base + ritmo", total:"2200 m",
  bloques:[
    {t:"Calentamiento", d:"300 m suave"},{t:"Control de aire", d:"4x50 aire"},{t:"Patada", d:"6x50 patada"},{t:"Tecnica", d:"6x50 tecnica"},
    {t:"Serie principal", d:"5x200 libre ritmo medio-fuerte"},{t:"Afloje", d:"100 m"},
  ]},
{ sem:4, dia:"Miercoles", fase:"Construccion", tipo:"fuerza", sesion:"Fuerza B", objetivo:"Pierna + potencia", total:"40-55 min",
  bloques:[
    {t:"Calentamiento", d:"4' cuerda + movilidad"},
    {t:"Serie principal", d:"KB Swing 5x18 + Goblet Squat 4x12", d2:"Split Squat 4x10/pierna + RDL 4x10", d3:"TRX Hamstring Curl 4x12 + Dead Bug 3x12/lado"},
  ]},
{ sem:4, dia:"Jueves", fase:"Construccion", tipo:"descanso", sesion:"Descanso activo", objetivo:"Recuperacion entre fuerza y alberca", total:"30-40 min",
  bloques:[{t:"Cardio suave", d:"Caminata 20-30' o bici suave"},{t:"Movilidad", d:"10' + foam roll. Sin carga."}]},
{ sem:4, dia:"Viernes", fase:"Construccion", tipo:"fuerza", sesion:"Fuerza C", objetivo:"AMRAP stamina", total:"35-50 min",
  bloques:[
    {t:"Calentamiento", d:"4' cuerda + movilidad"},
    {t:"AMRAP 18'", d:"10 TRX Row + 12 KB Swing + 10 Push-ups + 12 Air Squats + 40\" Jump Rope + 10 TRX Knee Tuck"},
  ]},
{ sem:4, dia:"Sabado", fase:"Construccion", tipo:"alberca", sesion:"Alberca C", objetivo:"Especifico + velocidad", total:"2600 m",
  bloques:[
    {t:"Calentamiento", d:"400 m suave"},{t:"Control de aire", d:"4x50 aire"},{t:"Patada", d:"6x50 patada"},{t:"Tecnica", d:"6x50 tecnica"},
    {t:"Serie principal", d:"3x200 libre + 4x100 libre", d2:"8x50 ritmo 100/sprint controlado", d3:"4x50 fly"},{t:"Afloje", d:"100 m"},
  ]},
{ sem:4, dia:"Domingo", fase:"Construccion", tipo:"descanso", sesion:"Recuperacion", objetivo:"Movilidad", total:"-",
  bloques:[{t:"Descanso", d:"Movilidad 15' + foam roll"}]},

// ============================== SEMANA 5 — CONSTRUCCION ALTA ==============================
{ sem:5, dia:"Lunes", fase:"Construccion", tipo:"fuerza", sesion:"Fuerza A", objetivo:"TRX + core fuerte", total:"40-50 min",
  bloques:[
    {t:"Calentamiento", d:"4' cuerda + movilidad"},
    {t:"Serie principal", d:"TRX Row 5x12 + TRX Chest Press 4x12", d2:"TRX Power Pull 4x12/lado + TRX Face Pull 4x12", d3:"TRX Pike 4x8 + Side Plank 3x40\""},
  ]},
{ sem:5, dia:"Martes", fase:"Construccion", tipo:"alberca", sesion:"Alberca A", objetivo:"Base solida", total:"2300 m",
  bloques:[
    {t:"Calentamiento", d:"300 m suave"},{t:"Control de aire", d:"4x50 aire"},{t:"Patada", d:"6x50 patada"},{t:"Tecnica", d:"6x50 tecnica"},
    {t:"Serie principal", d:"6x200 libre"},{t:"Afloje", d:"100 m"},
  ]},
{ sem:5, dia:"Miercoles", fase:"Construccion", tipo:"fuerza", sesion:"Fuerza B", objetivo:"Pierna/cadera fuerte", total:"45-55 min",
  bloques:[
    {t:"Calentamiento", d:"4' cuerda + movilidad"},
    {t:"Serie principal", d:"KB Swing 6x15 + Goblet Squat 4x10", d2:"Reverse Lunge 4x10/pierna + Single-leg RDL 4x8/pierna", d3:"TRX Hamstring Curl 4x12 + Hollow Hold 3x30\""},
  ]},
{ sem:5, dia:"Jueves", fase:"Construccion", tipo:"descanso", sesion:"Descanso activo", objetivo:"Recuperacion entre fuerza y alberca", total:"30-40 min",
  bloques:[{t:"Cardio suave", d:"Caminata 20-30' o bici suave"},{t:"Movilidad", d:"10' + foam roll. Sin carga."}]},
{ sem:5, dia:"Viernes", fase:"Construccion", tipo:"fuerza", sesion:"Fuerza C", objetivo:"Circuito fuerte", total:"40-50 min",
  bloques:[
    {t:"Calentamiento", d:"4' cuerda + movilidad"},
    {t:"5 rondas", d:"TRX Row 12 + KB Swing 15 + Push-ups 12 + TRX Knee Tuck 12 + Jump Rope 50\"", d2:"Descanso 40\""},
  ]},
{ sem:5, dia:"Sabado", fase:"Construccion", tipo:"alberca", sesion:"Alberca C", objetivo:"Especifico + volumen", total:"2600 m",
  bloques:[
    {t:"Calentamiento", d:"400 m suave"},{t:"Control de aire", d:"4x50 aire"},{t:"Patada", d:"6x50 patada"},{t:"Tecnica", d:"6x50 tecnica"},
    {t:"Serie principal", d:"2x200 + 4x100", d2:"8x50 ritmo 100", d3:"4x50 fly/largo"},{t:"Afloje", d:"100 m"},
  ]},
{ sem:5, dia:"Domingo", fase:"Construccion", tipo:"descanso", sesion:"Recuperacion", objetivo:"Movilidad", total:"-",
  bloques:[{t:"Descanso", d:"Movilidad 15' + foam roll"}]},

// ============================== SEMANA 6 — PICO ==============================
{ sem:6, dia:"Lunes", fase:"Pico", tipo:"fuerza", sesion:"Fuerza A", objetivo:"Fuerza funcional alta", total:"40-50 min",
  bloques:[
    {t:"Calentamiento", d:"4' cuerda + movilidad"},
    {t:"Serie principal", d:"TRX Row 5x10 + TRX Chest Press 5x10", d2:"TRX Y Fly 4x10 + TRX Power Pull 4x10/lado", d3:"TRX Pike 4x8 + Side Plank 3x45\""},
  ]},
{ sem:6, dia:"Martes", fase:"Pico", tipo:"alberca", sesion:"Alberca A", objetivo:"Base solida", total:"2400 m",
  bloques:[
    {t:"Calentamiento", d:"300 m suave"},{t:"Control de aire", d:"4x50 aire"},{t:"Patada", d:"6x50 patada"},{t:"Tecnica", d:"6x50 tecnica"},
    {t:"Serie principal", d:"5x200 libre ritmo medio"},{t:"Afloje", d:"100 m"},
  ]},
{ sem:6, dia:"Miercoles", fase:"Pico", tipo:"fuerza", sesion:"Fuerza B", objetivo:"Pierna + potencia", total:"45-55 min",
  bloques:[
    {t:"Calentamiento", d:"4' cuerda + movilidad"},
    {t:"Serie principal", d:"KB Swing 5x20 + Goblet Squat 4x12", d2:"Reverse Lunge 4x10/pierna + Single-leg RDL 4x8/pierna", d3:"TRX Hamstring Curl 4x12 + Hollow Hold 3x35\""},
  ]},
{ sem:6, dia:"Jueves", fase:"Pico", tipo:"descanso", sesion:"Descanso activo", objetivo:"Recuperacion. Semana pico.", total:"30-40 min",
  bloques:[{t:"Cardio suave", d:"Caminata 20-30' suave"},{t:"Movilidad", d:"15' + foam roll. Prioriza sueno. Sin carga."}]},
{ sem:6, dia:"Viernes", fase:"Pico", tipo:"fuerza", sesion:"Fuerza C", objetivo:"AMRAP 20", total:"40-50 min",
  bloques:[
    {t:"Calentamiento", d:"4' cuerda + movilidad"},
    {t:"AMRAP 20'", d:"12 TRX Row + 15 KB Swing + 12 Push-ups + 15 Air Squats + 50\" Jump Rope + 10 TRX Knee Tuck"},
  ]},
{ sem:6, dia:"Sabado", fase:"Pico", tipo:"alberca", sesion:"Alberca C", objetivo:"PICO de volumen", total:"2800 m",
  bloques:[
    {t:"Calentamiento", d:"400 m suave"},{t:"Control de aire", d:"4x50 aire"},{t:"Patada", d:"6x50 patada"},{t:"Tecnica", d:"6x50 tecnica"},
    {t:"Serie principal", d:"2x300 libre + 4x100 libre", d2:"8x50 ritmo competitivo", d3:"4x50 fly"},{t:"Afloje", d:"100 m"},
  ]},
{ sem:6, dia:"Domingo", fase:"Pico", tipo:"descanso", sesion:"Recuperacion", objetivo:"Movilidad", total:"-",
  bloques:[{t:"Descanso", d:"Movilidad 20' + descanso extra. Semana pico: prioriza sueno y comida."}]},

// ============================== SEMANA 7 — ESPECIFICO ==============================
{ sem:7, dia:"Lunes", fase:"Especifico", tipo:"fuerza", sesion:"Fuerza A", objetivo:"Mantenimiento", total:"35-45 min",
  bloques:[
    {t:"Calentamiento", d:"4' cuerda + movilidad"},
    {t:"Serie principal", d:"TRX Row 4x10 + TRX Chest Press 4x10", d2:"TRX Y Fly 3x10 + TRX Power Pull 3x10/lado", d3:"TRX Pike 3x8 + Plank 3x40\""},
  ]},
{ sem:7, dia:"Martes", fase:"Especifico", tipo:"alberca", sesion:"Alberca A", objetivo:"Tecnica + ritmo", total:"2200 m",
  bloques:[
    {t:"Calentamiento", d:"300 m suave"},{t:"Control de aire", d:"4x50 aire"},{t:"Patada", d:"6x50 patada"},{t:"Tecnica", d:"6x50 tecnica"},
    {t:"Serie principal", d:"4x200 libre controlado + 4x50 pull"},{t:"Afloje", d:"100 m"},
  ]},
{ sem:7, dia:"Miercoles", fase:"Especifico", tipo:"fuerza", sesion:"Fuerza B", objetivo:"Mantenimiento pierna", total:"35-45 min",
  bloques:[
    {t:"Calentamiento", d:"4' cuerda + movilidad"},
    {t:"Serie principal", d:"KB Swing 4x15 + Goblet Squat 4x10", d2:"Split Squat 3x8/pierna + RDL 3x8", d3:"TRX Hamstring Curl 3x10 + Hollow Hold 3x30\""},
  ]},
{ sem:7, dia:"Jueves", fase:"Especifico", tipo:"descanso", sesion:"Descanso activo", objetivo:"Recuperacion entre fuerza y alberca", total:"30-40 min",
  bloques:[{t:"Cardio suave", d:"Caminata 20-30' o bici suave"},{t:"Movilidad", d:"10' + foam roll. Sin carga."}]},
{ sem:7, dia:"Viernes", fase:"Especifico", tipo:"fuerza", sesion:"Fuerza C", objetivo:"Circuito corto", total:"35-45 min",
  bloques:[
    {t:"Calentamiento", d:"4' cuerda + movilidad"},
    {t:"4 rondas", d:"TRX Row 10 + KB Swing 12 + Push-ups 10 + Jump Rope 40\" + TRX Knee Tuck 10", d2:"Descanso 45\""},
  ]},
{ sem:7, dia:"Sabado", fase:"Especifico", tipo:"alberca", sesion:"Alberca C", objetivo:"Especifico", total:"2500 m",
  bloques:[
    {t:"Calentamiento", d:"400 m suave"},{t:"Control de aire", d:"4x50 aire"},{t:"Patada", d:"6x50 patada"},{t:"Tecnica", d:"6x50 tecnica"},
    {t:"Serie principal", d:"3x200 libre + 8x50 ritmo prueba", d2:"4x50 fly"},{t:"Afloje", d:"100 m"},
  ]},
{ sem:7, dia:"Domingo", fase:"Especifico", tipo:"descanso", sesion:"Recuperacion", objetivo:"Movilidad", total:"-",
  bloques:[{t:"Descanso", d:"Movilidad 15' + foam roll"}]},

// ============================== SEMANA 8 — PRE-TAPER ==============================
{ sem:8, dia:"Lunes", fase:"Pre-taper", tipo:"fuerza", sesion:"Fuerza A", objetivo:"Baja carga", total:"30-40 min",
  bloques:[
    {t:"Calentamiento", d:"4' cuerda + movilidad"},
    {t:"Serie principal", d:"TRX Row 3x10 + TRX Chest Press 3x10", d2:"TRX Power Pull 3x8/lado + TRX Y Fly 3x10", d3:"TRX Pike 3x6 + Plank 3x30\""},
  ]},
{ sem:8, dia:"Martes", fase:"Pre-taper", tipo:"alberca", sesion:"Alberca A", objetivo:"Control + ritmo", total:"2000 m",
  bloques:[
    {t:"Calentamiento", d:"300 m suave"},{t:"Control de aire", d:"4x50 aire"},{t:"Patada", d:"6x50 patada"},{t:"Tecnica", d:"6x50 tecnica"},
    {t:"Serie principal", d:"4x100 libre ritmo controlado + 4x50 suave"},{t:"Afloje", d:"100 m"},
  ]},
{ sem:8, dia:"Miercoles", fase:"Pre-taper", tipo:"fuerza", sesion:"Fuerza B", objetivo:"Baja carga pierna", total:"30-40 min",
  bloques:[
    {t:"Calentamiento", d:"4' cuerda + movilidad"},
    {t:"Serie principal", d:"KB Swing 3x15 + Goblet Squat 3x10", d2:"Split Squat 3x8/pierna + TRX Hamstring Curl 3x10", d3:"Hollow Hold 3x25\""},
  ]},
{ sem:8, dia:"Jueves", fase:"Pre-taper", tipo:"descanso", sesion:"Descanso activo", objetivo:"Recuperacion. Pre-taper.", total:"25-35 min",
  bloques:[{t:"Cardio suave", d:"Caminata 20' suave"},{t:"Movilidad", d:"10' + foam roll. Sin carga."}]},
{ sem:8, dia:"Viernes", fase:"Pre-taper", tipo:"fuerza", sesion:"Fuerza C", objetivo:"Circuito corto", total:"30-40 min",
  bloques:[
    {t:"Calentamiento", d:"4' cuerda + movilidad"},
    {t:"3 rondas", d:"TRX Row 10 + KB Swing 12 + Push-ups 10 + Jump Rope 40\" + TRX Knee Tuck 10"},
  ]},
{ sem:8, dia:"Sabado", fase:"Pre-taper", tipo:"alberca", sesion:"Alberca C", objetivo:"Ultimo estimulo", total:"2200 m",
  bloques:[
    {t:"Calentamiento", d:"400 m suave"},{t:"Control de aire", d:"4x50 aire"},{t:"Patada", d:"6x50 patada"},{t:"Tecnica", d:"6x50 tecnica"},
    {t:"Serie principal", d:"2x200 libre + 6x50 ritmo prueba", d2:"4x50 rapidos"},{t:"Afloje", d:"100 m"},
  ]},
{ sem:8, dia:"Domingo", fase:"Pre-taper", tipo:"descanso", sesion:"Recuperacion", objetivo:"Movilidad", total:"-",
  bloques:[{t:"Descanso", d:"Descanso completo o movilidad suave 15'. Empieza a afinar sueno y comida."}]},

// ============================== SEMANA 9 — TAPER + COMPETENCIA ==============================
{ sem:9, dia:"Lunes", fase:"Taper", tipo:"fuerza", sesion:"Fuerza A", objetivo:"Descarga", total:"25-35 min",
  bloques:[
    {t:"Calentamiento", d:"4' cuerda suave + movilidad"},
    {t:"Serie principal", d:"TRX Row 2x10 + TRX Chest Press 2x10", d2:"TRX Y Fly 2x8 + TRX Power Pull 2x8/lado", d3:"Plank 2x25\""},
  ]},
{ sem:9, dia:"Martes", fase:"Taper", tipo:"alberca", sesion:"Alberca A", objetivo:"Activacion", total:"1600-1800 m",
  bloques:[
    {t:"Calentamiento", d:"300 m suave"},{t:"Control de aire", d:"4x50 aire"},{t:"Patada", d:"4x50 patada"},{t:"Tecnica", d:"4x50 tecnica"},
    {t:"Serie principal", d:"4x100 libre suave/ritmo + 4x25 progresivos"},{t:"Afloje", d:"100 m"},
  ]},
{ sem:9, dia:"Miercoles", fase:"Taper", tipo:"fuerza", sesion:"Fuerza B", objetivo:"Descarga", total:"25-35 min",
  bloques:[
    {t:"Calentamiento", d:"4' cuerda suave + movilidad"},
    {t:"Serie principal", d:"KB Swing 2x12 + Goblet Squat 2x10", d2:"Reverse Lunge 2x8/pierna + TRX Hamstring Curl 2x10", d3:"Dead Bug 2x10/lado"},
  ]},
{ sem:9, dia:"Jueves", fase:"Taper", tipo:"descanso", sesion:"Descanso activo", objetivo:"Llegar fresco a sabado y domingo", total:"10-15 min",
  bloques:[{t:"Movilidad suave", d:"10' sin carga"},{t:"Nota", d:"Hidratacion, revisar equipo, sueno temprano."}]},
{ sem:9, dia:"Viernes", fase:"Taper", tipo:"descanso", sesion:"Pre-competencia", objetivo:"Llegar fresco", total:"10-15 min",
  bloques:[{t:"Descanso activo", d:"Movilidad suave, hidratacion, revisar equipo. Sin carga."}]},
{ sem:9, dia:"Sabado", fase:"Taper", tipo:"alberca", sesion:"Alberca C", objetivo:"Activacion / test corto", total:"1200-1500 m",
  bloques:[
    {t:"Calentamiento", d:"300 m suave"},{t:"Control de aire", d:"4x50 aire"},{t:"Tecnica", d:"4x50 tecnica"},{t:"Progresivos", d:"4x25 progresivos"},
    {t:"Serie principal", d:"4x25 ritmo prueba. Salir con sensacion de velocidad, no de fatiga."},{t:"Afloje", d:"100 m"},
  ]},
{ sem:9, dia:"Domingo", fase:"Taper", tipo:"competencia", sesion:"COMPETENCIA", objetivo:"15 de noviembre 2026", total:"COMPETENCIA",
  bloques:[
    {t:"Calentamiento de competencia", d:"Segun protocolo de la sede"},
    {t:"Mentalidad", d:"Confia en el trabajo de las 9 semanas. Ritmo de prueba, tecnica limpia, no salir disparado."},
    {t:"Afloje", d:"Afloje post carrera + hidratacion"},
  ]},
];

// Fase -> color de acento
const FASE_COLOR = {
  "Base": "#2ecc71",
  "Construccion": "#f39c12",
  "Pico": "#e91e8c",
  "Especifico": "#3d8bfd",
  "Pre-taper": "#c9a227",
  "Taper": "#ff3b5c",
};

const TIPO_LABEL = {
  fuerza: "Fuerza",
  alberca: "Alberca",
  descanso: "Descanso",
  competencia: "Competencia",
};

const TIPO_ICON = {
  fuerza: "💪",
  alberca: "🏊",
  descanso: "🌙",
  competencia: "🏆",
};

// ============================================================================
// Generador dinamico de plan: toma la plantilla de 9 semanas (arriba) y la
// escala/reacomoda para que empiece hoy (o la fecha que elijas) y termine
// exactamente en tu fecha de competencia, sin importar cuantas semanas falten
// ni en que dia de la semana caiga la competencia.
// ============================================================================

const SETTINGS_KEY = "plan15nov_settings_v1";
let SESSIONS = DEFAULT_SESSIONS;

function buildTemplateWeeks() {
  const weeks = {};
  DEFAULT_SESSIONS.forEach(s => {
    if (!weeks[s.sem]) weeks[s.sem] = [];
    weeks[s.sem].push(s);
  });
  Object.keys(weeks).forEach(k => {
    weeks[k].sort((a, b) => DAY_ORDER.indexOf(a.dia) - DAY_ORDER.indexOf(b.dia));
  });
  return weeks; // {1:[7 sesiones Lun..Dom], ..., 9:[...]}
}
const TEMPLATE_WEEKS = buildTemplateWeeks();

function isoAdd(iso, days) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
// 0=Lunes ... 6=Domingo (para que coincida con DAY_ORDER/DAY_OFFSET)
function isoWeekday(iso) {
  const jsDay = new Date(iso + "T00:00:00").getDay(); // 0=Domingo..6=Sabado
  return (jsDay + 6) % 7;
}
function mondayOf(iso) {
  return isoAdd(iso, -isoWeekday(iso));
}
function cloneSession(tpl, sem, dia) {
  return Object.assign({}, tpl, { sem, dia });
}

// Patron de dias por defecto (Lunes..Domingo), igual al de la plantilla original:
// 3 gimnasio + 2 alberca + 2 descanso.
const DEFAULT_DIAS_PATTERN = ["gimnasio", "alberca", "gimnasio", "descanso", "gimnasio", "alberca", "descanso"];

// Elige "count" sesiones de un pool (ordenado, ej. [FuerzaA, FuerzaB, FuerzaC]) para una
// semana dada. Si coincide con el tamano del pool, se usan todas. Si piden menos, se
// rota (por semana) cual se omite, para que a lo largo del plan se cubran todas por igual.
// Si piden mas, se repiten desde el inicio del pool como volumen extra.
function pickContentForWeek(pool, count, weekIndex) {
  const P = pool.length;
  if (P === 0 || count <= 0) return [];
  if (count === P) return pool.slice();
  if (count < P) {
    const numDrop = P - count;
    const dropStart = weekIndex % P;
    const dropSet = new Set();
    for (let i = 0; i < numDrop; i++) dropSet.add((dropStart + i) % P);
    return pool.filter((_, idx) => !dropSet.has(idx));
  }
  const result = pool.slice();
  let i = 0;
  while (result.length < count) { result.push(pool[i % P]); i++; }
  return result;
}

// Genera las sesiones entre startISO (se ajusta al lunes de esa semana) y
// competitionISO (puede caer en cualquier dia de la semana). La ultima semana
// siempre usa la plantilla de taper+competencia (semana 9), recortada para
// terminar justo el dia de la competencia (no se personaliza por "dias", para
// no romper el taper justo antes de competir).
function generatePlan(competitionISO, startISO, dias) {
  const compMonday = mondayOf(competitionISO);
  const compDayIdx = isoWeekday(competitionISO); // 0..6 (Lun..Dom)
  const todayISOStr = new Date().toISOString().slice(0, 10);
  const start = mondayOf(startISO || todayISOStr);
  const totalWeeks = Math.max(1, Math.round((new Date(compMonday + "T00:00:00") - new Date(start + "T00:00:00")) / 604800000) + 1);
  const diasMap = (dias && dias.length === 7) ? dias : DEFAULT_DIAS_PATTERN;

  const fullWeeks = totalWeeks - 1; // semanas completas antes de la semana de taper/competencia
  const result = [];

  const diasAlberca = [], diasGimnasio = [], diasDescanso = [];
  diasMap.forEach((tipo, idx) => {
    if (tipo === "alberca") diasAlberca.push(idx);
    else if (tipo === "gimnasio") diasGimnasio.push(idx);
    else diasDescanso.push(idx);
  });

  for (let w = 0; w < fullWeeks; w++) {
    let tplIdx;
    if (fullWeeks <= 1) tplIdx = 4;
    else tplIdx = Math.round(1 + (w * 7) / (fullWeeks - 1));
    tplIdx = Math.min(8, Math.max(1, tplIdx));
    const tplWeek = TEMPLATE_WEEKS[tplIdx];
    const weekStart = isoAdd(start, w * 7);

    const albercaPool = tplWeek.filter(s => s.tipo === "alberca");
    const fuerzaPool = tplWeek.filter(s => s.tipo === "fuerza");
    const descansoPool = tplWeek.filter(s => s.tipo === "descanso");

    const contAlberca = pickContentForWeek(albercaPool, diasAlberca.length, w);
    const contGimnasio = pickContentForWeek(fuerzaPool, diasGimnasio.length, w);
    const contDescanso = pickContentForWeek(descansoPool, diasDescanso.length, w);

    diasAlberca.forEach((idx, i) => {
      const iso = isoAdd(weekStart, idx);
      result.push(cloneSession(contAlberca[i], w + 1, DAY_ORDER[isoWeekday(iso)]));
    });
    diasGimnasio.forEach((idx, i) => {
      const iso = isoAdd(weekStart, idx);
      result.push(cloneSession(contGimnasio[i], w + 1, DAY_ORDER[isoWeekday(iso)]));
    });
    diasDescanso.forEach((idx, i) => {
      const iso = isoAdd(weekStart, idx);
      result.push(cloneSession(contDescanso[i], w + 1, DAY_ORDER[isoWeekday(iso)]));
    });
  }

  // semana final (taper + competencia): tomar los ultimos N dias de la semana 9,
  // donde N depende del dia de la semana en que cae la competencia
  const week9 = TEMPLATE_WEEKS[9];
  const n = compDayIdx + 1;
  const slice = week9.slice(7 - n);
  slice.forEach((tpl, i) => {
    const iso = isoAdd(competitionISO, -(n - 1 - i));
    const dia = DAY_ORDER[isoWeekday(iso)];
    result.push(cloneSession(tpl, fullWeeks + 1, dia));
  });

  return { sessions: result, planStart: start };
}

function applySettings(competitionISO, startISO, eventos, dias) {
  const { sessions, planStart } = generatePlan(competitionISO, startISO, dias);
  SESSIONS = specializeForEvents(sessions, eventos || []);
  PLAN_START = planStart;
  COMPETITION_DATE = competitionISO;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ competitionISO, startISO: startISO || null, eventos: eventos || [], dias: dias || null }));
  if (typeof window.pushProfileToCloud === "function") window.pushProfileToCloud(competitionISO, startISO || null, eventos || [], dias || null);
}

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)); }
  catch { return null; }
}

// ============================================================================
// Pruebas (eventos): catalogo + especializacion del plan segun lo que elijas.
// No reescribimos las sesiones base; les agregamos bloques enfocados a tu
// prueba (estilo especifico, velocidad, fondo, simulacro aguas abiertas).
// ============================================================================

const EVENTOS_DISPONIBLES = [
  { id: "50_libre", label: "50 libre", categoria: "alberca", estilo: "libre", distancia: 50 },
  { id: "100_libre", label: "100 libre", categoria: "alberca", estilo: "libre", distancia: 100 },
  { id: "200_libre", label: "200 libre", categoria: "alberca", estilo: "libre", distancia: 200 },
  { id: "400_libre", label: "400 libre", categoria: "alberca", estilo: "libre", distancia: 400 },
  { id: "800_libre", label: "800 libre", categoria: "alberca", estilo: "libre", distancia: 800 },
  { id: "1500_libre", label: "1500 libre", categoria: "alberca", estilo: "libre", distancia: 1500 },
  { id: "50_dorso", label: "50 dorso", categoria: "alberca", estilo: "dorso", distancia: 50 },
  { id: "100_dorso", label: "100 dorso", categoria: "alberca", estilo: "dorso", distancia: 100 },
  { id: "200_dorso", label: "200 dorso", categoria: "alberca", estilo: "dorso", distancia: 200 },
  { id: "50_pecho", label: "50 pecho", categoria: "alberca", estilo: "pecho", distancia: 50 },
  { id: "100_pecho", label: "100 pecho", categoria: "alberca", estilo: "pecho", distancia: 100 },
  { id: "200_pecho", label: "200 pecho", categoria: "alberca", estilo: "pecho", distancia: 200 },
  { id: "50_mariposa", label: "50 mariposa", categoria: "alberca", estilo: "mariposa", distancia: 50 },
  { id: "100_mariposa", label: "100 mariposa", categoria: "alberca", estilo: "mariposa", distancia: 100 },
  { id: "200_mariposa", label: "200 mariposa", categoria: "alberca", estilo: "mariposa", distancia: 200 },
  { id: "100_combinado", label: "100 combinado", categoria: "alberca", estilo: "combinado", distancia: 100 },
  { id: "200_combinado", label: "200 combinado", categoria: "alberca", estilo: "combinado", distancia: 200 },
  { id: "400_combinado", label: "400 combinado", categoria: "alberca", estilo: "combinado", distancia: 400 },
  { id: "1.5km_aa", label: "1.5 km aguas abiertas", categoria: "aguas_abiertas", distancia: 1500 },
  { id: "3km_aa", label: "3 km aguas abiertas", categoria: "aguas_abiertas", distancia: 3000 },
  { id: "5km_aa", label: "5 km aguas abiertas", categoria: "aguas_abiertas", distancia: 5000 },
  { id: "10km_aa", label: "10 km aguas abiertas", categoria: "aguas_abiertas", distancia: 10000 },
  { id: "25km_aa", label: "25 km aguas abiertas (maraton)", categoria: "aguas_abiertas", distancia: 25000 },
];

function eventoLabels(eventoIds) {
  return (eventoIds || [])
    .map(id => EVENTOS_DISPONIBLES.find(e => e.id === id))
    .filter(Boolean)
    .map(e => e.label);
}

function specializeForEvents(sessions, eventoIds) {
  if (!eventoIds || !eventoIds.length) return sessions;
  const eventos = eventoIds.map(id => EVENTOS_DISPONIBLES.find(e => e.id === id)).filter(Boolean);
  if (!eventos.length) return sessions;

  const labels = eventos.map(e => e.label);
  const estilosNoLibre = [...new Set(eventos.filter(e => e.categoria === "alberca" && e.estilo && e.estilo !== "libre").map(e => e.estilo))];
  const sprintEventos = eventos.filter(e => e.categoria === "alberca" && e.distancia <= 100);
  const fondoEventos = eventos.filter(e => e.categoria === "alberca" && e.distancia >= 400);
  const aguasAbiertas = eventos.filter(e => e.categoria === "aguas_abiertas");
  const totalWeeks = sessions.reduce((max, s) => Math.max(max, s.sem), 1);

  return sessions.map(s => {
    if (s.tipo !== "alberca" && s.tipo !== "competencia") return s;

    const clone = Object.assign({}, s, { bloques: s.bloques.map(b => Object.assign({}, b)) });

    if (s.tipo === "competencia") {
      clone.objetivo = labels.join(", ");
      clone.bloques = clone.bloques.concat([{
        t: "Tus pruebas de hoy",
        d: `Compites: ${labels.join(", ")}. Ejecuta el plan de carrera de cada una con calma, confia en las semanas de trabajo.`,
      }]);
      return clone;
    }

    // s.tipo === "alberca"
    clone.objetivo = `${s.objetivo} · Prueba: ${labels.join(", ")}`;
    const esUltimasSemanas = s.sem >= totalWeeks - 2; // aprox. Especifico/Pre-taper/Taper
    const nuevosBloques = [];

    if (estilosNoLibre.length && esUltimasSemanas) {
      nuevosBloques.push({
        t: "Estilo especifico",
        d: `4x50 ${estilosNoLibre.join("/")} a ritmo de prueba, 20" descanso`,
      });
    }
    if (sprintEventos.length && esUltimasSemanas) {
      nuevosBloques.push({
        t: "Velocidad de prueba",
        d: `${sprintEventos.map(e => `2x${e.distancia} ${e.estilo}`).join(" + ")} a ritmo maximo, descanso completo`,
      });
    }
    if (fondoEventos.length) {
      nuevosBloques.push({
        t: "Fondo especifico",
        d: `Serie aerobica orientada a ${fondoEventos.map(e => e.label).join(", ")}: prioriza aumentar el volumen de tus series de 200-400 progresivamente`,
      });
    }
    if (aguasAbiertas.length && esUltimasSemanas) {
      nuevosBloques.push({
        t: "Simulacro aguas abiertas",
        d: `Practica respiracion bilateral, sighting (levantar la vista cada 6-8 brazadas) y nado en grupo/estela si es posible. Objetivo: ${aguasAbiertas.map(e => e.label).join(", ")}`,
      });
    }

    if (nuevosBloques.length) {
      const idxAfloje = clone.bloques.findIndex(b => /afloje/i.test(b.t));
      if (idxAfloje === -1) clone.bloques = clone.bloques.concat(nuevosBloques);
      else clone.bloques.splice(idxAfloje, 0, ...nuevosBloques);
    }

    return clone;
  });
}
