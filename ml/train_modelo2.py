"""
Entrena el Modelo 2 (Random Forest Regression, "pooled" sobre todos los
usuarios) que sugiere un FACTOR DE AJUSTE para la carga/reps de la proxima
sesion, a partir del historial reciente de esfuerzo/adherencia del usuario.

FUENTE DE DATOS (transparencia total, ver PROGRESO.md):
- La fuente REAL es la tabla `sesion_registro` de Supabase (peso/reps/tiempo/
  esfuerzo capturados en cada sesion) + `progreso` (adherencia) + `usuario_tier`
  (Modelo 1). HOY (16 sep 2026) la app recien se publico y practicamente no
  hay historial real acumulado todavia -> no existe aun un export real para
  entrenar con datos reales.
- Por eso este script funciona en DOS MODOS:
    1) Si existe ml/sesion_registro_export.csv (exportado a mano o via un
       script futuro que lea de Supabase con la service_role key), entrena
       con datos REALES.
    2) Si no existe, genera un dataset SINTETICO de bootstrap (fundamentado
       en el principio de progresion conservadora ya usado en progresion.js:
       esfuerzo alto sostenido -> bajar; esfuerzo bajo + buena adherencia ->
       subir) para que el pipeline funcione end-to-end desde el dia 1, y se
       reemplace automaticamente por datos reales cuando existan (sin cambiar
       una sola linea de este script: solo hay que poner el CSV real en su
       lugar y volver a correr).

Como generar el CSV real cuando haya historial (documentado para el futuro):
    Exportar sesion_registro + progreso + usuario_tier unidos por user_id,
    con las columnas: tier, esfuerzo_promedio_3, tendencia_esfuerzo,
    adherencia_reciente, semana_plan, factor_ajuste_real (este ultimo
    requiere definir una metrica objetivo real, ej. variacion de peso/reps
    efectivamente sostenida por el usuario en las siguientes 2 semanas).

Uso:
    python ml/train_modelo2.py
Genera:
    ml/modelo2_bosque.json
"""
import json
import numpy as np
import pandas as pd
from datetime import date, datetime, timezone
from pathlib import Path
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

RNG = np.random.default_rng(7)
CSV_REAL = Path("ml/sesion_registro_export.csv")
FEATURES = ["tier", "esfuerzo_promedio_3", "tendencia_esfuerzo", "adherencia_reciente", "semana_plan"]

# ----------------------------------------------------------------------------
# 1) Dataset: real si existe el export, sintetico de bootstrap si no.
# ----------------------------------------------------------------------------
if CSV_REAL.exists():
    data = pd.read_csv(CSV_REAL)
    fuente = "real (ml/sesion_registro_export.csv)"
else:
    N = 3000
    filas = []
    for _ in range(N):
        tier = RNG.choice([1, 2, 3])
        esfuerzo_promedio_3 = RNG.uniform(1, 5)          # 1=muy facil .. 5=muy dificil
        tendencia_esfuerzo = RNG.uniform(-1.5, 1.5)      # positivo = subiendo dificultad percibida
        adherencia_reciente = RNG.uniform(0, 1)          # fraccion de sesiones completadas
        semana_plan = RNG.integers(1, 10)

        # Regla fundamentada (double progression / deload) usada para generar
        # la etiqueta sintetica: esfuerzo alto sostenido y en aumento -> bajar;
        # esfuerzo bajo + buena adherencia -> subir; resto -> mantener.
        factor = 1.0
        if esfuerzo_promedio_3 >= 4 and tendencia_esfuerzo > 0:
            factor = 0.85
        elif esfuerzo_promedio_3 <= 2.5 and adherencia_reciente >= 0.8:
            factor = 1.12
        elif adherencia_reciente < 0.5:
            factor = 0.95  # baja adherencia: no aumentar exigencia
        factor += RNG.normal(0, 0.03)  # ruido realista
        factor = float(np.clip(factor, 0.7, 1.3))

        filas.append({
            "tier": tier,
            "esfuerzo_promedio_3": round(esfuerzo_promedio_3, 2),
            "tendencia_esfuerzo": round(tendencia_esfuerzo, 2),
            "adherencia_reciente": round(adherencia_reciente, 2),
            "semana_plan": semana_plan,
            "factor_ajuste": round(factor, 3),
        })
    data = pd.DataFrame(filas)
    fuente = "sintetico de bootstrap (sin historial real todavia, ver docstring)"

print(f"[Fuente de datos] {fuente} — {len(data)} filas")

X = data[FEATURES]
y = data["factor_ajuste"]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=7)

modelo = RandomForestRegressor(n_estimators=15, max_depth=5, random_state=7, min_samples_leaf=20)
modelo.fit(X_train, y_train)

pred = modelo.predict(X_test)
print("[Evaluacion]")
print("MAE:", round(mean_absolute_error(y_test, pred), 4))
print("R2:", round(r2_score(y_test, pred), 4))
print("Importancia de features:", dict(zip(FEATURES, np.round(modelo.feature_importances_, 3))))

# ----------------------------------------------------------------------------
# 2) Exportar el bosque a JSON (mismo formato generico que Modelo 1, pero con
#    hoja "valor" en vez de "tier", para regresion por promedio)
# ----------------------------------------------------------------------------
def exportar_arbol(tree, feature_names):
    t = tree.tree_

    def nodo(i):
        if t.children_left[i] == t.children_right[i] == -1:
            return {"valor": round(float(t.value[i][0][0]), 4)}
        return {
            "feature": feature_names[t.feature[i]],
            "threshold": round(float(t.threshold[i]), 4),
            "left": nodo(t.children_left[i]),
            "right": nodo(t.children_right[i]),
        }
    return nodo(0)

arboles = [exportar_arbol(est, FEATURES) for est in modelo.estimators_]

salida = {
    "version": f"modelo2_v1_{date.today().isoformat()}",
    "trained_at": datetime.now(timezone.utc).isoformat(),
    "features": FEATURES,
    "n_estimators": len(arboles),
    "mae_test": round(float(mean_absolute_error(y_test, pred)), 4),
    "fuente_datos": fuente,
    "trees": arboles,
}

with open("ml/modelo2_bosque.json", "w", encoding="utf-8") as f:
    json.dump(salida, f, ensure_ascii=False, indent=1)

print(f"\nGuardado ml/modelo2_bosque.json ({len(arboles)} arboles)")
