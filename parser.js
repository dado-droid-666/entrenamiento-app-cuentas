// ============================================================================
// Parser estructurado: convierte el texto de un bloque (d/d2/d3, escrito a
// mano en data.js) en una lista de ejercicios estructurados usando el
// catalogo de EJERCICIOS (ejercicios.js). No reemplaza d/d2/d3 (el render
// del player los sigue usando tal cual); esto es una CAPA ADICIONAL para que
// el motor de progresion y el registro de datos (sesion_registro) sepan
// exactamente que ejercicio/serie/reps corresponde a cada linea de texto.
// ============================================================================

// Nombres ordenados por longitud descendente para evitar matches parciales
// (ej. "TRX Row" no debe ganarle a "TRX Power Pull" si aparecen juntos).
function buildNombreIndex() {
  return Object.entries(EJERCICIOS)
    .map(([id, info]) => ({ id, nombre: info.nombre.toLowerCase(), info }))
    .sort((a, b) => b.nombre.length - a.nombre.length);
}
const NOMBRE_INDEX = buildNombreIndex();

// Alias para variantes de texto que no coinciden exacto con el nombre del catalogo
const ALIAS = {
  "cuerda": "jump_rope",
  "jump rope": "jump_rope",
  "foam roll": "foam_roll",
  "hombros / cadera / tobillo": "movilidad",
  "movilidad suave": "movilidad",
  "descanso activo": "movilidad",
  "cardio suave": "caminata",
  "power pull": "trx_power_pull", // aparece sin prefijo TRX en algun texto suelto
};

function matchExerciseId(fragmentLower) {
  for (const alias in ALIAS) {
    if (fragmentLower.includes(alias)) return ALIAS[alias];
  }
  for (const entry of NOMBRE_INDEX) {
    if (fragmentLower.includes(entry.nombre)) return entry.id;
  }
  return null;
}

// En sesiones de alberca y descanso, el titulo del bloque (b.t) identifica el
// ejercicio (el texto d/d2/d3 no siempre repite el nombre, ej. "6x100 libre
// aerobico" bajo el titulo "Serie principal"). Estos mapas son la fuente
// primaria de verdad para esos dos tipos de sesion.
const TITULO_ALBERCA = {
  "calentamiento": "nado_calentamiento",
  "control de aire": "control_aire",
  "patada": "patada",
  "tecnica": "tecnica_nado",
  "serie principal": "serie_principal",
  "progresivos": "progresivos",
  "afloje": "afloje",
};
const TITULO_DESCANSO = {
  "cardio suave": "caminata",
  "movilidad": "movilidad",
  "movilidad suave": "movilidad",
  "descanso activo": "movilidad",
  "descanso": "movilidad",
};

// Extrae distancias/series de un fragmento de texto de alberca, ej:
// "6x100 libre aerobico, 20\" descanso" -> {series:6, distancia_m:100}
// "300 m suave variado" -> {distancia_m:300}
// Puede haber mas de una serie en el mismo fragmento separadas por coma
// (ej. "2x200 libre + 4x100 ritmo medio" ya se separa por "+", pero dentro de
// un mismo campo puede venir "6x50 (2 crol tabla, 2 dorsal, 2 subacuatica)":
// en ese caso solo tomamos el patron principal NxM y dejamos el detalle en texto_original).
function parseDistancias(fragment) {
  const out = [];
  const re = /(\d+)\s*x\s*(\d+)/gi;
  let m;
  let found = false;
  while ((m = re.exec(fragment))) {
    out.push({ series: parseInt(m[1], 10), distancia_m: parseInt(m[2], 10) });
    found = true;
  }
  if (!found) {
    const solo = fragment.match(/(\d+)\s*m\b/i);
    if (solo) out.push({ distancia_m: parseInt(solo[1], 10) });
  }
  return out;
}

// Extrae numeros de un fragmento: series (Sx...), reps/segundos/metros
function parseNumeros(fragment) {
  const out = { series: null, reps: null, tiempo_seg: null, distancia_m: null, lado: false };
  if (/\/\s*lado/i.test(fragment)) out.lado = true;

  // Serie x algo, ej "3x12", "4x10", "6x50", "3x30\""
  const sxr = fragment.match(/(\d+)\s*x\s*(\d+)\s*(")?/i);
  if (sxr) {
    out.series = parseInt(sxr[1], 10);
    const n = parseInt(sxr[2], 10);
    if (sxr[3] === '"') out.tiempo_seg = n;
    else if (/^(alberca|nado|control_aire|patada|tecnica_nado|serie_principal|afloje|progresivos)$/.test("")) { /* handled by caller via tipo_carga */ }
    else out.reps = n; // por defecto asumimos reps; el caller reinterpreta segun tipo_carga del ejercicio
    return out;
  }

  // Reps sueltas sin serie explicita, ej "TRX Row 12" (dentro de rondas/EMOM)
  const soloReps = fragment.match(/\b(\d+)\b(?!\s*['"])/);
  if (soloReps) out.reps = parseInt(soloReps[1], 10);

  // Tiempo suelto, ej "30\"", "45\""
  const soloSeg = fragment.match(/(\d+)\s*"/);
  if (soloSeg) out.tiempo_seg = parseInt(soloSeg[1], 10);

  return out;
}

// Parsea un bloque {t, d, d2, d3} y devuelve un array de ejercicios estructurados.
// `tipoSesion` (fuerza|alberca|descanso|competencia) decide la estrategia:
// alberca/descanso usan el titulo del bloque como fuente primaria; fuerza usa
// matching de nombre de ejercicio dentro del texto (superseries/circuitos).
function parseBloque(bloque, tipoSesion) {
  const campos = [bloque.d, bloque.d2, bloque.d3].filter(Boolean);
  const resultado = [];
  const tituloLower = (bloque.t || "").toLowerCase().trim();

  if (tipoSesion === "alberca" && TITULO_ALBERCA[tituloLower]) {
    const id = TITULO_ALBERCA[tituloLower];
    campos.forEach(texto => {
      texto.split(",").forEach(sub => {
        const distancias = parseDistancias(sub);
        distancias.forEach(d => resultado.push(Object.assign({ id, texto_original: sub.trim() }, d)));
      });
      if (!parseDistancias(texto).length) {
        // fragmento sin numero reconocible (ej. detalle de drill): lo dejamos
        // como referencia sin metricas, para no perder el bloque por completo.
      }
    });
    return resultado;
  }

  if (tipoSesion === "descanso" && TITULO_DESCANSO[tituloLower]) {
    const id = TITULO_DESCANSO[tituloLower];
    resultado.push({ id, texto_original: campos.join(" ") });
    return resultado;
  }

  // fuerza (o fallback general): matching por nombre de ejercicio en el texto
  campos.forEach(texto => {
    texto.split("+").forEach(rawFrag => {
      const frag = rawFrag.trim();
      if (!frag) return;
      const id = matchExerciseId(frag.toLowerCase());
      if (!id) return; // fragmento no reconocido (texto libre: notas, protocolos, etc.)
      const info = EJERCICIOS[id];
      const nums = parseNumeros(frag);

      const item = { id, texto_original: frag };
      if (info.tipo_carga === "distancia") {
        const dist = frag.match(/(\d+)\s*x\s*(\d+)/i);
        if (dist) { item.series = parseInt(dist[1], 10); item.distancia_m = parseInt(dist[2], 10); }
        else {
          const solo = frag.match(/(\d+)\s*m\b/i);
          if (solo) item.distancia_m = parseInt(solo[1], 10);
        }
      } else if (info.tipo_carga === "tiempo") {
        if (nums.tiempo_seg != null) item.tiempo_seg = nums.tiempo_seg;
        if (nums.series != null) item.series = nums.series;
      } else {
        // reps o peso_reps
        if (nums.series != null) item.series = nums.series;
        if (nums.reps != null) item.reps = nums.reps;
      }
      if (nums.lado || info.por_lado) item.lado = true;
      resultado.push(item);
    });
  });

  return resultado;
}

// Devuelve todos los ejercicios estructurados de una sesion completa (todos sus bloques),
// aplanados, para alimentar el motor de progresion / registro.
function parseSesionEjercicios(sesion) {
  const out = [];
  (sesion.bloques || []).forEach(b => {
    parseBloque(b, sesion.tipo).forEach(item => out.push(Object.assign({ bloque: b.t }, item)));
  });
  return out;
}
