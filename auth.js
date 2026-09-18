// ============================================================================
// Autenticacion + sincronizacion con Supabase.
// Si config.js no tiene credenciales validas, la app sigue funcionando 100%
// local (como antes), sin pantalla de login.
// ============================================================================

let currentUser = null;
let loginMode = "login"; // "login" | "signup"

function cloudEnabled() {
  return !!supabaseClient;
}

// ---------------- pantalla LOGIN ----------------
function toggleLoginMode() {
  loginMode = loginMode === "login" ? "signup" : "login";
  document.getElementById("login-title").textContent = loginMode === "login" ? "Inicia sesion" : "Crea tu cuenta";
  document.getElementById("btn-login-submit").textContent = loginMode === "login" ? "Entrar" : "Crear cuenta";
  document.getElementById("btn-login-toggle").textContent = loginMode === "login" ? "No tengo cuenta, crear una" : "Ya tengo cuenta, iniciar sesion";
  const err = document.getElementById("login-error");
  err.style.display = "none";
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const errEl = document.getElementById("login-error");
  errEl.style.display = "none";
  errEl.style.color = "var(--danger)";

  if (!cloudEnabled()) {
    errEl.textContent = "Falta configurar Supabase en config.js.";
    errEl.style.display = "block";
    return;
  }

  const btn = document.getElementById("btn-login-submit");
  btn.disabled = true;
  try {
    let result;
    if (loginMode === "login") {
      result = await supabaseClient.auth.signInWithPassword({ email, password });
    } else {
      result = await supabaseClient.auth.signUp({ email, password });
    }
    if (result.error) throw result.error;

    if (loginMode === "signup" && !result.data.session) {
      // requiere confirmar email antes de poder entrar
      errEl.style.color = "var(--accent)";
      errEl.textContent = "Cuenta creada. Revisa tu correo para confirmar, luego inicia sesion.";
      errEl.style.display = "block";
      loginMode = "login";
      document.getElementById("login-title").textContent = "Inicia sesion";
      document.getElementById("btn-login-submit").textContent = "Entrar";
      document.getElementById("btn-login-toggle").textContent = "No tengo cuenta, crear una";
      return;
    }
    // si hay sesion, onAuthStateChange dispara onSignedIn()
  } catch (err) {
    errEl.textContent = err.message || "Ocurrio un error, intenta de nuevo.";
    errEl.style.display = "block";
  } finally {
    btn.disabled = false;
  }
}

async function handleLogout() {
  if (cloudEnabled()) await supabaseClient.auth.signOut();
  else { showScreen("login"); }
}

// ---------------- sincronizacion con la nube ----------------
async function pullProfileFromCloud() {
  if (!cloudEnabled() || !currentUser) return;
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("competition_date, start_date, eventos, dias")
    .eq("id", currentUser.id)
    .single();
  if (error || !data || !data.competition_date) {
    // Este usuario no tiene plan guardado en la nube todavia. Limpiamos
    // cualquier configuracion local que haya quedado de OTRA cuenta usada
    // antes en este mismo navegador, para no mostrarle el plan de alguien mas.
    localStorage.removeItem(SETTINGS_KEY);
    return;
  }
  applySettingsLocalOnly(data.competition_date, data.start_date || null, data.eventos || [], data.dias || null);
}

// aplica settings sin volver a empujar a la nube (evita loop al recien traer de la nube)
function applySettingsLocalOnly(competitionISO, startISO, eventos, dias) {
  const { sessions, planStart } = generatePlan(competitionISO, startISO, dias);
  SESSIONS = specializeForEvents(sessions, eventos || []);
  PLAN_START = planStart;
  COMPETITION_DATE = competitionISO;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ competitionISO, startISO: startISO || null, eventos: eventos || [], dias: dias || null }));
  applyDates();
}

window.pushProfileToCloud = async function (competitionISO, startISO, eventos, dias) {
  if (!cloudEnabled() || !currentUser) return;
  await supabaseClient.from("profiles").upsert({
    id: currentUser.id,
    competition_date: competitionISO,
    start_date: startISO,
    eventos: eventos || [],
    dias: dias || null,
  });
};

async function pullProgressFromCloud() {
  if (!cloudEnabled() || !currentUser) return;
  const { data, error } = await supabaseClient
    .from("progreso")
    .select("sesion_key, hecho_at")
    .eq("user_id", currentUser.id);
  if (error) return;
  const p = {};
  (data || []).forEach(row => { p[row.sesion_key] = { at: row.hecho_at }; });
  saveProgress(p);
}

window.pushProgressToCloud = async function (sesionKey, done) {
  if (!cloudEnabled() || !currentUser) return;
  if (done) {
    await supabaseClient.from("progreso").upsert({
      user_id: currentUser.id,
      sesion_key: sesionKey,
      hecho_at: new Date().toISOString(),
    }, { onConflict: "user_id,sesion_key" });
  } else {
    await supabaseClient.from("progreso").delete()
      .eq("user_id", currentUser.id).eq("sesion_key", sesionKey);
  }
};

// Sube el registro real de ejercicios (peso/reps/esfuerzo en fuerza, esfuerzo
// en alberca) capturado durante el player. Si no hay nube configurada o el
// usuario no ha iniciado sesion, el dato queda solo en localStorage
// (ver saveRegistroLocal en app.js) para no perderlo.
window.pushRegistroToCloud = async function (sesionKey, registros) {
  if (!cloudEnabled() || !currentUser || !registros || !registros.length) return;
  const rows = registros.map(r => ({
    user_id: currentUser.id,
    sesion_key: sesionKey,
    ejercicio_id: r.ejercicio_id,
    tipo: r.tipo,
    peso_real: r.peso_real != null ? r.peso_real : null,
    reps_reales: r.reps_reales != null ? r.reps_reales : null,
    tiempo_seg: r.tiempo_seg != null ? r.tiempo_seg : null,
    esfuerzo: r.esfuerzo,
  }));
  await supabaseClient.from("sesion_registro").insert(rows);
};

// ---------------- perfil fisico + prueba CSS + tier (Modelo 1) ----------------
window.pushPerfilToCloud = async function (perfil) {
  if (!cloudEnabled() || !currentUser) return;
  const row = {
    id: currentUser.id,
    edad: perfil.edad,
    peso_kg: perfil.pesoKg,
    altura_cm: perfil.alturaCm,
    nivel_experiencia: perfil.nivelExperiencia,
  };
  // Columna consent_entrenamiento (migración sql/004_consentimiento.sql).
  // Si aún no está aplicada en el proyecto, reintenta sin ella.
  try {
    await supabaseClient.from("profiles").upsert(Object.assign({ consent_entrenamiento: !!perfil.consentEntrenamiento }, row));
  } catch (e) {
    await supabaseClient.from("profiles").upsert(row);
  }
};

window.pushPruebaEstandarToCloud = async function (prueba) {
  if (!cloudEnabled() || !currentUser) return;
  await supabaseClient.from("pruebas_estandar").insert({
    user_id: currentUser.id,
    tiempo_400_seg: prueba.tiempo400Seg,
    tiempo_200_seg: prueba.tiempo200Seg,
    tiempo_50_seg: prueba.tiempo50Seg,
    css_pace_100_seg: prueba.cssPace,
  });
};

window.pushTierToCloud = async function (tier, modeloVersion) {
  if (!cloudEnabled() || !currentUser) return;
  await supabaseClient.from("usuario_tier").insert({
    user_id: currentUser.id,
    tier,
    modelo_version: modeloVersion,
  });
};

// ---------------- ruteo despues de saber quien eres ----------------
function routeAfterAuth() {
  updateBrand();
  renderHoy();
  renderSemana();
  renderPlan();
  const settings = loadSettings();
  if (!settings) {
    renderSetup(null);
    document.getElementById("btn-setup-cancelar").style.display = "none";
    showScreen("setup");
  } else {
    const last = localStorage.getItem(VIEW_KEY) || "hoy";
    const valid = screens.includes(last) && !["player", "setup", "login"].includes(last);
    showScreen(valid ? last : "hoy");
  }
}

async function onSignedIn() {
  await pullProfileFromCloud();
  await pullProgressFromCloud();
  routeAfterAuth();
}

function onSignedOut() {
  currentUser = null;
  showScreen("login");
}

// ---------------- init de autenticacion ----------------
async function initAuth() {
  if (!cloudEnabled()) {
    // sin backend configurado: la app funciona local, sin login (como antes)
    document.getElementById("screen-login").classList.remove("active");
    const logoutBtn = document.getElementById("btn-logout");
    if (logoutBtn) logoutBtn.style.display = "none";
    routeAfterAuth();
    return;
  }

  const { data: { session } } = await supabaseClient.auth.getSession();
  currentUser = session ? session.user : null;

  if (currentUser) {
    await onSignedIn();
  } else {
    showScreen("login");
  }

  supabaseClient.auth.onAuthStateChange((event, session) => {
    const newUser = session ? session.user : null;
    if (event === "SIGNED_IN" && (!currentUser || currentUser.id !== newUser.id)) {
      currentUser = newUser;
      onSignedIn();
    } else if (event === "SIGNED_OUT") {
      onSignedOut();
    }
  });
}
