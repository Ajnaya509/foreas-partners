import { createClient, type SupabaseClient, type MFAEnrollTOTPParams, type AuthMFAEnrollTOTPResponse } from "@supabase/supabase-js";
import { createChunks, DEFAULT_COOKIE_OPTIONS, isChunkLike, parseCookieHeader, serializeCookieHeader, stringToBase64URL } from "@supabase/ssr";

export type AdminMfaTransport = {
  listFactors: SupabaseClient["auth"]["mfa"]["listFactors"];
  enroll: (params: MFAEnrollTOTPParams) => Promise<AuthMFAEnrollTOTPResponse>;
  challenge: SupabaseClient["auth"]["mfa"]["challenge"];
  verify: SupabaseClient["auth"]["mfa"]["verify"];
  adopt: () => Promise<void>;
  dispose: () => void;
};

type CookiePort = { read: () => string; write: (value: string) => void };
/** Le SDK vérifie dans sa mémoire privée. Aucun retour tardif ne peut écrire
 * dans la session du navigateur, ni annoncer une session sur son canal partagé. */
export function createAdminMfaSession(
  shared: SupabaseClient,
  userId: string,
  options: { url: string; key: string; cookieDomain?: string; cookies?: CookiePort; fetch?: typeof fetch },
): AdminMfaTransport {
  const cookies = options.cookies ?? { read: () => document.cookie, write: value => { document.cookie = value; } };
  const cookieName = `sb-${new URL(options.url).hostname.split(".")[0]}-auth-token`;
  const read = () => parseCookieHeader(cookies.read()).filter(c => isChunkLike(c.name, cookieName)).sort((a, b) => a.name.localeCompare(b.name));
  let baseline = JSON.stringify(read());
  let stopped = false;
  const abort = new AbortController();
  let isolated: SupabaseClient | null = null;
  let preparing: Promise<SupabaseClient> | null = null;
  function current() {
    if (stopped || JSON.stringify(read()) !== baseline) throw new Error("session_mfa_remplacee");
  }
  async function prepare() {
    current();
    if (!preparing) preparing = (async () => {
      const { data, error } = await shared.auth.getSession();
      current();
      if (error || data.session?.user.id !== userId) throw new Error("session_mfa_absente");
      isolated = createClient(options.url, options.key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: `foreas-admin-mfa-${crypto.randomUUID()}` },
        global: { fetch: (input, init) => (options.fetch ?? fetch)(input, { ...init, signal: abort.signal }) },
      });
      const seeded = await isolated.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
      current();
      if (seeded.error || seeded.data.user?.id !== userId) throw new Error("session_mfa_refusee");
      return isolated;
    })();
    const attempt = preparing;
    try { return await attempt; }
    catch (error) {
      // Une panne passagère du premier contrôle peut être retentée. Le client
      // fautif reste privé et ne sera jamais adopté par la tentative suivante.
      if (preparing === attempt) {
        void isolated?.auth.stopAutoRefresh();
        isolated = null;
        preparing = null;
      }
      throw error;
    }
  }
  return {
    listFactors: async () => { const client = await prepare(); current(); return client.auth.mfa.listFactors(); },
    enroll: async params => { const client = await prepare(); current(); return client.auth.mfa.enroll(params); },
    challenge: async params => { const client = await prepare(); current(); return client.auth.mfa.challenge(params); },
    verify: async params => { const client = await prepare(); current(); return client.auth.mfa.verify(params); },
    async adopt() {
      const client = await prepare();
      const { data, error } = await client.auth.getSession();
      current();
      const session = data.session;
      if (error || session?.user.id !== userId || !session.access_token || !session.refresh_token) throw new Error("session_mfa_refusee");
      const signed = await client.auth.getClaims(session.access_token);
      current();
      if (signed.error || signed.data?.claims.sub !== userId || signed.data.claims.aal !== "aal2") throw new Error("assurance_mfa_non_confirmee");
      // Même encodage, découpage et durée que @supabase/ssr. Aucun setSession
      // partagé : la comparaison et toutes les écritures suivantes sont synchrones.
      const chunks = createChunks(cookieName, `base64-${stringToBase64URL(JSON.stringify(session))}`);
      const settings = { ...DEFAULT_COOKIE_OPTIONS, ...(options.cookieDomain ? { domain: options.cookieDomain, secure: true } : {}) };
      const writes = [
        ...read().filter(c => !chunks.some(next => next.name === c.name)).map(c => serializeCookieHeader(c.name, "", { ...settings, maxAge: 0 })),
        ...chunks.map(c => serializeCookieHeader(c.name, c.value, settings)),
      ];
      current();
      for (const value of writes) cookies.write(value);
      baseline = JSON.stringify(read());
      if (baseline !== JSON.stringify(chunks.sort((a, b) => a.name.localeCompare(b.name)))) throw new Error("session_mfa_non_conservee");
    },
    dispose() { stopped = true; abort.abort(); void isolated?.auth.stopAutoRefresh(); },
  };
}
