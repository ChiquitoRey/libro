// ─────────────────────────────────────────────────────────────
//  CONFIGURACIÓN — este es el único archivo que tenés que editar
// ─────────────────────────────────────────────────────────────
//  Si dejás SUPABASE_URL o SUPABASE_KEY vacíos, la app arranca en
//  MODO DEMO (para probarla): entrás con ari / mile / invitado,
//  contraseña "demo", y nada se guarda al recargar.
//
//  Los dos datos los sacás de Supabase:
//  Project Settings → API (o "Connect") → Project URL y la clave
//  "anon public" (o "publishable"). Esa clave es pública a propósito:
//  la seguridad la ponen los permisos de la base de datos.
// ─────────────────────────────────────────────────────────────

window.CONFIG = {
 SUPABASE_URL: "https://nmgtwuecykzdawrciawk.supabase.co",
SUPABASE_KEY: "sb_publishable_7qg3GBG0TCgEgN-QwQKDqA_WGd8bUZr",

  // Los usuarios se crean en Supabase como  usuario@DOMINIO_USUARIOS
  // (ej: ari@nuestrolibro.app). En la pantalla de entrada solo se
  // escribe "ari". No hace falta que el dominio exista.
  DOMINIO_USUARIOS: "nuestrolibro.app",

  // Nombre que aparece en la pantalla de entrada
  TITULO: "Nuestro libro",
};
