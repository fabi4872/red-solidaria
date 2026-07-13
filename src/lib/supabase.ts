import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Fábricas del cliente de Supabase (storage de fotos).
// No creamos un singleton en tiempo de import a propósito: así la app arranca
// aunque todavía no estén cargadas las variables de entorno. El cliente se
// instancia recién cuando se lo necesita.

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. Cargala en tu .env (ver .env.example).`,
    );
  }
  return value;
}

/** Cliente para el navegador / operaciones con la anon key (respeta RLS). */
export function createSupabaseBrowserClient(): SupabaseClient {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}

/**
 * Cliente de servidor con la service role key (salta RLS).
 * NUNCA importar ni usar esto desde código que corra en el navegador.
 */
export function createSupabaseServiceClient(): SupabaseClient {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
  );
}
