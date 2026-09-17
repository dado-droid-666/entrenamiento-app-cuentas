// ============================================================================
// App engine: fechas, render de pantallas, player, progreso en localStorage
// ============================================================================

const STORAGE_KEY = "plan15nov_progress_v1";
const VIEW_KEY = "plan15nov_lastview_v1";

function addDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d;
}

function fmtISO(d) {
  return d.toISOString().slice(0, 10);
}

function fmtHuman(d) {
  const meses = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `${d.getDate()} ${meses[d.getMonth()]}`;
}

function todayISO() {
  return fmtISO(new Date());
}

function sessionDate(s) {
  const off = (s.sem - 1) * 7 + DAY_OFFSET[s.dia];
  return addDays(PLAN_START, off);
}

// Precompute date on each session (se vuelve a llamar cada vez que se regenera el plan)
function applyDates() {
  SESSIONS.forEach(s => { s._date = sessionDate(s); s._iso = fmtISO(s._date); });
}
applyDates();

function daysUntilCompetition() {
  const today = new Date(todayISO() + "T00:00:00");
  const comp = new Date(COMPETITION_DATE + "T00:00:00");
  return Math.round((comp - today) / 86400000);
}

function findTodaySession() {
  const iso = todayISO();
  let exact = SESSIONS.find(s => s._iso === iso);
  if (exact) return exact;
  // fuera de rango del plan -> mostrar la mas cercana futura, o la primera si aun no empieza
  const future = SESSIONS.find(s => s._iso >= iso);
  return future || SESSIONS[SESSIONS.length - 1];
}

function keyFor(s) {
  return `${s.sem}-${s.dia}`;
}

// ---------------- progreso (localStorage) ----------------
function loadProgress() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}
function saveProgress(p) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}
function isDone(s) {
  const p = loadProgress();
  return !!p[keyFor(s)];
}
function markDone(s, done) {
  const p = loadProgress();
  if (done) p[keyFor(s)] = { at: new Date().toISOString() };
  else delete p[keyFor(s)];
  saveProgress(p);
  if (typeof window.pushProgressToCloud === "function") window.pushProgressToCloud(keyFor(s), done);
}

// ---------------- navegacion ----------------
const screens = ["login", "setup", "hoy", "player", "semana", "plan"];
let currentPlayerSession = null;
let currentBlockIndex = 0;
let restTimer = null;
let restSeconds = 0;
let restWarned = false;

// ---------------- registro de datos reales (peso/reps/esfuerzo) ----------------
const REGISTRO_LOCAL_KEY = "plan15nov_registro_v1";
let sessionRegistros = [];       // acumulado de la sesion actual del player
let registroConfirmado = new Set(); // indices de bloque ya confirmados en esta sesion del player
let registroEsfuerzoSeleccionado = null;

function saveRegistroLocal(sesionKey, registros) {
  let all = [];
  try { all = JSON.parse(localStorage.getItem(REGISTRO_LOCAL_KEY)) || []; } catch { all = []; }
  registros.forEach(r => all.push(Object.assign({ sesion_key: sesionKey, created_at: new Date().toISOString() }, r)));
  localStorage.setItem(REGISTRO_LOCAL_KEY, JSON.stringify(all));
}

// items de un bloque que requieren captura obligatoria (excluye descanso/movilidad)
function itemsCapturables(sesion, bloque) {
  if (sesion.tipo !== "fuerza" && sesion.tipo !== "alberca") return [];
  if (typeof parseBloque !== "function") return [];
  return parseBloque(bloque, sesion.tipo).filter(it => {
    const info = typeof EJERCICIOS !== "undefined" ? EJERCICIOS[it.id] : null;
    return info && !info.sin_esfuerzo;
  });
}

function openRegistroModal(sesion, items, onConfirm) {
  registroEsfuerzoSeleccionado = null;
  const overlay = document.getElementById("registro-overlay");
  const titulo = document.getElementById("registro-titulo");
  const wrap = document.getElementById("registro-ejercicios");
  const errorEl = document.getElementById("registro-error");
  errorEl.style.display = "none";

  titulo.textContent = sesion.tipo === "alberca" ? "¿Como sentiste esta serie?" : "Registra tu bloque";

  if (sesion.tipo === "fuerza") {
    wrap.innerHTML = items.map((it, i) => {
      const info = EJERCICIOS[it.id];
      const nombre = info.nombre + (it.lado ? " (por lado)" : "");
      const repsSugeridas = escalarPorTier(it.reps, "reps", it.id);
      const tiempoSugerido = escalarPorTier(it.tiempo_seg, "tiempo", it.id);
      let inputsHtml = "";
      if (info.tipo_carga === "peso_reps") {
        inputsHtml = `
          <label>Peso (kg)<input type="number" step="0.5" min="0" data-field="peso" data-idx="${i}"></label>
          <label>Reps<input type="number" min="0" placeholder="${repsSugeridas || ""}" data-field="reps" data-idx="${i}"></label>
        `;
      } else if (info.tipo_carga === "tiempo") {
        inputsHtml = `<label>Segundos<input type="number" min="0" placeholder="${tiempoSugerido || ""}" data-field="tiempo" data-idx="${i}"></label>`;
      } else {
        inputsHtml = `<label>Reps<input type="number" min="0" placeholder="${repsSugeridas || ""}" data-field="reps" data-idx="${i}"></label>`;
      }
      return `<div class="registro-ejercicio-row" data-item-idx="${i}">
        <div class="registro-ejercicio-nombre">${nombre}${it.series ? ` · ${it.series} series planificadas` : ""}</div>
        <div class="registro-inputs">${inputsHtml}</div>
      </div>`;
    }).join("");
  } else {
    wrap.innerHTML = "";
  }

  const esfOpts = document.getElementById("registro-esfuerzo-opciones");
  esfOpts.innerHTML = ESCALA_ESFUERZO.map(e => `
    <button type="button" class="esfuerzo-btn" data-valor="${e.valor}">
      <span class="emoji">${e.emoji}</span><span>${e.label}</span>
    </button>
  `).join("");
  esfOpts.querySelectorAll(".esfuerzo-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      esfOpts.querySelectorAll(".esfuerzo-btn").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      registroEsfuerzoSeleccionado = parseInt(btn.dataset.valor, 10);
    });
  });

  overlay.classList.add("open");
  overlay.setAttribute("aria-hidden", "false");

  const confirmBtn = document.getElementById("btn-registro-confirmar");
  confirmBtn.onclick = () => {
    if (!registroEsfuerzoSeleccionado) {
      errorEl.style.display = "block";
      return;
    }
    const registros = items.map((it, i) => {
      const info = EJERCICIOS[it.id];
      const row = { ejercicio_id: it.id, tipo: sesion.tipo, esfuerzo: registroEsfuerzoSeleccionado };
      if (sesion.tipo === "fuerza") {
        const pesoInput = wrap.querySelector(`input[data-field="peso"][data-idx="${i}"]`);
        const repsInput = wrap.querySelector(`input[data-field="reps"][data-idx="${i}"]`);
        const tiempoInput = wrap.querySelector(`input[data-field="tiempo"][data-idx="${i}"]`);
        if (pesoInput) row.peso_real = pesoInput.value ? parseFloat(pesoInput.value) : null;
        if (repsInput) row.reps_reales = repsInput.value ? parseInt(repsInput.value, 10) : (it.reps || null);
        if (tiempoInput) row.tiempo_seg = tiempoInput.value ? parseInt(tiempoInput.value, 10) : (it.tiempo_seg || null);
        if (info.tipo_carga !== "peso_reps") row.peso_real = null;
      }
      return row;
    });
    confirmBtn.blur();
    document.activeElement && document.activeElement.blur();
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    onConfirm(registros);
  };
}

function showScreen(name) {
  screens.forEach(sc => {
    document.getElementById(`screen-${sc}`).classList.toggle("active", sc === name);
  });
  document.querySelectorAll(".navbtn").forEach(b => {
    b.classList.toggle("active", b.dataset.screen === name);
  });
  localStorage.setItem(VIEW_KEY, name);
  window.scrollTo(0, 0);
}

// ---------------- pantalla SETUP (configura tu propia competencia) ----------------
function updateBrand() {
  const d = new Date(COMPETITION_DATE + "T00:00:00");
  document.querySelectorAll(".brand-comp-date").forEach(el => { el.textContent = fmtHuman(d); });
}

function renderSetup(prefill) {
  const compInput = document.getElementById("setup-competition");
  const startInput = document.getElementById("setup-start");
  const selected = (prefill && prefill.eventos) || [];
  const dias = (prefill && prefill.dias) || DEFAULT_DIAS_PATTERN;
  if (prefill) {
    compInput.value = prefill.competitionISO || "";
    startInput.value = prefill.startISO || "";
  } else if (!compInput.value) {
    compInput.value = COMPETITION_DATE;
  }
  renderEventosCheckboxes(selected);
  renderDiasSelectors(dias);
  prefillPerfilForm();
}

const DIA_TIPO_LABEL = { alberca: "🏊 Alberca", gimnasio: "💪 Gimnasio", descanso: "🌙 Descanso" };

function renderDiasSelectors(dias) {
  const wrap = document.getElementById("setup-dias");
  wrap.innerHTML = `<div class="dias-grid">${DAY_ORDER.map((diaNombre, idx) => {
    const valor = dias[idx] || "descanso";
    const opciones = ["alberca", "gimnasio", "descanso"].map(tipo =>
      `<option value="${tipo}"${tipo === valor ? " selected" : ""}>${DIA_TIPO_LABEL[tipo]}</option>`
    ).join("");
    return `<div class="dia-row"><span>${diaNombre}</span><select data-dia-idx="${idx}">${opciones}</select></div>`;
  }).join("")}</div>`;
}

function getSelectedDias() {
  const selects = document.querySelectorAll("#setup-dias select[data-dia-idx]");
  const dias = new Array(7).fill("descanso");
  selects.forEach(sel => { dias[parseInt(sel.dataset.diaIdx, 10)] = sel.value; });
  return dias;
}

function renderEventosCheckboxes(selectedIds) {
  const wrap = document.getElementById("setup-eventos");
  const grupos = [
    { categoria: "alberca", titulo: "Alberca" },
    { categoria: "aguas_abiertas", titulo: "Aguas abiertas" },
  ];
  wrap.innerHTML = grupos.map(g => {
    const items = EVENTOS_DISPONIBLES.filter(e => e.categoria === g.categoria);
    const chips = items.map(e => {
      const checked = selectedIds.includes(e.id) ? "checked" : "";
      return `
        <label class="evento-chip${checked ? " checked" : ""}">
          <input type="checkbox" name="evento" value="${e.id}" ${checked}>
          ${e.label}
        </label>
      `;
    }).join("");
    return `<div class="eventos-grupo"><h4>${g.titulo}</h4><div class="eventos-chips">${chips}</div></div>`;
  }).join("");

  wrap.querySelectorAll(".evento-chip").forEach(chip => {
    const input = chip.querySelector("input");
    input.addEventListener("change", () => chip.classList.toggle("checked", input.checked));
  });
}

function getSelectedEventos() {
  return Array.from(document.querySelectorAll('#setup-eventos input[name="evento"]:checked')).map(el => el.value);
}

function handleSetupSubmit(e) {
  e.preventDefault();
  const comp = document.getElementById("setup-competition").value;
  const start = document.getElementById("setup-start").value;
  const eventos = getSelectedEventos();
  const dias = getSelectedDias();
  if (!comp) return;
  const tieneDescanso = dias.includes("descanso");
  if (!tieneDescanso) {
    const continuar = confirm("No dejaste ningun dia de descanso en la semana. ¿Seguro que quieres continuar asi?");
    if (!continuar) return;
  }

  const perfil = leerPerfilYGuardar();

  applySettings(comp, start || null, eventos, dias);
  applyDates();
  saveProgress({}); // el plan cambio de forma: se reinicia el progreso registrado
  semanaActual = null;
  updateBrand();
  renderHoy();
  renderSemana();
  renderPlan();
  showScreen("hoy");
}

// ---------------- perfil fisico + prueba CSS (Modelo 1) ----------------
const PERFIL_LOCAL_KEY = "plan15nov_perfil_v1";

function segundosDesdeMinSeg(minId, segId) {
  const min = parseFloat(document.getElementById(minId).value);
  const seg = parseFloat(document.getElementById(segId).value);
  if (!min && !seg) return null;
  return (min || 0) * 60 + (seg || 0);
}

function actualizarCSSResultado() {
  const t400 = segundosDesdeMinSeg("css-400-min", "css-400-seg");
  const t200 = segundosDesdeMinSeg("css-200-min", "css-200-seg");
  const el = document.getElementById("css-pace-resultado");
  if (!el) return;
  const css = calcularCSSPace(t400, t200);
  el.textContent = css ? `Tu CSS: ${css.toFixed(1)} seg/100m` : "";
}

// Lee el formulario de perfil + prueba CSS, calcula tier con el Modelo 1,
// guarda todo en localStorage (respaldo) y lo sube a Supabase si hay sesion.
function leerPerfilYGuardar() {
  const edad = parseInt(document.getElementById("perfil-edad").value, 10) || null;
  const pesoKg = parseFloat(document.getElementById("perfil-peso").value) || null;
  const alturaCm = parseFloat(document.getElementById("perfil-altura").value) || null;
  const nivelExperiencia = document.getElementById("perfil-nivel").value;

  const tiempo400Seg = segundosDesdeMinSeg("css-400-min", "css-400-seg");
  const tiempo200Seg = segundosDesdeMinSeg("css-200-min", "css-200-seg");
  const tiempo50Seg = segundosDesdeMinSeg("css-50-min", "css-50-seg");
  const cssPace = calcularCSSPace(tiempo400Seg, tiempo200Seg);

  const perfil = { edad, pesoKg, alturaCm, nivelExperiencia, cssPace, tiempo50Seg };
  const { tier, modeloVersion } = predecirTier(perfil);

  localStorage.setItem(PERFIL_LOCAL_KEY, JSON.stringify(Object.assign({ tier, modeloVersion }, perfil)));

  if (typeof window.pushPerfilToCloud === "function") window.pushPerfilToCloud(perfil);
  if (cssPace != null && typeof window.pushPruebaEstandarToCloud === "function") {
    window.pushPruebaEstandarToCloud({ tiempo400Seg, tiempo200Seg, tiempo50Seg, cssPace });
  }
  if (typeof window.pushTierToCloud === "function") window.pushTierToCloud(tier, modeloVersion);

  return Object.assign({ tier, modeloVersion }, perfil);
}

function prefillPerfilForm() {
  let perfil = null;
  try { perfil = JSON.parse(localStorage.getItem(PERFIL_LOCAL_KEY)); } catch { /* noop */ }
  if (!perfil) return;
  if (perfil.edad) document.getElementById("perfil-edad").value = perfil.edad;
  if (perfil.pesoKg) document.getElementById("perfil-peso").value = perfil.pesoKg;
  if (perfil.alturaCm) document.getElementById("perfil-altura").value = perfil.alturaCm;
  if (perfil.nivelExperiencia) document.getElementById("perfil-nivel").value = perfil.nivelExperiencia;
}

// Perfil + tier ya calculados (Modelo 1), para personalizar la experiencia:
// ritmo objetivo de alberca (a partir del CSS real del usuario) y sugerencias
// de carga en fuerza (escaladas por tier). Si el usuario aun no hizo el test,
// simplemente no se muestran sugerencias (no bloquea nada).
function getPerfilActual() {
  try { return JSON.parse(localStorage.getItem(PERFIL_LOCAL_KEY)) || null; }
  catch { return null; }
}

function ritmoObjetivoTexto() {
  const perfil = getPerfilActual();
  if (!perfil || !perfil.cssPace) return "";
  const seg = perfil.cssPace;
  const min = Math.floor(seg / 60);
  const restSeg = Math.round(seg % 60).toString().padStart(2, "0");
  const label = min > 0 ? `${min}:${restSeg}` : `${restSeg}s`;
  return `🎯 Tu ritmo objetivo (CSS): ${label} /100m`;
}

// Escala una sugerencia numerica (reps/series/segundos) segun el tier del
// usuario (Modelo 1) Y el ajuste continuo del Modelo 2 (esfuerzo/adherencia
// reciente para ESE ejercicio especifico). Si no hay datos suficientes, cae
// en cascada: Modelo 2 -> tier -> valor original sin cambios.
function escalarPorTier(valor, tipo, ejercicioId) {
  if (valor == null) return valor;
  const perfil = getPerfilActual();
  const tier = (perfil && perfil.tier) || 2;

  let factor = (typeof TIER_ESCALA !== "undefined" && TIER_ESCALA[tier]) ? TIER_ESCALA[tier].fuerza_factor : 1.0;

  if (ejercicioId && typeof sugerenciaCombinada === "function") {
    const features = calcularFeaturesAjuste(ejercicioId, tier);
    if (features) {
      const { factor: factorModelo2 } = sugerenciaCombinada(features, features._historial);
      if (factorModelo2 != null) factor = factorModelo2; // Modelo 2 (o su fallback de reglas) manda si hay historial
    }
  }

  if (tipo === "tiempo") return Math.max(5, Math.round((valor * factor) / 5) * 5);
  return Math.max(1, Math.round(valor * factor));
}

// Calcula las features que necesita el Modelo 2 a partir del historial local
// de registro (plan15nov_registro_v1) para un ejercicio especifico, + la
// adherencia reciente de sesiones del mismo tipo (via progresion.js).
function calcularFeaturesAjuste(ejercicioId, tier) {
  let registro = [];
  try { registro = JSON.parse(localStorage.getItem(REGISTRO_LOCAL_KEY)) || []; } catch { registro = []; }
  const historialEjercicio = registro.filter(r => r.ejercicio_id === ejercicioId && r.esfuerzo != null);
  if (!historialEjercicio.length) return null;

  const ultimos3 = historialEjercicio.slice(-3).map(r => r.esfuerzo);
  const esfuerzoPromedio3 = ultimos3.reduce((a, b) => a + b, 0) / ultimos3.length;
  const tendenciaEsfuerzo = ultimos3.length > 1 ? ultimos3[ultimos3.length - 1] - ultimos3[0] : 0;

  let adherenciaReciente = 1;
  let historialTipo = [];
  if (currentPlayerSession && typeof historialPorTipoSesion === "function" && typeof SESSIONS !== "undefined") {
    historialTipo = historialPorTipoSesion(SESSIONS, loadProgress(), currentPlayerSession.sesion, currentPlayerSession.sem);
    if (historialTipo.length) adherenciaReciente = historialTipo.filter(Boolean).length / historialTipo.length;
  }

  return {
    tier,
    esfuerzo_promedio_3: esfuerzoPromedio3,
    tendencia_esfuerzo: tendenciaEsfuerzo,
    adherencia_reciente: adherenciaReciente,
    semana_plan: (currentPlayerSession && currentPlayerSession.sem) || 1,
    _historial: historialTipo,
  };
}

function openSetup() {
  const s = loadSettings();
  renderSetup(s);
  document.getElementById("btn-setup-cancelar").style.display = "";
  showScreen("setup");
}

// ---------------- pantalla HOY ----------------
function renderHoy() {
  const s = findTodaySession();
  const d = daysUntilCompetition();
  const countdownEl = document.getElementById("countdown-num");
  const countdownLbl = document.getElementById("countdown-label");
  if (d > 0) {
    countdownEl.textContent = d;
    countdownLbl.textContent = d === 1 ? "dia para la competencia" : "dias para la competencia";
  } else if (d === 0) {
    countdownEl.textContent = "HOY";
    countdownLbl.textContent = "es el dia de la competencia";
  } else {
    countdownEl.textContent = "🏁";
    countdownLbl.textContent = "competencia completada";
  }

  const eventosEl = document.getElementById("hoy-eventos");
  if (eventosEl) {
    const settings = loadSettings();
    const labels = eventoLabels(settings && settings.eventos);
    eventosEl.textContent = labels.length ? `🎯 Preparando: ${labels.join(", ")}` : "";
  }

  document.getElementById("hoy-fecha").textContent =
    `${s.dia}, ${fmtHuman(s._date)} · Semana ${s.sem} · ${s.fase}`;

  const card = document.getElementById("hoy-card");
  const done = isDone(s);
  const ritmoTxt = s.tipo === "alberca" ? ritmoObjetivoTexto() : "";
  card.innerHTML = `
    <div class="card session-card" style="--accent:${FASE_COLOR[s.fase]}">
      <div class="session-card-top">
        <span class="tipo-badge tipo-${s.tipo}">${TIPO_ICON[s.tipo]} ${TIPO_LABEL[s.tipo]}</span>
        ${done ? '<span class="done-badge">✓ Hecho</span>' : ''}
      </div>
      <h2>${s.sesion}</h2>
      <p class="obj">${s.objetivo}</p>
      <p class="total">${s.total}</p>
      ${ritmoTxt ? `<p class="total" style="color:var(--text-dim);margin-top:4px;">${ritmoTxt}</p>` : ""}
    </div>
  `;

  const btn = document.getElementById("btn-empezar");
  if (s.tipo === "descanso") {
    btn.textContent = "Ver detalle de descanso";
  } else if (s.tipo === "competencia") {
    btn.textContent = "🏆 Ver dia de competencia";
  } else {
    btn.textContent = done ? "Repasar sesion" : "Empezar sesion";
  }
  btn.onclick = () => openPlayer(s);
}

// ---------------- pantalla PLAYER ----------------
function openPlayer(s) {
  currentPlayerSession = s;
  currentBlockIndex = 0;
  sessionRegistros = [];
  registroConfirmado = new Set();
  stopRestTimer();
  renderPlayer();
  showScreen("player");
}

function renderPlayer() {
  const s = currentPlayerSession;
  const total = s.bloques.length;
  const idx = Math.min(currentBlockIndex, total - 1);
  const b = s.bloques[idx];

  document.getElementById("player-header").innerHTML = `
    <span class="tipo-badge tipo-${s.tipo}">${TIPO_ICON[s.tipo]} ${s.sesion}</span>
    <span class="player-progress">${idx + 1} / ${total}</span>
  `;

  const bar = document.getElementById("player-progress-bar");
  bar.style.width = `${((idx + 1) / total) * 100}%`;
  bar.style.background = FASE_COLOR[s.fase];

  let html = `<h2 class="block-title">${b.t}</h2>`;
  html += `<p class="block-desc">${b.d}</p>`;
  if (b.d2) html += `<p class="block-desc">${b.d2}</p>`;
  if (b.d3) html += `<p class="block-desc">${b.d3}</p>`;
  document.getElementById("player-block").innerHTML = html;

  const backBtn = document.getElementById("btn-anterior");
  const nextBtn = document.getElementById("btn-siguiente");
  backBtn.disabled = idx === 0;

  if (idx === total - 1) {
    nextBtn.textContent = isDone(s) ? "✓ Sesion hecha" : "Marcar como hecho ✓";
  } else {
    nextBtn.textContent = "Siguiente →";
  }

  // timer: se muestra si hay algun tiempo detectable en el bloque, o si es fuerza
  const timerWrap = document.getElementById("rest-timer-wrap");
  const detected = parseTimes(b);
  if (s.tipo === "fuerza" || detected.length) {
    timerWrap.style.display = "flex";
    renderTimerButtons(detected);
  } else {
    timerWrap.style.display = "none";
    stopRestTimer();
  }
}

// ---------------- deteccion de tiempos en el texto del bloque ----------------
function parseTimes(bloque) {
  const text = [bloque.d, bloque.d2, bloque.d3].filter(Boolean).join(" ");
  const found = new Set();

  // minutos: 4' , 12' , 18' , 20'
  const minMatches = text.matchAll(/(\d+)\s*'/g);
  for (const m of minMatches) found.add(parseInt(m[1], 10) * 60);

  // segundos: 30" , 45" , 20" descanso , 60"
  const secMatches = text.matchAll(/(\d+)\s*"/g);
  for (const m of secMatches) found.add(parseInt(m[1], 10));

  return Array.from(found)
    .filter(s => s > 0 && s <= 60 * 30) // ignora ruido fuera de rango razonable
    .sort((a, b) => a - b)
    .slice(0, 4);
}

function fmtLabel(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const m = seconds / 60;
  return Number.isInteger(m) ? `${m}:00` : `${Math.floor(m)}:${Math.round((m % 1) * 60).toString().padStart(2, "0")}`;
}

function renderTimerButtons(detected) {
  const wrap = document.getElementById("timer-btns");
  const shortcuts = [30, 45, 60];
  const all = [];
  detected.forEach(s => all.push({ sec: s, suggested: true }));
  shortcuts.forEach(s => { if (!detected.includes(s)) all.push({ sec: s, suggested: false }); });

  wrap.innerHTML = all.map(item =>
    `<button class="timer-btn${item.suggested ? " suggested" : ""}" data-sec="${item.sec}">${fmtLabel(item.sec)}</button>`
  ).join("");

  wrap.querySelectorAll(".timer-btn").forEach(btn => {
    btn.addEventListener("click", () => startRestTimer(parseInt(btn.dataset.sec, 10)));
  });
}

function nextBlock() {
  const s = currentPlayerSession;
  const total = s.bloques.length;
  const idx = Math.min(currentBlockIndex, total - 1);
  const bloque = s.bloques[idx];
  const yaConfirmado = registroConfirmado.has(idx);
  const capturables = yaConfirmado ? [] : itemsCapturables(s, bloque);

  const avanzar = () => {
    if (currentBlockIndex < total - 1) {
      currentBlockIndex++;
      stopRestTimer();
      renderPlayer();
    } else {
      markDone(s, true);
      if (sessionRegistros.length) {
        saveRegistroLocal(keyFor(s), sessionRegistros);
        if (typeof window.pushRegistroToCloud === "function") window.pushRegistroToCloud(keyFor(s), sessionRegistros);
      }
      renderPlayer();
      renderHoy();
      renderSemana();
      renderPlan();
    }
  };

  if (capturables.length) {
    openRegistroModal(s, capturables, (registros) => {
      registroConfirmado.add(idx);
      sessionRegistros = sessionRegistros.concat(registros);
      avanzar();
    });
  } else {
    avanzar();
  }
}

function prevBlock() {
  if (currentBlockIndex > 0) {
    currentBlockIndex--;
    stopRestTimer();
    renderPlayer();
  }
}

// ---------------- audio: chimes (Web Audio, sin archivos) ----------------
let audioCtx = null;
function unlockAudio() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) audioCtx = new Ctx();
  }
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
}

// beep corto: freq en Hz, duracion en segundos, tipo de onda
function beep(freq, dur, when = 0, type = "sine", gain = 0.22) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = audioCtx.currentTime + when;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.02);
  g.gain.linearRampToValueAtTime(0, t0 + dur);
  osc.connect(g).connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function chimeWarning() {
  // beep medio, corto: quedan 5 segundos
  beep(880, 0.16);
}
function chimeFinish() {
  // dos notas graves: termino
  beep(440, 0.22, 0);
  beep(330, 0.32, 0.2);
}

// ---------------- timer de descanso ----------------
function startRestTimer(seconds) {
  stopRestTimer();
  unlockAudio();
  restSeconds = seconds;
  restWarned = false;
  updateTimerDisplay();
  restTimer = setInterval(() => {
    restSeconds--;
    updateTimerDisplay();
    if (restSeconds === 5 && !restWarned) {
      restWarned = true;
      chimeWarning();
    }
    if (restSeconds <= 0) {
      stopRestTimer(true);
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      chimeFinish();
      document.getElementById("timer-display").textContent = "¡Listo!";
      flashScreen();
    }
  }, 1000);
}
function stopRestTimer(keepMessage) {
  if (restTimer) clearInterval(restTimer);
  restTimer = null;
  restSeconds = 0;
  restWarned = false;
  const el = document.getElementById("timer-display");
  if (el && !keepMessage) el.textContent = "--:--";
}
function updateTimerDisplay() {
  const m = Math.floor(restSeconds / 60).toString().padStart(2, "0");
  const sec = (restSeconds % 60).toString().padStart(2, "0");
  document.getElementById("timer-display").textContent = `${m}:${sec}`;
}

// refuerzo visual cuando termina el timer (el sonido no es confiable en
// iPhone con el switch de silencio activado, y la vibracion no existe en iOS Safari)
function flashScreen() {
  const el = document.getElementById("flash-overlay");
  if (!el) return;
  el.classList.remove("flash-pulse");
  // forzar reflow para poder reiniciar la animacion si se llama varias veces seguidas
  void el.offsetWidth;
  el.classList.add("flash-pulse");
}

// ---------------- pantalla SEMANA ----------------
let semanaActual = null;

function totalWeeksInPlan() {
  return SESSIONS.reduce((max, s) => Math.max(max, s.sem), 1);
}

function renderSemana() {
  if (semanaActual === null) {
    const t = findTodaySession();
    semanaActual = t.sem;
  }
  document.getElementById("semana-titulo").textContent = `Semana ${semanaActual}`;
  const sessions = SESSIONS.filter(s => s.sem === semanaActual)
    .sort((a, b) => DAY_ORDER.indexOf(a.dia) - DAY_ORDER.indexOf(b.dia));
  document.getElementById("semana-fase").textContent = sessions[0].fase;

  const list = document.getElementById("semana-list");
  list.innerHTML = sessions.map(s => {
    const done = isDone(s);
    return `
      <div class="card day-row tipo-${s.tipo}" data-key="${keyFor(s)}">
        <div class="day-row-left">
          <span class="day-name">${s.dia}</span>
          <span class="day-date">${fmtHuman(s._date)}</span>
        </div>
        <div class="day-row-mid">
          <span class="tipo-badge tipo-${s.tipo} small">${TIPO_ICON[s.tipo]} ${s.sesion}</span>
          <span class="day-total">${s.total}</span>
        </div>
        <div class="day-row-right">${done ? "✓" : "›"}</div>
      </div>
    `;
  }).join("");

  list.querySelectorAll(".day-row").forEach(row => {
    row.addEventListener("click", () => {
      const key = row.dataset.key;
      const s = sessions.find(x => keyFor(x) === key);
      openPlayer(s);
    });
  });

  document.getElementById("btn-semana-prev").disabled = semanaActual <= 1;
  document.getElementById("btn-semana-next").disabled = semanaActual >= totalWeeksInPlan();
}

// ---------------- pantalla PLAN (todas las semanas del plan) ----------------
function renderPlan() {
  const wrap = document.getElementById("plan-list");
  const totalWeeks = totalWeeksInPlan();
  let html = "";
  for (let w = 1; w <= totalWeeks; w++) {
    const sessions = SESSIONS.filter(s => s.sem === w)
      .sort((a, b) => DAY_ORDER.indexOf(a.dia) - DAY_ORDER.indexOf(b.dia));
    const fase = sessions[0].fase;
    const primero = sessions[0]._date;
    const ultimo = sessions[sessions.length - 1]._date;
    const doneCount = sessions.filter(isDone).length;
    html += `
      <div class="card week-card" data-week="${w}" style="--accent:${FASE_COLOR[fase]}">
        <div class="week-card-top">
          <span class="week-num">Semana ${w}</span>
          <span class="fase-badge" style="background:${FASE_COLOR[fase]}22;color:${FASE_COLOR[fase]}">${fase}</span>
        </div>
        <div class="week-dates">${fmtHuman(primero)} – ${fmtHuman(ultimo)}</div>
        <div class="week-progress-bar"><div style="width:${(doneCount/sessions.length)*100}%;background:${FASE_COLOR[fase]}"></div></div>
        <div class="week-progress-txt">${doneCount}/${sessions.length} sesiones registradas</div>
      </div>
    `;
  }
  wrap.innerHTML = html;
  const rango = document.getElementById("plan-rango");
  if (rango && SESSIONS.length) {
    rango.textContent = `${fmtHuman(SESSIONS[0]._date)} → ${fmtHuman(SESSIONS[SESSIONS.length - 1]._date)}`;
  }
  wrap.querySelectorAll(".week-card").forEach(card => {
    card.addEventListener("click", () => {
      semanaActual = parseInt(card.dataset.week, 10);
      renderSemana();
      showScreen("semana");
    });
  });
}

// ---------------- init ----------------
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".navbtn").forEach(btn => {
    btn.addEventListener("click", () => showScreen(btn.dataset.screen));
  });

  document.getElementById("btn-anterior").addEventListener("click", prevBlock);
  document.getElementById("btn-siguiente").addEventListener("click", nextBlock);
  document.getElementById("btn-player-back").addEventListener("click", () => showScreen("hoy"));

  document.getElementById("btn-semana-prev").addEventListener("click", () => {
    if (semanaActual > 1) { semanaActual--; renderSemana(); }
  });
  document.getElementById("btn-semana-next").addEventListener("click", () => {
    if (semanaActual < totalWeeksInPlan()) { semanaActual++; renderSemana(); }
  });

  document.getElementById("timer-stop").addEventListener("click", () => stopRestTimer(false));

  document.getElementById("setup-form").addEventListener("submit", handleSetupSubmit);
  document.getElementById("btn-config").addEventListener("click", openSetup);
  document.getElementById("btn-setup-cancelar").addEventListener("click", () => showScreen("hoy"));

  ["css-400-min", "css-400-seg", "css-200-min", "css-200-seg"].forEach(id => {
    document.getElementById(id).addEventListener("input", actualizarCSSResultado);
  });
  if (typeof cargarModelo1 === "function") cargarModelo1();
  if (typeof cargarModelo2 === "function") cargarModelo2();

  document.getElementById("login-form").addEventListener("submit", handleLoginSubmit);
  document.getElementById("btn-login-toggle").addEventListener("click", toggleLoginMode);
  document.getElementById("btn-logout").addEventListener("click", handleLogout);

  initAuth();

  // Registrar service worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
});
