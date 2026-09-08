import { useState } from "react";
import { supabase } from "../lib/supabase";
import { RATING_DOMAINS, THRESHOLD, type Topic } from "../types";

export function RateModal({
  topic,
  residentId,
  onClose,
  onSaved,
}: {
  topic: Topic;
  residentId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [vals, setVals] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showReminder, setShowReminder] = useState(false);

  // A domain the logger marked outside this topic's scope (nuance/mgmt only)
  // never appears here to rate at all — not skippable, just not offered.
  const isApplicable = (key: string) =>
    key === "nuance" ? topic.nuance_applicable : key === "mgmt" ? topic.mgmt_applicable : true;
  const applicableDomains = RATING_DOMAINS.filter((d) => isApplicable(d.key));
  const excludedDomains = RATING_DOMAINS.filter((d) => !isApplicable(d.key));

  const complete = Object.keys(vals).length === applicableDomains.length;
  const mean = complete
    ? applicableDomains.reduce((s, d) => s + vals[d.key], 0) / applicableDomains.length
    : null;

  async function submit() {
    if (!complete) {
      setError("Set all five items before submitting.");
      return;
    }
    setBusy(true);
    setError("");
    const { error: upsertError } = await supabase.from("ratings").upsert(
      {
        topic_id: topic.id,
        resident_id: residentId,
        depth: vals.depth,
        clarity: vals.clarity,
        nuance: topic.nuance_applicable ? vals.nuance : null,
        mgmt: topic.mgmt_applicable ? vals.mgmt : null,
        conf: vals.conf,
        note: note.trim() || null,
      },
      { onConflict: "topic_id,resident_id" },
    );
    setBusy(false);
    if (upsertError) {
      setError(upsertError.message);
      return;
    }
    onSaved();
  }

  async function markAbsent() {
    setBusy(true);
    setError("");
    const { error: insertError } = await supabase
      .from("absences")
      .insert({ topic_id: topic.id, resident_id: residentId, reason: "declared" });
    setBusy(false);
    // 23505 = already declared absent for this topic — treat as success.
    if (insertError && insertError.code !== "23505") {
      setError(insertError.message);
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-[#F2F6F5] p-5 sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="text-sm font-bold text-[#0E7C72]">
            ‹ Back
          </button>
        </div>
        <div className="mt-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E7C72]">
          Your rating
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#0E1A1C]">{topic.title}</h1>

        <div className="mt-3 rounded-2xl bg-[#DCEFEB] px-4 py-3.5 text-[#064B45]">
          <button onClick={() => setShowReminder((s) => !s)} className="flex w-full items-center justify-between gap-2 text-left">
            <span className="text-[14px] font-extrabold leading-snug">A thoughtful rating matters</span>
            <span className={`shrink-0 text-xl font-extrabold transition-transform ${showReminder ? "rotate-180" : ""}`}>▾</span>
          </button>
          {showReminder && (
            <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed">
              {"Your ratings help SoC-TEQ reflect the learning experience as accurately as possible. Take a moment to answer based on what you genuinely encountered and how the session felt to you.\n\nTraining moves quickly, but a brief moment of reflection can help keep the full range of patients we care for in view."}
            </p>
          )}
        </div>

        {excludedDomains.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {excludedDomains.map((d) => {
              const reason = d.key === "nuance" ? topic.nuance_scope_reason : topic.mgmt_scope_reason;
              return (
                <div key={d.key} className="rounded-2xl bg-[#EAEFEE] px-3.5 py-3">
                  <div className="text-[12.5px] font-bold text-[#2E3A3D]">{d.name} · outside this session's scope</div>
                  {reason && <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#4C5B5F]">{reason}</p>}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-3 flex flex-col gap-3">
          {applicableDomains.map((d) => {
            const set = d.key in vals;
            return (
              <div key={d.key} className="rounded-3xl bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-extrabold text-[#0E1A1C]">{d.name}</span>
                  <span
                    className={`whitespace-nowrap rounded-lg px-2 py-1 font-mono text-sm font-bold ${
                      set ? "bg-[#F0E9F5] text-[#5E3F73]" : "bg-[#F5F8F7] text-[#4C5B5F]"
                    }`}
                  >
                    {set ? vals[d.key] : "—"}
                  </span>
                </div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-[#16211F]">{d.statement}</p>
                {d.hint && (
                  <p className="mt-1 text-[11.5px] italic leading-relaxed text-[#4C5B5F]">{d.hint}</p>
                )}
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  defaultValue={3}
                  className={set ? "mt-3 w-full" : "mt-3 w-full untouched"}
                  style={{ touchAction: "none" }}
                  onInput={(e) => {
                    const v = +(e.target as HTMLInputElement).value;
                    setVals((prev) => ({ ...prev, [d.key]: v }));
                  }}
                  onClick={(e) => {
                    // Native range inputs don't reliably jump to the clicked
                    // point on the track across browsers — some only respond
                    // to dragging the thumb. Compute the value from click
                    // position directly so tapping anywhere always works.
                    const el = e.currentTarget;
                    const rect = el.getBoundingClientRect();
                    const ratio = (e.clientX - rect.left) / rect.width;
                    const v = Math.min(5, Math.max(1, Math.round(1 + ratio * 4)));
                    el.value = String(v);
                    setVals((prev) => ({ ...prev, [d.key]: v }));
                  }}
                />
                <div className="mt-1 flex justify-between text-[10.5px] text-[#4C5B5F]">
                  <span>Strongly disagree</span>
                  <span>Strongly agree</span>
                </div>
              </div>
            );
          })}
        </div>

        {!complete && (
          <div className="text-[11px] text-[#4C5B5F]">
            Tap anywhere on a scale to set it. Nothing is pre-selected.
          </div>
        )}

        <div
          className={`mt-5 flex items-center justify-between rounded-2xl px-4 py-3.5 ${
            mean == null ? "bg-[#DFE6E5] text-[#2E3A3D]" : mean < THRESHOLD ? "bg-[#8F5205] text-[#FBF1E1]" : "bg-[#5E3F73] text-[#F0E9F5]"
          }`}
        >
          <div>
            <div className="font-mono text-[9.5px] uppercase tracking-widest opacity-85">My score</div>
            <div className="mt-0.5 text-[11px] opacity-90">
              {mean == null ? `${Object.keys(vals).length} of ${applicableDomains.length} items set.` : mean < THRESHOLD ? "Below 3.5 on your rating." : "At or above 3.5."}
            </div>
          </div>
          <div className="font-mono text-3xl font-semibold">{mean == null ? "—" : mean.toFixed(2)}</div>
        </div>

        <label className="mt-4 block">
          <div className="mb-1.5 text-xs font-bold text-[#0E1A1C]">
            Note <span className="font-normal text-[#4C5B5F]">· optional</span>
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything worth remembering about how this was taught."
            className="input min-h-[72px]"
          />
        </label>

        {error && (
          <div className="mt-3 rounded-xl bg-[#F8E4E4] px-3.5 py-2.5 text-sm font-semibold text-[#93393E]">
            {error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={busy}
          className="mt-4 w-full rounded-2xl bg-[#5E3F73] py-4 font-bold text-white shadow-lg shadow-[#5E3F73]/25 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Submit my rating"}
        </button>
        <button
          onClick={markAbsent}
          disabled={busy}
          className="mt-1 w-full rounded-2xl py-2.5 text-sm font-semibold text-[#4C5B5F] disabled:opacity-60"
        >
          I wasn't at this session
        </button>
        <button onClick={onClose} className="mt-1 w-full rounded-2xl py-2.5 text-sm font-semibold text-[#4C5B5F]">
          Cancel
        </button>
      </div>
    </div>
  );
}
