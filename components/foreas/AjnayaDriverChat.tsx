"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { askAjnaya, type AjnayaTurn } from "@/app/(driver)/ajnaya-actions";
import { Sparkles, X, Send, Loader2, ArrowUpRight } from "lucide-react";

/**
 * Porte Ajnaya — copilote flottant de l'espace CHAUFFEUR (dashboard web).
 *
 * Shell d'interface uniquement : tout le cerveau est côté Pieuvre (askAjnaya →
 * Responder canonique). Scope strict chauffeur : courses, gains, zones, parrainage.
 * Voir AJNAYA_PIEUVRE_GREFFE_BRIEF.md pour le branchement.
 */

interface Props {
  driverName: string;
}

interface Msg {
  role: "driver" | "ajnaya";
  content: string;
  handoffUrl?: string;
  note?: "backend" | "error";
}

const SUGGESTIONS = [
  "Où je gagne le plus maintenant ?",
  "Combien j'ai fait cette semaine ?",
  "Comment marche mon parrainage ?",
];

export function AjnayaDriverChat({ driverName }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "ajnaya",
      content: `Salut ${driverName.split(" ")[0]} 👋 Je suis Ajnaya, ton copilote. Demande-moi tout sur tes courses, tes gains, tes zones ou ton parrainage.`,
    },
  ]);
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open]);

  const send = (text: string) => {
    const clean = text.trim();
    if (!clean || isPending) return;
    const history: AjnayaTurn[] = msgs
      .filter((m) => !m.note)
      .map((m) => ({ role: m.role, content: m.content }));
    setMsgs((m) => [...m, { role: "driver", content: clean }]);
    setInput("");
    startTransition(async () => {
      const res = await askAjnaya(clean, history);
      if (res.ok && res.reply) {
        setMsgs((m) => [...m, { role: "ajnaya", content: res.reply!, handoffUrl: res.handoffUrl }]);
      } else if (res.backendPending) {
        setMsgs((m) => [
          ...m,
          {
            role: "ajnaya",
            note: "backend",
            content:
              "Je me connecte… mon cerveau (la Pieuvre) finalise son branchement sur cet espace. Reviens dans un instant — je serai là.",
          },
        ]);
      } else {
        setMsgs((m) => [
          ...m,
          { role: "ajnaya", note: "error", content: res.error ?? "Oups, réessaie dans un instant." },
        ]);
      }
    });
  };

  return (
    <>
      {/* Panneau */}
      <div
        className={`fixed bottom-[92px] right-lg z-[60] w-[min(380px,calc(100vw-2rem))] origin-bottom-right transition-all duration-300 ${
          open ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        <div
          className="flex h-[min(560px,70vh)] flex-col overflow-hidden rounded-xxl border border-white/10 shadow-2xl"
          style={{ background: "#000000", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-lg py-md">
            <div className="flex items-center gap-sm">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-white"
                style={{ background: "linear-gradient(135deg,#8C52FF,#6C3CE0)" }}
              >
                <Sparkles size={15} />
              </div>
              <div>
                <div className="text-body-bold font-extrabold text-text-hero leading-none">Ajnaya</div>
                <div className="text-micro text-text-muted mt-xxs">Ton copilote · courses, gains, zones</div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-md overflow-y-auto px-lg py-lg">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "driver" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-md py-sm text-caption leading-relaxed ${
                    m.role === "driver"
                      ? "bg-white/[0.08] text-text-primary"
                      : m.note === "error"
                        ? "bg-danger/10 text-danger border border-danger/20"
                        : m.note === "backend"
                          ? "bg-warning/10 text-warning border border-warning/20"
                          : "bg-violet-royal/[0.12] text-text-primary border border-violet-royal/20"
                  }`}
                >
                  {m.content}
                  {m.handoffUrl && (
                    <a
                      href={m.handoffUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-xs flex items-center gap-xxs text-micro font-bold text-cyan-electric hover:underline"
                    >
                      Continuer sur WhatsApp <ArrowUpRight size={12} />
                    </a>
                  )}
                </div>
              </div>
            ))}
            {isPending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-xs rounded-xl border border-violet-royal/20 bg-violet-royal/[0.12] px-md py-sm text-caption text-text-secondary">
                  <Loader2 size={13} className="animate-spin" /> Ajnaya réfléchit…
                </div>
              </div>
            )}
            {msgs.length <= 1 && !isPending && (
              <div className="flex flex-wrap gap-xs pt-xs">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-pill border border-white/10 bg-white/[0.04] px-md py-xxs text-micro text-text-secondary hover:bg-white/[0.08] transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-sm border-t border-white/10 px-md py-md"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Demande à Ajnaya…"
              className="flex-1 bg-transparent text-caption text-text-primary placeholder-white/30 outline-none"
            />
            <button
              type="submit"
              disabled={isPending || !input.trim()}
              aria-label="Envoyer"
              className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-40"
              style={{ background: "linear-gradient(135deg,#8C52FF,#6C3CE0)" }}
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>

      {/* Bulle flottante (orbe) */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Ouvrir Ajnaya"
        className="fixed bottom-lg right-lg z-[60] flex h-14 w-14 items-center justify-center rounded-full text-white transition-transform hover:scale-105 active:scale-95"
        style={{
          background: "linear-gradient(135deg,#8C52FF 0%,#6C3CE0 100%)",
          boxShadow: "0 10px 36px rgba(140,82,255,0.45)",
        }}
      >
        {open ? <X size={22} /> : <Sparkles size={22} />}
        {!open && (
          <span
            className="absolute inset-0 rounded-full"
            style={{ animation: "ajnaya-ping 1.8s ease-in-out infinite", border: "2px solid rgba(140,82,255,0.5)" }}
          />
        )}
      </button>

      <style>{`@keyframes ajnaya-ping{0%{transform:scale(1);opacity:.6}70%{transform:scale(1.5);opacity:0}100%{opacity:0}}`}</style>
    </>
  );
}
