// ============================================================================
// Modelo 1: prediccion de TIER (1=principiante, 2=intermedio, 3=avanzado) a
// partir del perfil del usuario (edad, peso, altura, nivel autopercibido,
// CSS pace, tiempo 50m opcional).
//
// El arbol de decision real (entrenado con Random Forest sobre datos
// historicos de nadadores, ver /ml/train_modelo1.py) se exporta a JSON y se
// carga en MODELO1_ARBOL (ver modelo1_arbol.json). Si ese archivo no esta
// disponible (offline, o antes de entrenar), se usa un fallback heuristico
// basado en el CSS pace y el nivel autopercibido, para que la app nunca se
// quede sin poder generar un plan.
// ============================================================================

let MODELO1_ARBOL = null; // se llena via cargarModelo1() si existe modelo1_arbol.json
const MODELO1_VERSION_FALLBACK = "heuristico_v1";

async function cargarModelo1() {
  try {
    const res = await fetch("ml/modelo1_arbol.json", { cache: "no-store" });
    if (!res.ok) return null;
    MODELO1_ARBOL = await res.json();
    return MODELO1_ARBOL;
  } catch {
    return null;
  }
}

// Calcula el CSS pace (seg/100m) a partir de los tiempos de 400m y 200m.
function calcularCSSPace(tiempo400Seg, tiempo200Seg) {
  if (!tiempo400Seg || !tiempo200Seg || tiempo400Seg <= tiempo200Seg) return null;
  return ((tiempo400Seg - tiempo200Seg) / (400 - 200)) * 100;
}

// Recorre TODOS los arboles del bosque (Random Forest) y devuelve el tier
// ganador por voto mayoritario, tal como hace sklearn en RandomForest.predict().
// (implementacion compartida en arboles.js)
function predecirConBosque(trees, features) {
  return predecirBosque(trees, features, { agregacion: "voto", hojaKey: "tier" });
}

// Fallback heuristico: combina CSS pace (ritmo objetivo, mas rapido = mejor
// nivel) con el nivel autopercibido, usando umbrales generales de ritmo de
// alberca para adultos recreativos/competitivos.
function predecirTierHeuristico(perfil) {
  const { cssPace, nivelExperiencia } = perfil;
  let tierPorRitmo = 2;
  if (cssPace != null) {
    if (cssPace <= 85) tierPorRitmo = 3;       // ritmo rapido (<=1:25/100m)
    else if (cssPace <= 110) tierPorRitmo = 2; // ritmo intermedio
    else tierPorRitmo = 1;                     // ritmo mas lento
  }
  const tierPorNivel = { principiante: 1, intermedio: 2, avanzado: 3 }[nivelExperiencia] || 2;
  // promedio redondeado entre lo objetivo (ritmo) y lo autopercibido
  const tier = Math.round((tierPorRitmo + tierPorNivel) / 2);
  return Math.min(3, Math.max(1, tier));
}

// perfil: { edad, pesoKg, alturaCm, nivelExperiencia, cssPace, tiempo50Seg }
// Devuelve { tier, modeloVersion }
function predecirTier(perfil) {
  if (MODELO1_ARBOL && MODELO1_ARBOL.trees && MODELO1_ARBOL.trees.length) {
    const features = {
      edad: perfil.edad,
      peso_kg: perfil.pesoKg,
      altura_cm: perfil.alturaCm,
      css_pace: perfil.cssPace,
      tiempo_50_seg: perfil.tiempo50Seg,
      nivel_experiencia_num: { principiante: 1, intermedio: 2, avanzado: 3 }[perfil.nivelExperiencia] || 2,
    };
    const tier = predecirConBosque(MODELO1_ARBOL.trees, features);
    if (tier) return { tier, modeloVersion: MODELO1_ARBOL.version || "rf_v1" };
  }
  return { tier: predecirTierHeuristico(perfil), modeloVersion: MODELO1_VERSION_FALLBACK };
}

// Factor de escala por tier para calibrar la plantilla existente:
// - ritmo alberca: multiplicador sobre el ritmo objetivo (relativo al CSS del usuario)
// - fuerza: multiplicador de reps/series sugerido sobre la plantilla base
const TIER_ESCALA = {
  1: { fuerza_factor: 0.85, alberca_volumen_factor: 0.9 },
  2: { fuerza_factor: 1.0, alberca_volumen_factor: 1.0 },
  3: { fuerza_factor: 1.15, alberca_volumen_factor: 1.1 },
};
