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
from datetime import date, datetime, timezone
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

# Refresco opcional del ancla con resultados 2016-2024 (descargar a
# ml/olympic_2016_2024.csv con columnas: evento, sexo, dist_m, seg).
# Si el archivo no existe o no tiene el esquema esperado, se ignora.
try:
    import os as _os
    _upd = None
    if _os.path.exists("ml/olympic_2016_2024.csv"):
        _upd = pd.read_csv("ml/olympic_2016_2024.csv")
        _upd.columns = [c.strip().lower() for c in _upd.columns]
        if {"dist_m", "seg"}.issubset(_upd.columns):
            _upd = _upd[_upd["dist_m"].isin([100, 200, 400]) & _upd["seg"].notna()]
            _upd["pace_100"] = _upd["seg"] / (_upd["dist_m"] / 100)
            print(f"[Ancla 2016-2024] n={len(_upd)} (solo informativo; el ancla principal sigue siendo 1912-2020)")
except Exception as e:
    print(f"[Ancla 2016-2024] omitida ({e})")
libre["pace_100"] = libre["seg"] / (libre["dist_m"] / 100)

pace_elite_hombres = libre[libre["Gender"] == "Men"]["pace_100"].mean()
pace_elite_mujeres = libre[libre["Gender"] == "Women"]["pace_100"].mean()
print(f"[Ancla real Olympic data] pace elite libre ~100m: "
      f"hombres={pace_elite_hombres:.1f}s/100m, mujeres={pace_elite_mujeres:.1f}s/100m "
      f"(n={len(libre)} resultados)")

# ----------------------------------------------------------------------------
# 1b) Ancla PLOS 2025 (Mehrabi et al., top-20 histórico por prueba/edad/sexo,
#     CC-BY). Archivo: ml/publicos/plos_top20.xlsx (S2 Table, hoja ALL).
#     Se usa para validar y promediar el ancla elite con datos de temporada
#     por edad (no solo Juegos). Si falta, se sigue solo con Olympic CSV.
# ----------------------------------------------------------------------------
def parse_plos_top20(path):
    """Devuelve DataFrame [sex, age, event, time_s] de la S2 Table."""
    import openpyxl
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb["ALL"]
    rows = list(ws.iter_rows(values_only=True))
    out = []
    sex, events = None, []
    for r in rows:
        c0 = str(r[0]).strip() if r[0] is not None else ""
        if c0 in ("Men", "Women"):
            sex = c0
            events = []
            continue
        # Athlete header: number in col 0 + event names from col 4
        # (e.g. (1, 1.95, '88kg', None, '50m F', '100m F', ...))
        if isinstance(r[0], (int, float)) and isinstance(r[4], str) and "m" in r[4]:
            events = [str(c).strip() if c is not None else "" for c in r[4:]]
            continue
        # Data row: age in col 3, times under event columns
        if isinstance(r[3], (int, float)) and events:
            try:
                age = int(r[3])
            except (TypeError, ValueError):
                continue
            for ev, val in zip(events, r[4:]):
                if val is None or val == "":
                    continue
                try:
                    t = float(val)
                except (TypeError, ValueError):
                    continue
                if t > 0:
                    out.append({"sex": sex, "age": age, "event": ev, "time_s": t})
    return pd.DataFrame(out)


pace_elite_plos = None
try:
    import os as _os2
    if _os2.path.exists("ml/publicos/plos_top20.xlsx"):
        _plos = parse_plos_top20("ml/publicos/plos_top20.xlsx")
        _free = _plos[_plos["event"].str.match(r"^\d+\s*m\s*F\s*$")]
        _free["dist_m"] = _free["event"].str.extract(r"(\d+)").astype(float)
        _free = _free[_free["dist_m"].isin([100.0, 200.0])]
        _free["pace_100"] = _free["time_s"] / (_free["dist_m"] / 100)
        pace_elite_plos = _free["pace_100"].mean()
        print(f"[Ancla real PLOS 2025] pace elite libre 100/200m: {pace_elite_plos:.1f}s/100m "
              f"(n={len(_free)} marcas de temporada por edad)")
except Exception as e:
    print(f"[Ancla PLOS] omitida ({e})")

# ----------------------------------------------------------------------------
# 1c) Priors juveniles reales (youngSwimmers R package, Castillo et al. 2022).
#     Archivo: ml/publicos/youngSwimmers.rda (34 nadadores 12-16 años).
#     Sin tiempos por prueba: solo calibra talla/peso por edad en el
#     muestreo sintético <18 años. Requiere pyreadr; si falta, se omite.
# ----------------------------------------------------------------------------
youth_pool = []
try:
    import pyreadr
    _r = pyreadr.read_r("ml/publicos/youngSwimmers.rda")
    _ys = _r["swimmers"]
    _ys = _ys.dropna(subset=["age", "weight", "height"])
    for _, row in _ys.iterrows():
        youth_pool.append((int(row["age"]), float(row["height"]), float(row["weight"])))
    print(f"[Priors juveniles] {len(youth_pool)} mediciones edad/talla/peso (12-16 años)")
except Exception as e:
    print(f"[Priors juveniles] omitidos ({e})")

# Nadador recreativo "avanzado" tipico nada ~1.4-1.6x el ritmo elite olimpico
_base_elite = [pace_elite_hombres, pace_elite_mujeres]
if pace_elite_plos is not None:
    _base_elite.append(pace_elite_plos)
PACE_ELITE_PROMEDIO = float(np.mean(_base_elite))
print(f"[Ancla combinada] PACE_ELITE_PROMEDIO={PACE_ELITE_PROMEDIO:.1f}s/100m")
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

    if edad < 18 and youth_pool:
        # Talla/peso reales de nadadores juveniles (misma edad aprox + ruido)
        cand = [y for y in youth_pool if abs(y[0] - edad) <= 1] or youth_pool
        ya, yh, yw = cand[int(RNG.integers(len(cand)))]
        altura_cm = np.clip(yh + RNG.normal(0, 1.5), 140, 200)
        peso_kg = np.clip(yw + RNG.normal(0, 1.5), 35, 120)
    else:
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

# ----------------------------------------------------------------------------
# 2b) Datos REALES propios (anonimizados, con consentimiento).
#     Generar con: python ml/export_anonimo.py --perfiles perfiles.csv
#       --pruebas pruebas.csv --tiers tiers.csv --out ml/datos_reales_modelo1.csv
#     Las filas reales pesan 4x (PESO_REAL) frente a las sintéticas.
# ----------------------------------------------------------------------------
import os
PESO_REAL = 4
data["peso_muestra"] = 1.0
data["es_real"] = False
data["fuente"] = "sintetico"
data["banda_edad"] = ""
data["codigo"] = ""
N_REAL = 0
if os.path.exists("ml/datos_reales_modelo1.csv"):
    real = pd.read_csv("ml/datos_reales_modelo1.csv")
    real.columns = [c.strip() for c in real.columns]

    def _mid_banda(b):
        m = re.match(r"(\d+)-(\d+)", str(b))
        return (int(m.group(1)) + int(m.group(2))) / 2 if m else np.nan

    real["edad"] = real["banda_edad"].apply(_mid_banda)
    real = real.dropna(subset=["edad", "css_pace", "tier"])
    real["edad"] = real["edad"].astype(int)
    for col in ["peso_kg", "altura_cm", "tiempo_50_seg", "nivel_experiencia_num"]:
        real[col] = pd.to_numeric(real[col], errors="coerce")
    real = real.dropna(subset=["peso_kg", "altura_cm"])
    real["tiempo_50_seg"] = real["tiempo_50_seg"].fillna(real["css_pace"] * 0.47)
    real["nivel_experiencia_num"] = real["nivel_experiencia_num"].fillna(2).astype(int).clip(1, 3)
    real["tier"] = real["tier"].astype(int).clip(1, 3)
    real["peso_muestra"] = float(PESO_REAL)
    real["es_real"] = True
    N_REAL = len(real)
    data = pd.concat([data, real[FEATURES + ["tier", "peso_muestra", "es_real", "fuente", "banda_edad", "codigo"]]],
                     ignore_index=True)
    print(f"[Datos reales] {N_REAL} filas propias con consentimiento (peso x{PESO_REAL})")
else:
    print("[Datos reales] ml/datos_reales_modelo1.csv no existe: solo sintético (+ ancla elite real)")

X = data[FEATURES]
y = data["tier"]
w = data["peso_muestra"].to_numpy()

from sklearn.model_selection import GroupShuffleSplit
if N_REAL > 0 and data["codigo"].notna().any():
    # Cada fila sintética es su propio grupo; las reales se agrupan por
    # código de usuario para evitar fuga (mismo usuario en train y test).
    grupos = [c if isinstance(c, str) and c else f"sint_{i}"
              for i, c in enumerate(data["codigo"].to_numpy())]
    gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    idx_tr, idx_te = next(gss.split(X, y, grupos))
    X_train, X_test = X.iloc[idx_tr], X.iloc[idx_te]
    y_train, y_test = y.iloc[idx_tr], y.iloc[idx_te]
    w_train = w[idx_tr]
    es_test = data["es_real"].iloc[idx_te].to_numpy()
    banda_test = data["banda_edad"].iloc[idx_te].to_numpy()
else:
    X_train, X_test, y_train, y_test, w_train, _, es_test, _ = train_test_split(
        X, y, w, np.zeros(len(X), dtype=bool), test_size=0.2, random_state=42, stratify=y)
    banda_test = np.array([""] * len(X_test))

# Bosque pequeno (15 arboles poco profundos) para que el JSON exportado sea
# liviano y facil de interpretar en JS sin dependencias pesadas.
modelo = RandomForestClassifier(n_estimators=15, max_depth=6, random_state=42, min_samples_leaf=15)
modelo.fit(X_train, y_train, sample_weight=w_train)

pred = modelo.predict(X_test)
print("\n[Evaluacion en test]")
print("Accuracy:", round(accuracy_score(y_test, pred), 4))
print(classification_report(y_test, pred))
print("Importancia de features:", dict(zip(FEATURES, np.round(modelo.feature_importances_, 3))))
if N_REAL > 0 and es_test.any():
    print(f"[Evaluacion solo REAL] n={int(es_test.sum())} "
          f"accuracy={accuracy_score(y_test[es_test], pred[es_test]):.4f}")
    bandas = sorted(set(banda_test[es_test]) - {""})
    for b in bandas:
        m = es_test & (banda_test == b)
        if m.sum() >= 3:
            print(f"  banda {b}: n={int(m.sum())} "
                  f"acc={accuracy_score(y_test[m], pred[m]):.3f}")
print(f"[Mezcla] sintético={len(data) - N_REAL} real={N_REAL}")

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
    "version": f"rf_v1_{date.today().isoformat()}",
    "trained_at": datetime.now(timezone.utc).isoformat(),
    "features": FEATURES,
    "n_estimators": len(arboles),
    "accuracy_test_sintetico": round(float(accuracy_score(y_test, pred)), 4),
    "n_filas_reales": int(N_REAL),
    "n_filas_sinteticas": int(len(data) - N_REAL),
    "peso_real": PESO_REAL,
    "fuente_datos": (
        "Anclas de elite: Olympic Swimming Results 1912-2020 (datasciencedonut) "
        "+ PLOS 2025 top-20 por prueba/edad/sexo (Mehrabi et al., CC-BY). "
        f"Talla/peso <18a: priors reales youngSwimmers (n={len(youth_pool)}). "
        f"Bandas recreativas: sinteticas ({len(data) - N_REAL} filas) + reales "
        f"propias anonimizadas con consentimiento ({N_REAL} filas, peso x{PESO_REAL})."
    ),
    "trees": arboles,
}

with open("ml/modelo1_arbol.json", "w", encoding="utf-8") as f:
    json.dump(salida, f, ensure_ascii=False, indent=1)

print(f"\nGuardado ml/modelo1_arbol.json ({len(arboles)} arboles)")
