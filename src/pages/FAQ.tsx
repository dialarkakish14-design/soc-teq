import { useState } from "react";
import { supabase } from "../lib/supabase";
import { FAQ_ITEMS } from "../lib/content";
import type { Resident } from "../types";

export function FAQ({ resident, onAbout }: { resident: Resident; onAbout: () => void }) {
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  function toggle(i: number) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  async function sendFeedback() {
    if (!message.trim()) return;
    setBusy(true);
    setError("");
    const { error: insertError } = await supabase.from("feedback").insert({
      resident_id: resident.id,
      message: message.trim(),
    });
    setBusy(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setMessage("");
    setSent(true);
  }

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-24">
      <div className="flex items-start justify-between px-5 pt-6">
        <div>
          <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E7C72]">FAQ</div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#0E1A1C]">Q&amp;As</h1>
        </div>
        <button onClick={onAbout} className="mt-0.5 text-xs font-bold text-[#0E7C72]">
          SoC-TEQ
        </button>
      </div>

      <div className="px-5">
        <div className="mt-4 flex flex-col gap-3">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = open.has(i);
            return (
              <div key={item.question} className="rounded-2xl bg-white p-4 shadow-sm">
                <button onClick={() => toggle(i)} className="flex w-full items-center justify-between gap-3 text-left">
                  <span className="text-[14.5px] font-bold text-[#0E1A1C]">{item.question}</span>
                  <span className={`shrink-0 text-xl font-extrabold text-[#5C6B6F] transition-transform ${isOpen ? "rotate-180" : ""}`}>
                    ▾
                  </span>
                </button>
                {isOpen && <p className="mt-2 text-[13px] leading-relaxed text-[#2E3A3D]">{item.answer}</p>}
              </div>
            );
          })}
        </div>

        <div className="mt-6 rounded-3xl bg-white p-4 shadow-sm">
          <h3 className="font-bold text-[#0E1A1C]">Got feedback?</h3>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[#2E3A3D]">
            This app is actively evolving, and what you think of it shapes what gets built next. Type it below, or
            email it directly to{" "}
            <a href="mailto:dialarkakish1@hotmail.com" className="font-semibold text-[#0E7C72]">
              dialarkakish1@hotmail.com
            </a>
            .
          </p>

          {sent ? (
            <div className="mt-3 rounded-xl bg-[#DCEFEB] px-3.5 py-3 text-sm font-semibold text-[#064B45]">
              Sent — thank you.
            </div>
          ) : (
            <>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What's working, what isn't, what you'd want to see next…"
                className="input mt-3 min-h-[90px]"
              />
              {error && (
                <div className="mt-2 rounded-xl bg-[#F8E4E4] px-3.5 py-2.5 text-sm font-semibold text-[#93393E]">
                  {error}
                </div>
              )}
              <button
                onClick={sendFeedback}
                disabled={busy || !message.trim()}
                className="mt-3 w-full rounded-2xl bg-[#0E7C72] py-3.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {busy ? "Sending…" : "Send feedback"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
