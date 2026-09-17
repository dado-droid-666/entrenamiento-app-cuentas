// ============================================================================
// Interprete generico de arboles de decision/regresion exportados desde
// sklearn (formato: {feature, threshold, left, right} | {hoja: valor}).
// Usado por modelo1.js (clasificacion de tier, voto mayoritario) y
// modelo2.js (regresion de ajuste de carga, promedio del bosque).
// ============================================================================

function recorrerArbolGenerico(nodo, features, hojaKey) {
  if (nodo == null) return null;
  if (typeof nodo[hojaKey] !== "undefined") return nodo[hojaKey];
  const valor = features[nodo.feature];
  if (valor == null) return recorrerArbolGenerico(nodo.left, features, hojaKey); // sin dato: rama por defecto
  return valor <= nodo.threshold
    ? recorrerArbolGenerico(nodo.left, features, hojaKey)
    : recorrerArbolGenerico(nodo.right, features, hojaKey);
}

// agregacion: "voto" (clasificacion, devuelve la clase mas votada) o
// "promedio" (regresion, devuelve el promedio numerico del bosque).
function predecirBosque(trees, features, { agregacion, hojaKey }) {
  const valores = trees
    .map(arbol => recorrerArbolGenerico(arbol, features, hojaKey))
    .filter(v => v != null);
  if (!valores.length) return null;

  if (agregacion === "promedio") {
    return valores.reduce((a, b) => a + b, 0) / valores.length;
  }
  // voto mayoritario
  const conteo = {};
  valores.forEach(v => { conteo[v] = (conteo[v] || 0) + 1; });
  let mejor = null, mejorConteo = -1;
  Object.keys(conteo).forEach(k => {
    if (conteo[k] > mejorConteo) { mejorConteo = conteo[k]; mejor = isNaN(k) ? k : parseFloat(k); }
  });
  return mejor;
}
