// ============================================================================
// Modelo 2: ajuste continuo de carga/reps, entrenado sobre TODOS los usuarios
// (pooled) a partir de sesion_registro (ver ml/train_modelo2.py). Reentrena
// mensualmente offline; aqui solo se carga el bosque exportado y se usa para
// sugerir un FACTOR DE AJUSTE sobre la carga/reps planificada.
//
// Convive con progresion.js (reglas conservadoras basadas en adherencia):
// - Si el modelo esta cargado y hay suficiente historial -> se usa su sugerencia.
// - Si no (offline, o usuario nuevo sin historial) -> se usa el motor
//   conservador de progresion.js como respaldo. Nunca se bloquea el flujo
//   por falta de modelo.
// ============================================================================

let MODELO2_BOSQUE = null;
const MODELO2_VERSION_FALLBACK = "reglas_conservadoras_v1";

async function cargarModelo2() {
  try {
    const res = await fetch("ml/modelo2_bosque.json", { cache: "no-store" });
    if (!res.ok) return null;
    MODELO2_BOSQUE = await res.json();
    return MODELO2_BOSQUE;
  } catch {
    return null;
  }
}

// features: { tier, esfuerzo_promedio_3, tendencia_esfuerzo, adherencia_reciente, semana_plan }
// Devuelve un factor multiplicativo sugerido para la proxima carga/reps
// (1.0 = mantener, >1 = subir, <1 = bajar), junto con la version del modelo usado.
function sugerirFactorAjuste(features) {
  if (MODELO2_BOSQUE && MODELO2_BOSQUE.trees && MODELO2_BOSQUE.trees.length) {
    const factor = predecirBosque(MODELO2_BOSQUE.trees, features, { agregacion: "promedio", hojaKey: "valor" });
    if (factor != null) {
      // clamp de seguridad: nunca ajustar mas de +/-25% de una vez
      const clamped = Math.min(1.25, Math.max(0.75, factor));
      return { factor: clamped, modeloVersion: MODELO2_BOSQUE.version || "modelo2_v1" };
    }
  }
  return { factor: null, modeloVersion: MODELO2_VERSION_FALLBACK };
}

// Combina la sugerencia del Modelo 2 (si existe) con el motor conservador de
// progresion.js. historialTipo: mismo array booleano que usa decidirProgresion.
function sugerenciaCombinada(features, historialTipo) {
  const { factor, modeloVersion } = sugerirFactorAjuste(features);
  if (factor != null) {
    return { factor, fuente: modeloVersion };
  }
  const decision = decidirProgresion(historialTipo);
  const factorReglas = decision.accion === "avanzar" ? 1.05 : decision.accion === "repetir" ? 0.85 : 1.0;
  return { factor: factorReglas, fuente: MODELO2_VERSION_FALLBACK, motivo: decision.motivo };
}
