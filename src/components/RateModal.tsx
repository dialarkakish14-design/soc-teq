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

  const complete = Object.keys(vals).length === RATING_DOMAINS.length;
  const mean = complete
    ? RATING_DOMAINS.reduce((s, d) => s + vals[d.key], 0) / RATING_DOMAINS.length
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
        nuance: vals.nuance,
        mgmt: vals.mgmt,
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

        <p className="mt-3 rounded-2xl bg-[#DCEFEB] px-4 py-3.5 text-[13.5px] font-semibold leading-relaxed text-[#064B45]">
          Your honest experience is exactly what's useful here — there's no need to soften it. This is never tied
          to your name for anyone in a position over you, so just tell it like it was.
        </p>

        <div className="mt-2 flex flex-col divide-y divide-[#E2EAE9]">
          {RATING_DOMAINS.map((d) => {
            const set = d.key in vals;
            return (
              <div key={d.key} className="py-4 first:pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-extrabold text-[#0E1A1C]">{d.name}</span>
                  <span className={`font-mono text-base font-semibold ${set ? "text-[#5E3F73]" : "text-[#5C6B6F]"}`}>
                    {set ? vals[d.key] : "—"}
                  </span>
                </div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-[#2E3A3D]">{d.statement}</p>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  defaultValue={3}
                  className={set ? "mt-2 w-full" : "mt-2 w-full untouched"}
                  onInput={(e) => {
                    const v = +(e.target as HTMLInputElement).value;
                    setVals((prev) => ({ ...prev, [d.key]: v }));
                  }}
                />
                <div className="mt-1 flex justify-between text-[10.5px] text-[#5C6B6F]">
                  <span>Strongly disagree</span>
                  <span>Strongly agree</span>
                </div>
              </div>
            );
          })}
        </div>

        {!complete && (
          <div className="text-[11px] text-[#5C6B6F]">
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
              {mean == null ? `${Object.keys(vals).length} of ${RATING_DOMAINS.length} items set.` : mean < THRESHOLD ? "Below 3.5 on your rating." : "At or above 3.5."}
            </div>
          </div>
          <div className="font-mono text-3xl font-semibold">{mean == null ? "—" : mean.toFixed(2)}</div>
        </div>

        <label className="mt-4 block">
          <div className="mb-1.5 text-xs font-bold text-[#0E1A1C]">
            Note <span className="font-normal text-[#5C6B6F]">· optional</span>
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
          className="mt-1 w-full rounded-2xl py-2.5 text-sm font-semibold text-[#5C6B6F] disabled:opacity-60"
        >
          I wasn't at this session
        </button>
        <button onClick={onClose} className="mt-1 w-full rounded-2xl py-2.5 text-sm font-semibold text-[#5C6B6F]">
          Cancel
        </button>
      </div>
    </div>
  );
}
