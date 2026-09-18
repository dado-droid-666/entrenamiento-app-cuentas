"""
Export anonimizado para entrenamiento (Modelo 1 / Modelo 2).

Lee CSVs exportados por el admin desde Supabase (ver instrucciones abajo) y
genera un CSV de entrenamiento anonimizado:
- Solo filas de usuarios con consent_entrenamiento = true.
- user_id reemplazado por un código aleatorio irreversible POR EXPORTACIÓN
  (mismo código dentro de una corrida para poder cruzar archivos, distinto
  en cada corrida porque la sal es aleatoria).
- Edad agrupada en rangos de 5 años (10-14, 15-19, ...). Rangos con <5
  usuarios se recodifican a vacío (k-anonimato básico).
- Nunca exporta: email, nombre, notas libres, IP, dispositivo.

Cómo exportar desde Supabase (SQL editor -> descargar CSV):
    perfiles:  select id, edad, peso_kg, altura_cm, nivel_experiencia,
                      consent_entrenamiento from profiles;
    pruebas:   select user_id, tiempo_400_seg, tiempo_200_seg, tiempo_50_seg,
                      css_pace_100_seg, created_at from pruebas_estandar;
    tiers:     select user_id, tier, modelo_version, created_at from usuario_tier;
    registro:  select user_id, sesion_key, ejercicio_id, tipo, peso_real,
                      reps_reales, tiempo_seg, esfuerzo, created_at
               from sesion_registro;

Uso (Modelo 1):
    python ml/export_anonimo.py --perfiles perfiles.csv --pruebas pruebas.csv ^
        --tiers tiers.csv --out ml/datos_reales_modelo1.csv

Uso (Modelo 2, registro de sesiones):
    python ml/export_anonimo.py --registro registro.csv --perfiles perfiles.csv ^
        --out ml/datos_reales_modelo2.csv --modo registro

Ver CONSENTIMIENTO.md para el texto legal aprobado.
"""
import argparse
import csv
import hashlib
import secrets
import sys
from collections import Counter


def banda_edad(edad):
    try:
        e = int(float(edad))
    except (TypeError, ValueError):
        return ""
    if e < 10 or e > 100:
        return ""
    lo = (e // 5) * 5
    if lo < 10:
        lo = 10
    return f"{lo}-{lo + 4}"


def codigo(salt, user_id):
    h = hashlib.sha256(f"{salt}:{user_id}".encode("utf-8")).hexdigest()
    return "u_" + h[:12]


def leer_csv(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


NIVEL_NUM = {"principiante": 1, "intermedio": 2, "avanzado": 3}


def exportar_modelo1(perfiles, pruebas, tiers):
    salt = secrets.token_hex(8)
    consent = {p["id"]: str(p.get("consent_entrenamiento", "")).lower() in ("t", "true", "1", "sí", "si", "yes")
               for p in perfiles}
    perf = {p["id"]: p for p in perfiles}

    # Última prueba y último tier por usuario
    ult_prueba = {}
    for r in pruebas:
        u = r.get("user_id")
        if u not in ult_prueba or str(r.get("created_at", "")) >= str(ult_prueba[u].get("created_at", "")):
            ult_prueba[u] = r
    ult_tier = {}
    for r in tiers:
        u = r.get("user_id")
        if u not in ult_tier or str(r.get("created_at", "")) >= str(ult_tier[u].get("created_at", "")):
            ult_tier[u] = r

    filas = []
    incluidos, sin_consent, sin_tier = 0, 0, 0
    for uid, p in perf.items():
        if not consent.get(uid):
            sin_consent += 1
            continue
        t = ult_tier.get(uid)
        if not t or not str(t.get("tier", "")).strip():
            sin_tier += 1
            continue
        pr = ult_prueba.get(uid, {})
        css = pr.get("css_pace_100_seg") or ""
        filas.append({
            "codigo": codigo(salt, uid),
            "banda_edad": banda_edad(p.get("edad")),
            "peso_kg": p.get("peso_kg", ""),
            "altura_cm": p.get("altura_cm", ""),
            "css_pace": css,
            "tiempo_50_seg": pr.get("tiempo_50_seg", ""),
            "nivel_experiencia_num": NIVEL_NUM.get(str(p.get("nivel_experiencia", "")).strip().lower(), ""),
            "tier": str(t.get("tier", "")).strip(),
            "fuente": "propio",
        })
        incluidos += 1

    # k-anonimato: bandas con <5 usuarios -> vacío
    conteo = Counter(f["banda_edad"] for f in filas if f["banda_edad"])
    for f in filas:
        if f["banda_edad"] and conteo[f["banda_edad"]] < 5:
            f["banda_edad"] = ""
    print(f"[anon] incluidos={incluidos} sin_consentimiento={sin_consent} sin_tier={sin_tier}",
          file=sys.stderr)
    return filas


def exportar_registro(registro, perfiles):
    salt = secrets.token_hex(8)
    consent = {p["id"]: str(p.get("consent_entrenamiento", "")).lower() in ("t", "true", "1", "sí", "si", "yes")
               for p in perfiles}
    filas, incluidos, excluidos = [], 0, 0
    for r in registro:
        if not consent.get(r.get("user_id")):
            excluidos += 1
            continue
        filas.append({
            "codigo": codigo(salt, r.get("user_id")),
            "sesion": r.get("sesion_key", ""),
            "ejercicio": r.get("ejercicio_id", ""),
            "tipo": r.get("tipo", ""),
            "peso_real": r.get("peso_real", ""),
            "reps_reales": r.get("reps_reales", ""),
            "tiempo_seg": r.get("tiempo_seg", ""),
            "esfuerzo": r.get("esfuerzo", ""),
            "fuente": "propio",
        })
        incluidos += 1
    print(f"[anon] sesiones incluidas={incluidos} excluidas_sin_consent={excluidos}",
          file=sys.stderr)
    return filas


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--perfiles", default="")
    ap.add_argument("--pruebas", default="")
    ap.add_argument("--tiers", default="")
    ap.add_argument("--registro", default="")
    ap.add_argument("--out", required=True)
    ap.add_argument("--modo", choices=["modelo1", "registro"], default="modelo1")
    a = ap.parse_args()

    if a.modo == "modelo1":
        if not (a.perfiles and a.pruebas and a.tiers):
            ap.error("--modo modelo1 requiere --perfiles --pruebas --tiers")
        filas = exportar_modelo1(leer_csv(a.perfiles), leer_csv(a.pruebas), leer_csv(a.tiers))
    else:
        if not (a.registro and a.perfiles):
            ap.error("--modo registro requiere --registro --perfiles")
        filas = exportar_registro(leer_csv(a.registro), leer_csv(a.perfiles))

    if not filas:
        print("[anon] sin filas para exportar (¿consentimientos o CSV vacíos?)", file=sys.stderr)
        return 1
    with open(a.out, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(filas[0].keys()))
        w.writeheader()
        w.writerows(filas)
    print(f"[anon] escrito {a.out} ({len(filas)} filas)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
