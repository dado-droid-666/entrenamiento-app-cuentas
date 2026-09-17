"""
Entrena el Modelo 1 (Random Forest) que predice el TIER (1=principiante,
2=intermedio, 3=avanzado) de un usuario a partir de: edad, peso, altura,
nivel de experiencia autopercibido y CSS pace (ritmo objetivo derivado del
test de 400m+200m).

FUENTE DE DATOS (transparencia total, ver PROGRESO.md):
- Dataset REAL: "Olympic Swimming Results 1912-2020" (mismo dataset publicado
  en Kaggle por datasciencedonut, descargado via su mirror en GitHub porque
  no tenemos credenciales de Kaggle configuradas). Este dataset SOLO tiene
  resultados de elite (Juegos Olimpicos): distancia, estilo, tiempo, sexo,
  ano — NO tiene edad/peso/altura de nadadores recreativos, que es lo que
  necesitamos como input real del usuario de la app.
- Por eso se usa como "ancla de elite": calculamos el ritmo real de nadadores
  olimpicos de libre (100/200/400m) para anclar el extremo superior de la
  escala de nivel.
- El resto del dataset de entrenamiento (edad/peso/altura/nivel -> tier de
  NADADORES RECREATIVOS) se genera de forma SINTETICA pero fundamentada en
  bandas de ritmo de coaching estandar (CSS pace tipico por nivel), porque no
  existe un dataset publico de nadadores recreativos con estas etiquetas.
  Esto se documenta explicitamente para no aparentar que todo el dataset es
  real cuando la parte de "usuario recreativo" es sintetica y calibrada.

Uso:
    python ml/train_modelo1.py
Genera:
    ml/modelo1_arbol.json  (bosque de arboles pequenos, listo para el
                            interprete JS en modelo1.js)
"""
import json
import re
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

RNG = np.random.default_rng(42)

# ----------------------------------------------------------------------------
# 1) Ancla de elite: pace real (seg/100m) de nadadores olimpicos de libre
# ----------------------------------------------------------------------------
def parse_resultado(s):
    """Convierte '51.98', '4:03.84' o '1:04:03.84' a segundos (float)."""
    s = str(s).strip()
    if s in ("", "nan", "DNS", "DNF", "DSQ"):
        return None
    partes = s.split(":")
    try:
        if len(partes) == 3:
            h, m, sec = partes
            return float(h) * 3600 + float(m) * 60 + float(sec)
        if len(partes) == 2:
            m, sec = partes
            return float(m) * 60 + float(sec)
        return float(partes[0])
    except ValueError:
        return None

df = pd.read_csv("ml/olympic_swimming_raw.csv")
df.columns = [c.strip() for c in df.columns]
df["dist_m"] = df["Distance (in meters)"].astype(str).str.extract(r"(\d+)").astype(float)
df["seg"] = df["Results"].apply(parse_resultado)
libre = df[(df["Stroke"].str.lower() == "freestyle") & (df["Relay?"] == 0) & df["seg"].notna()]
libre = libre[libre["dist_m"].isin([100, 200, 400])]
libre["pace_100"] = libre["seg"] / (libre["dist_m"] / 100)

pace_elite_hombres = libre[libre["Gender"] == "Men"]["pace_100"].mean()
pace_elite_mujeres = libre[libre["Gender"] == "Women"]["pace_100"].mean()
print(f"[Ancla real Olympic data] pace elite libre ~100m: "
      f"hombres={pace_elite_hombres:.1f}s/100m, mujeres={pace_elite_mujeres:.1f}s/100m "
      f"(n={len(libre)} resultados)")

# Nadador recreativo "avanzado" tipico nada ~1.4-1.6x el ritmo elite olimpico
PACE_ELITE_PROMEDIO = (pace_elite_hombres + pace_elite_mujeres) / 2
FACTOR_RECREATIVO_AVANZADO = 1.5

# ----------------------------------------------------------------------------
# 2) Dataset sintetico de perfiles recreativos, calibrado con el ancla real
#    Bandas de CSS pace por nivel (seg/100m), ajustadas con el ancla:
# ----------------------------------------------------------------------------
pace_avanzado_centro = PACE_ELITE_PROMEDIO * FACTOR_RECREATIVO_AVANZADO   # ~ elite*1.5
BANDAS_CSS = {
    "avanzado":     (pace_avanzado_centro - 8, pace_avanzado_centro + 10),
    "intermedio":   (pace_avanzado_centro + 10, pace_avanzado_centro + 35),
    "principiante": (pace_avanzado_centro + 35, pace_avanzado_centro + 70),
}
print(f"[Bandas CSS derivadas] avanzado={BANDAS_CSS['avanzado']}, "
      f"intermedio={BANDAS_CSS['intermedio']}, principiante={BANDAS_CSS['principiante']}")

N = 4000
NIVEL_NUM = {"principiante": 1, "intermedio": 2, "avanzado": 3}
filas = []
for _ in range(N):
    tier_real = RNG.choice([1, 2, 3], p=[0.35, 0.4, 0.25])
    nivel_label = {1: "principiante", 2: "intermedio", 3: "avanzado"}[tier_real]
    lo, hi = BANDAS_CSS[nivel_label]
    css_pace = RNG.uniform(lo, hi)

    edad = int(np.clip(RNG.normal(32, 10), 14, 70))
    # a partir de ~45 anios el ritmo tipico se degrada un poco para el mismo tier percibido
    if edad > 45:
        css_pace += (edad - 45) * 0.25

    altura_cm = np.clip(RNG.normal(170, 9), 145, 200)
    peso_kg = np.clip(RNG.normal(0.9 * (altura_cm - 100), 8), 40, 120)
    tiempo_50_seg = css_pace * 0.5 * RNG.uniform(0.9, 0.98)  # 50m suele nadarse mas rapido que el ritmo sostenido

    # nivel autopercibido: usualmente coincide con el tier real, con algo de ruido humano
    nivel_autopercibido_num = int(np.clip(round(tier_real + RNG.normal(0, 0.6)), 1, 3))

    filas.append({
        "edad": edad,
        "peso_kg": round(peso_kg, 1),
        "altura_cm": round(altura_cm, 1),
        "css_pace": round(css_pace, 1),
        "tiempo_50_seg": round(tiempo_50_seg, 1),
        "nivel_experiencia_num": nivel_autopercibido_num,
        "tier": tier_real,
    })

data = pd.DataFrame(filas)
FEATURES = ["edad", "peso_kg", "altura_cm", "css_pace", "tiempo_50_seg", "nivel_experiencia_num"]
X = data[FEATURES]
y = data["tier"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

# Bosque pequeno (15 arboles poco profundos) para que el JSON exportado sea
# liviano y facil de interpretar en JS sin dependencias pesadas.
modelo = RandomForestClassifier(n_estimators=15, max_depth=6, random_state=42, min_samples_leaf=15)
modelo.fit(X_train, y_train)

pred = modelo.predict(X_test)
print("\n[Evaluacion en test set sintetico]")
print("Accuracy:", round(accuracy_score(y_test, pred), 4))
print(classification_report(y_test, pred))
print("Importancia de features:", dict(zip(FEATURES, np.round(modelo.feature_importances_, 3))))

# ----------------------------------------------------------------------------
# 3) Exportar el bosque a JSON (arbol por arbol) para el interprete JS
# ----------------------------------------------------------------------------
def exportar_arbol(tree, feature_names):
    t = tree.tree_

    def nodo(i):
        if t.children_left[i] == t.children_right[i] == -1:
            valores = t.value[i][0]
            tier_hoja = int(modelo.classes_[np.argmax(valores)])
            return {"tier": tier_hoja}
        return {
            "feature": feature_names[t.feature[i]],
            "threshold": round(float(t.threshold[i]), 4),
            "left": nodo(t.children_left[i]),
            "right": nodo(t.children_right[i]),
        }
    return nodo(0)

arboles = [exportar_arbol(est, FEATURES) for est in modelo.estimators_]

salida = {
    "version": "rf_v1_2026-09-16",
    "features": FEATURES,
    "n_estimators": len(arboles),
    "accuracy_test_sintetico": round(float(accuracy_score(y_test, pred)), 4),
    "fuente_datos": (
        "Ancla de elite: Olympic Swimming Results 1912-2020 (datasciencedonut, "
        "mismo dataset publicado en Kaggle). Bandas de nivel recreativo: "
        "sinteticas, calibradas con el ancla real. Ver train_modelo1.py."
    ),
    "trees": arboles,
}

with open("ml/modelo1_arbol.json", "w", encoding="utf-8") as f:
    json.dump(salida, f, ensure_ascii=False, indent=1)

print(f"\nGuardado ml/modelo1_arbol.json ({len(arboles)} arboles)")
