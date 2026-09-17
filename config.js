// ============================================================================
// Configuracion de Supabase — llena estos dos valores con los tuyos:
// Dashboard de Supabase -> Settings -> API -> Project URL / anon public key
// ============================================================================
const SUPABASE_URL = "https://atypoclonwaxvukwvycy.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_IcI_rEjeEWduDxk0ISOGwg_UZVLPoHL";

const supabaseClient = (SUPABASE_URL.startsWith("http"))
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
