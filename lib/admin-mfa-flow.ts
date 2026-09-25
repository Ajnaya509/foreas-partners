import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminAccess } from "./admin-access";
import type { AdminMfaTransport } from "./admin-mfa-session";

export type MfaState = {
  phase: "loading" | "enroll" | "code" | "done" | "closed";
  busy: boolean;
  error: string | null;
  factors: { id: string; name: string }[];
  factorId: string | null;
  qrCode: string | null;
  secret: string | null;
};

/** Un parcours appartient au compte reçu du serveur jusqu'à son démontage. */
export function createAdminMfaFlow(
  client: SupabaseClient,
  userId: string,
  checkServer: (expected: string) => Promise<Pick<AdminAccess, "status" | "userId">>,
  onState: (state: MfaState) => void,
  onComplete: () => void,
  transport: AdminMfaTransport,
  timeoutMs = 15000,
) {
  let disposed = false;
  let closed = false;
  let state: MfaState = { phase: "loading", busy: false, error: null, factors: [], factorId: null, qrCode: null, secret: null };
  function emit(patch: Partial<MfaState>) {
    if (disposed || closed) return;
    state = { ...state, ...patch };
    onState({ ...state, factors: [...state.factors] });
  }
  function close(message = "La session a changé ou l’accès a été retiré. Reconnecte-toi.") {
    if (closed || disposed) return;
    closed = true;
    transport.dispose();
    state = { phase: "closed", busy: false, error: message, factors: [], factorId: null, qrCode: null, secret: null };
    onState({ ...state });
  }
  function current() {
    if (closed || disposed) throw new Error("parcours_termine");
  }
  const { data: observer } = client.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || (session?.user?.id && session.user.id !== userId)) close();
  });

  async function bounded<T>(promise: PromiseLike<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([Promise.resolve(promise), new Promise<never>((_, reject) => {
        timer = setTimeout(() => { close("La vérification prend trop de temps. Reviens à la connexion pour réessayer."); reject(new Error("delai_mfa")); }, timeoutMs);
      })]);
    } finally { if (timer) clearTimeout(timer); }
  }

  async function proof() {
    current();
    const { data, error } = await bounded(client.auth.getUser());
    current();
    if (error || data?.user?.id !== userId) { close(); throw new Error("compte_refuse"); }
    const access = await bounded(checkServer(userId));
    current();
    if (access.status === "unavailable") throw new Error("Vérification indisponible. Réessaie dans un instant.");
    if (access.userId !== userId || !["allowed", "mfa_required"].includes(access.status)) {
      close(); throw new Error("acces_refuse");
    }
    return access;
  }
  function failure(error: unknown) {
    if (closed || disposed) return;
    const message = error instanceof Error && error.message === "Vérification indisponible. Réessaie dans un instant."
      ? error.message : "La vérification n’a pas abouti. Vérifie ton code et réessaie.";
    emit({ error: message });
  }
  async function factors() {
    const { data, error } = await bounded(transport.listFactors());
    current();
    if (error || !data) throw new Error("facteurs_indisponibles");
    if (!data.totp.some(f => f.status === "verified") && data.all.some(f => f.status === "verified")) {
      close("Un autre moyen de vérification protège ce compte. Utilise-le depuis la connexion habituelle.");
      throw new Error("autre_facteur_verifie");
    }
    return data.totp.filter(f => f.status === "verified").map(f => ({ id: f.id, name: f.friendly_name || "Application d’authentification" }));
  }
  function choose(list: MfaState["factors"]) {
    emit({ factors: list, factorId: list[0]?.id ?? null, phase: list.length ? "code" : "enroll", qrCode: null, secret: null });
  }
  async function initialize() {
    if (closed || disposed || state.busy || state.phase === "done") return;
    emit({ busy: true, error: null });
    try {
      const access = await proof();
      if (access.status === "allowed") { emit({ phase: "done" }); onComplete(); return; }
      choose(await factors());
    } catch (error) { failure(error); }
    finally { emit({ busy: false }); }
  }
  async function enroll() {
    if (closed || disposed || state.busy || state.phase !== "enroll") return;
    emit({ busy: true, error: null });
    try {
      await proof();
      const existing = await factors();
      if (existing.length) { choose(existing); return; }
      // Aucune suppression d'un facteur vérifié ou en attente, même en cas de panne.
      const { data, error } = await bounded(transport.enroll({ factorType: "totp", friendlyName: `FOREAS Admin ${new Date().toISOString()}` }));
      current();
      if (error || !data?.id || !data.totp?.qr_code || !data.totp.secret) throw new Error("enrolement_refuse");
      await proof();
      emit({ phase: "code", factorId: data.id, factors: [{ id: data.id, name: "Nouvelle application d’authentification" }], qrCode: data.totp.qr_code, secret: data.totp.secret });
    } catch (error) { failure(error); }
    finally { emit({ busy: false }); }
  }
  async function verify(code: string) {
    if (closed || disposed || state.busy || state.phase !== "code" || !state.factorId || !/^\d{6}$/.test(code)) return;
    const factorId = state.factorId;
    emit({ busy: true, error: null });
    try {
      await proof();
      const { data: challenge, error: challengeError } = await bounded(transport.challenge({ factorId }));
      current();
      if (challengeError || !challenge?.id) throw new Error("challenge_refuse");
      await proof();
      const { error } = await bounded(transport.verify({ factorId, challengeId: challenge.id, code }));
      current();
      if (error) throw new Error("code_refuse");
      await proof();
      await bounded(transport.adopt());
      current();
      const access = await proof();
      if (access.status !== "allowed") throw new Error("assurance_non_confirmee");
      emit({ phase: "done", secret: null, qrCode: null });
      onComplete();
    } catch (error) { failure(error); }
    finally { emit({ busy: false }); }
  }
  return {
    initialize, enroll, verify,
    selectFactor(id: string) {
      if (!closed && !disposed && !state.busy && state.factors.some(f => f.id === id)) emit({ factorId: id, error: null });
    },
    dispose() { transport.dispose(); disposed = true; closed = true; observer.subscription.unsubscribe(); state = { ...state, qrCode: null, secret: null, factors: [], factorId: null }; },
  };
}
