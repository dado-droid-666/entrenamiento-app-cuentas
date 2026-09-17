// ============================================================================
// Motor de progresion — MODO CONSERVADOR (fase 1, sin ML todavia).
// Decide, para una sesion de la plantilla, si el usuario deberia "avanzar"
// (usar los parametros ya escritos en la semana siguiente de la plantilla,
// comportamiento actual) o "repetir/bajar" segun su adherencia reciente.
//
// No depende de peso/reps/esfuerzo reales (eso vive en sesion_registro y se
// usara en una fase 2 cuando haya suficiente historial). Por ahora usa
// unicamente lo que ya existe hoy en la app: el booleano de sesion
// completada/no completada (progreso / plan15nov_progress_v1).
// ============================================================================

const ESCALA_ESFUERZO = [
  { valor: 1, emoji: "😌", label: "Muy facil" },
  { valor: 2, emoji: "🙂", label: "Facil" },
  { valor: 3, emoji: "😐", label: "Normal" },
  { valor: 4, emoji: "😓", label: "Dificil" },
  { valor: 5, emoji: "🥵", label: "Muy dificil" },
];

// historialTipo: array de booleanos (true=completada), mas reciente al final,
// para sesiones del MISMO tipo (ej. todas las "Fuerza A" o todas las "alberca").
// Umbral: si las ultimas 2 sesiones del mismo tipo se saltaron -> no avanzar
// (senal de sobrecarga/perdida de adherencia); si no, avanzar normal.
function decidirProgresion(historialTipo) {
  if (!historialTipo || historialTipo.length === 0) {
    return { accion: "avanzar", motivo: "sin historial previo" };
  }
  const ultimas2 = historialTipo.slice(-2);
  const ambasSalteadas = ultimas2.length === 2 && ultimas2.every(h => h === false);
  if (ambasSalteadas) {
    return { accion: "repetir", motivo: "ultimas 2 sesiones de este tipo no completadas" };
  }
  const ultima = historialTipo[historialTipo.length - 1];
  if (ultima === false) {
    return { accion: "mantener", motivo: "sesion anterior no completada, no se sube exigencia" };
  }
  return { accion: "avanzar", motivo: "adherencia reciente OK" };
}

// Construye el historial de completado/no-completado para un "tipo de dia"
// (ej. mismo `sesion` label, como "Fuerza A") a partir del objeto de progreso
// ({ "{sem}-{dia}": {at} }) y las sesiones ya generadas del plan.
function historialPorTipoSesion(sessions, progreso, sesionLabel, hastaSemana) {
  return sessions
    .filter(s => s.sesion === sesionLabel && s.sem < hastaSemana)
    .sort((a, b) => a.sem - b.sem)
    .map(s => !!progreso[`${s.sem}-${s.dia}`]);
}

// Punto de integracion sugerido (no invocado automaticamente todavia): al
// generar/mostrar la semana siguiente, se puede consultar esto para decidir
// si mostrar un aviso de "repite esta semana" en vez de subir la plantilla.
function evaluarSemana(sessions, progreso, semanaObjetivo) {
  const sesionesSemana = sessions.filter(s => s.sem === semanaObjetivo);
  return sesionesSemana.map(s => {
    const historial = historialPorTipoSesion(sessions, progreso, s.sesion, semanaObjetivo);
    return Object.assign({ sesion: s.sesion, dia: s.dia }, decidirProgresion(historial));
  });
}
