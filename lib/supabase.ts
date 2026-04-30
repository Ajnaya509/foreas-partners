/**
 * Compat layer — re-export du nouveau client browser
 * Pour la rétrocompatibilité avec les anciens imports `from '@/lib/supabase'`.
 *
 * NOUVEAU CODE doit utiliser :
 *  - `from '@/lib/supabase/client'` pour les Client Components
 *  - `from '@/lib/supabase/server'` pour les Server Components / Actions
 */
export { supabase, createClient } from "./supabase/client";
