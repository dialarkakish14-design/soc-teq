import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { isBelowThreshold, scoreTopic } from "../lib/domain";
import { RATING_DOMAINS, type Rating } from "../types";

export interface DetailTopic {
  id: string;
  title: string;
  incomplete: boolean;
  soc_covered: boolean;
  image_soc: boolean | null;
  discussed_soc: boolean | null;
  ratings: Rating[];
}

export function TopicDetail({
  topic,
  codeById = {},
  residentId,
  onClose,
}: {
  topic: DetailTopic;
  codeById?: Record<string, string>;
  residentId?: string;
  onClose: () => void;
}) {
  const sc = scoreTopic(topic.ratings);
  const notes = topic.ratings.filter((r) => r.note?.trim());
  const mine = residentId ? topic.ratings.find((r) => r.resident_id === residentId) : undefined;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-[#F2F6F5] p-5 sm:rounded-3xl">
        <button onClick={onClose} className="text-sm font-bold text-[#0E7C72]">
          ‹ Back
        </button>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#0E1A1C]">{topic.title}</h1>
        {topic.incomplete ? (
          <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
            <h3 className="font-bold text-[#0E1A1C]">Not finished</h3>
            <p className="mt-1 text-[13.5px] text-[#2E3A3D]">
              Captured, but the coverage questions were never answered.
            </p>
          </div>
        ) : !topic.soc_covered ? (
          <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
            <h3 className="font-bold text-[#0E1A1C]">Not covered</h3>
            <p className="mt-1 text-[13.5px] text-[#2E3A3D]">
              Image of Fitzpatrick IV–VI: {topic.image_soc ? "yes" : "no"} · Explicitly discussed:{" "}
              {topic.discussed_soc ? "yes" : "no"}
            </p>
          </div>
        ) : !sc ? (
          <div className="mt-4 rounded-2xl bg-white p-6 text-center text-sm text-[#5C6B6F] shadow-sm">
            No one has rated this yet.
          </div>
        ) : (
          <>
            <div
              className={`mt-4 flex items-center justify-between rounded-2xl px-4 py-3.5 ${
                isBelowThreshold(sc.overall) ? "bg-[#8F5205] text-[#FBF1E1]" : "bg-[#064B45] text-[#DCEEEB]"
              }`}
            >
              <div>
                <div className="font-mono text-[9.5px] uppercase tracking-widest opacity-85">Team score</div>
                <div className="mt-0.5 text-[11px] opacity-90">{sc.n} resident{sc.n === 1 ? "" : "s"} rated</div>
              </div>
              <div className="font-mono text-3xl font-semibold">{sc.overall.toFixed(2)}</div>
            </div>
            <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[#0E1A1C]">{mine ? "Your rating vs. team" : "Team item averages"}</h3>
                {mine && (
                  <span className="whitespace-nowrap rounded-lg bg-[#EEE7F3] px-2 py-1 font-mono text-[9.5px] font-semibold uppercase text-[#5E3F73]">
                    Only you see this marked
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[11.5px] text-[#5C6B6F]">
                {mine
                  ? "Purple is your score on each item. The black marker is your team's average."
                  : "Mean of every resident's rating on this topic — not an individual score."}
              </p>
              {RATING_DOMAINS.map((d) => {
                const teamVal = sc.perItem[d.key];
                const mineVal = mine ? (mine[d.key] as number) : null;
                return (
                  <div key={d.key} className="mt-2.5">
                    <div className="flex justify-between text-[12.5px] font-semibold">
                      <span>{d.name}</span>
                      <span className="font-mono">
                        {mineVal != null ? (
                          <>
                            {mineVal.toFixed(2)} <span className="text-[#5C6B6F]">/ {teamVal.toFixed(2)}</span>
                          </>
                        ) : (
                          teamVal.toFixed(2)
                        )}
                      </span>
                    </div>
                    {mineVal != null ? (
                      <div className="relative mt-1.5 h-2 rounded-full bg-[#EAEFEE]">
                        <div className="h-full overflow-hidden rounded-full">
                          <div className="h-full rounded-full bg-[#5E3F73]" style={{ width: `${(mineVal / 5) * 100}%` }} />
                        </div>
                        <div
                          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#0E1A1C] shadow"
                          style={{ left: `${(teamVal / 5) * 100}%` }}
                        />
                      </div>
                    ) : (
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#EAEFEE]">
                        <div
                          className={`h-full rounded-full ${teamVal < 3.5 ? "bg-[#8F5205]" : "bg-[#0E7C72]"}`}
                          style={{ width: `${(teamVal / 5) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {notes.length > 0 && (
              <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
                <h3 className="font-bold text-[#0E1A1C]">Notes</h3>
                {notes.map((r) => (
                  <div key={r.id} className="border-t border-[#E2EAE9] py-2.5 first:border-t-0 first:pt-0">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-[#5C6B6F]">
                      {codeById[r.resident_id] ?? "Resident"}
                    </div>
                    <p className="mt-0.5 text-[13.5px] leading-relaxed text-[#2E3A3D]">{r.note}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {residentId && <PrivateNoteCard topicId={topic.id} residentId={residentId} />}
      </div>
    </div>
  );
}

// A note only the writer can ever see — never shown to the rest of the
// cohort, unlike the rating note above. Saved separately per resident.
function PrivateNoteCard({ topicId, residentId }: { topicId: string; residentId: string }) {
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    supabase
      .from("private_notes")
      .select("note")
      .eq("topic_id", topicId)
      .eq("resident_id", residentId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setSaved(data?.note ?? null);
        setDraft(data?.note ?? "");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [topicId, residentId]);

  async function save() {
    setSaving(true);
    setError("");
    const { error: upsertError } = await supabase
      .from("private_notes")
      .upsert({ topic_id: topicId, resident_id: residentId, note: draft.trim(), updated_at: new Date().toISOString() }, { onConflict: "topic_id,resident_id" });
    setSaving(false);
    if (upsertError) return setError(upsertError.message);
    setSaved(draft.trim() || null);
    setEditing(false);
  }

  async function remove() {
    setSaving(true);
    const { error: deleteError } = await supabase.from("private_notes").delete().eq("topic_id", topicId).eq("resident_id", residentId);
    setSaving(false);
    if (deleteError) return setError(deleteError.message);
    setSaved(null);
    setDraft("");
    setEditing(false);
  }

  if (loading) return null;

  return (
    <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-[#0E1A1C]">Your private note</h3>
        <span className="whitespace-nowrap rounded-lg bg-[#EEE7F3] px-2 py-1 font-mono text-[9.5px] font-semibold uppercase text-[#5E3F73]">
          Only you
        </span>
      </div>
      {editing ? (
        <>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Anything you want to remember — never shown to anyone else."
            className="input mt-2 min-h-[70px]"
          />
          {error && (
            <div className="mt-2 rounded-xl bg-[#F8E4E4] px-3 py-2 text-xs font-semibold text-[#93393E]">{error}</div>
          )}
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => {
                setEditing(false);
                setDraft(saved ?? "");
                setError("");
              }}
              className="flex-1 rounded-xl bg-[#EAEFEE] py-2.5 text-xs font-bold text-[#2E3A3D]"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 rounded-xl bg-[#5E3F73] py-2.5 text-xs font-bold text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </>
      ) : saved ? (
        <>
          <p className="mt-2 text-[13px] leading-relaxed text-[#2E3A3D]">{saved}</p>
          <div className="mt-2 flex gap-2">
            <button onClick={() => setEditing(true)} className="text-xs font-bold text-[#0E7C72]">
              Edit
            </button>
            <button onClick={remove} disabled={saving} className="text-xs font-bold text-[#93393E]">
              Delete
            </button>
          </div>
        </>
      ) : (
        <button onClick={() => setEditing(true)} className="mt-2 text-xs font-bold text-[#0E7C72]">
          + Add a private note
        </button>
      )}
    </div>
  );
}
