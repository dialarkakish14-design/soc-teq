import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { todayLocalDate, isDayOpen, closesAtLabel, scoreTopic, isBelowThreshold } from "../lib/domain";
import { SESSION_TYPES, type Absence, type Day, type Rating, type Resident, type Session, type Topic } from "../types";
import { CoverageModal } from "../components/CoverageModal";
import { RateModal } from "../components/RateModal";

type TopicWithRatings = Topic & { ratings: Rating[]; absences: Absence[] };
type SessionWithTopics = Session & { topics: TopicWithRatings[] };

export function Today({ resident, onLogout }: { resident: Resident; onLogout: () => void }) {
  const date = todayLocalDate();
  const open = isDayOpen(date);

  const [day, setDay] = useState<Day | null>(null);
  const [sessions, setSessions] = useState<SessionWithTopics[]>([]);
  const [logger, setLogger] = useState<Resident | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<{ kind: "coverage" | "rate" | "detail"; topic: TopicWithRatings } | null>(null);

  const [newSessionType, setNewSessionType] = useState<string>(SESSION_TYPES[0]);
  const [quickTitle, setQuickTitle] = useState("");
  const [busy, setBusy] = useState(false);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2400);
  }

  const load = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);

    let { data: dayRow } = await supabase
      .from("days")
      .select("*")
      .eq("program_id", resident.program_id)
      .eq("pgy", resident.pgy)
      .eq("date", date)
      .maybeSingle();

    if (!dayRow) {
      const { data: inserted, error: insertError } = await supabase
        .from("days")
        .insert({ program_id: resident.program_id, pgy: resident.pgy, date })
        .select("*")
        .single();
      if (insertError) {
        // Someone else in the cohort may have created it a moment earlier.
        const { data: retry } = await supabase
          .from("days")
          .select("*")
          .eq("program_id", resident.program_id)
          .eq("pgy", resident.pgy)
          .eq("date", date)
          .maybeSingle();
        dayRow = retry ?? null;
      } else {
        dayRow = inserted;
      }
    }

    setDay(dayRow as Day | null);

    if (dayRow?.logger_id) {
      const { data: loggerRow } = await supabase
        .from("residents")
        .select("*")
        .eq("id", dayRow.logger_id)
        .maybeSingle();
      setLogger(loggerRow as Resident | null);
    } else {
      setLogger(null);
    }

    if (dayRow) {
      const { data: sessionRows } = await supabase
        .from("sessions")
        .select("*, topics(*, ratings(*), absences(*))")
        .eq("day_id", dayRow.id)
        .order("created_at", { ascending: true });
      setSessions((sessionRows as SessionWithTopics[] | null) ?? []);
    } else {
      setSessions([]);
    }

    setLoading(false);
  }, [resident.program_id, resident.pgy, date]);

  useEffect(() => {
    load(true);
  }, [load]);

  async function claimLogger() {
    if (!day) return;
    const { error } = await supabase.from("days").update({ logger_id: resident.id }).eq("id", day.id);
    if (error) return flash(error.message);
    flash("You're the logger for this day.");
    await load();
  }

  async function capture() {
    if (!day) return;
    const title = quickTitle.trim();
    if (title.length < 4) return flash("Write the full topic name, not an abbreviation.");
    setBusy(true);

    let session = sessions.find((s) => s.type === newSessionType);
    if (!session) {
      const { data: newSession, error: sessionError } = await supabase
        .from("sessions")
        .insert({ day_id: day.id, type: newSessionType })
        .select("*")
        .single();
      if (sessionError) {
        setBusy(false);
        return flash(sessionError.message);
      }
      session = { ...(newSession as Session), topics: [] };
    }

    const { error: topicError } = await supabase.from("topics").insert({
      session_id: session.id,
      title,
      incomplete: true,
    });
    setBusy(false);
    if (topicError) return flash(topicError.message);

    setQuickTitle("");
    flash("Captured. Finish the coverage questions after the session.");
    await load();
  }

  const iAmLogger = day?.logger_id === resident.id;

  function openTopic(t: TopicWithRatings) {
    if (t.incomplete) {
      if (iAmLogger && open) {
        setModal({ kind: "coverage", topic: t });
      } else {
        flash("The logger hasn't finished this entry yet.");
      }
      return;
    }
    if (!t.soc_covered) {
      setModal({ kind: "detail", topic: t });
      return;
    }
    const mine = t.ratings.find((r) => r.resident_id === resident.id);
    const mineAbsent = t.absences.find((a) => a.resident_id === resident.id);
    if (!mine && !mineAbsent && open) {
      setModal({ kind: "rate", topic: t });
    } else {
      setModal({ kind: "detail", topic: t });
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-sm text-[#8A999D]">Loading…</div>;
  }

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-10">
      <div className="flex items-center justify-between px-5 pt-6">
        <div>
          <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E7C72]">
            {new Date(date + "T00:00:00").toLocaleDateString(undefined, { month: "long", year: "numeric" })} · {resident.pgy}
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#0E1A1C]">
            {new Date(date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
          </h1>
        </div>
        <button onClick={onLogout} className="text-xs font-bold text-[#8A999D]">
          Log out
        </button>
      </div>

      <div className="px-5">
        <div className="mt-2 text-xs text-[#8A999D]">
          You are <b className="text-[#0E1A1C]">{resident.resident_code}</b> · {open ? `open until ${closesAtLabel(date)}` : "closed"}
        </div>

        {/* logger card */}
        <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm">
          {!day?.logger_id ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-[#0E1A1C]">Logger not claimed</h3>
                  <p className="mt-1 text-[12.5px] text-[#414F52]">
                    One {resident.pgy} resident registers the day's topics and marks SoC coverage. The
                    rest rate.
                  </p>
                </div>
                <span className="whitespace-nowrap rounded-lg bg-[#EAEFEE] px-2 py-1 font-mono text-[10px] font-semibold uppercase text-[#8A999D]">
                  Open
                </span>
              </div>
              {open ? (
                <button
                  onClick={claimLogger}
                  className="mt-3 w-full rounded-2xl bg-[#0E7C72] py-3 text-sm font-bold text-white"
                >
                  Claim logger
                </button>
              ) : (
                <div className="mt-2 text-[11px] text-[#8A999D]">This day closed without a logger.</div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#DCEFEB] text-xs font-extrabold text-[#064B45]">
                    {(logger?.full_name ?? "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-[#0E1A1C]">{iAmLogger ? "You are the logger" : logger?.full_name}</h3>
                    <div className="text-xs text-[#414F52]">
                      {iAmLogger ? "Register each topic as it happens." : `Marks SoC coverage for ${resident.pgy}`}
                    </div>
                  </div>
                </div>
                <span className="whitespace-nowrap rounded-lg bg-[#DCEFEB] px-2 py-1 font-mono text-[10px] font-semibold uppercase text-[#064B45]">
                  Claimed
                </span>
              </div>
              {iAmLogger && open && (
                <div className="mt-3 rounded-2xl bg-[#FAEBD4] px-3.5 py-3 text-[12.5px] font-semibold leading-relaxed text-[#8F5205]">
                  Before marking coverage, agree with the residents present on what was shown and
                  discussed.
                </div>
              )}
            </>
          )}
        </div>

        {/* quick capture */}
        {iAmLogger && open && (
          <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#0E1A1C]">Quick capture</h3>
                <p className="mt-1 text-[12.5px] text-[#414F52]">Name it now, finish it later.</p>
              </div>
              <span className="whitespace-nowrap rounded-lg bg-[#EEE7F3] px-2 py-1 font-mono text-[10px] font-semibold uppercase text-[#5E3F73]">
                5 sec
              </span>
            </div>
            <label className="mt-3 block">
              <div className="mb-1.5 text-xs font-bold text-[#0E1A1C]">Session</div>
              <select value={newSessionType} onChange={(e) => setNewSessionType(e.target.value)} className="input">
                {sessions.map((s) => (
                  <option key={s.id} value={s.type}>
                    {s.type} (existing)
                  </option>
                ))}
                {SESSION_TYPES.filter((t) => !sessions.some((s) => s.type === t)).map((t) => (
                  <option key={t} value={t}>
                    ＋ New {t.toLowerCase()}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block">
              <div className="mb-1.5 text-xs font-bold text-[#0E1A1C]">Topic name</div>
              <input
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") capture();
                }}
                placeholder="e.g. Vitiligo"
                autoComplete="off"
                className="input"
              />
            </label>
            <button
              onClick={capture}
              disabled={busy}
              className="mt-3 w-full rounded-2xl bg-[#0E7C72] py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              Capture topic
            </button>
          </div>
        )}

        {/* sessions & topics */}
        <div className="mt-4 flex flex-col gap-3">
          {sessions.length === 0 && (
            <div className="rounded-3xl bg-white p-6 text-center text-sm text-[#8A999D] shadow-sm">
              Nothing registered for this day yet.
            </div>
          )}
          {sessions.map((s) => (
            <div key={s.id} className="overflow-hidden rounded-3xl bg-white shadow-sm">
              <div className="flex items-center justify-between px-4 py-3.5">
                <span className="text-[15.5px] font-extrabold text-[#0E1A1C]">{s.type}</span>
                <span className="whitespace-nowrap rounded-lg bg-[#EAEFEE] px-2 py-1 font-mono text-[10px] font-semibold uppercase text-[#8A999D]">
                  {s.topics.length} topic{s.topics.length === 1 ? "" : "s"}
                </span>
              </div>
              {s.topics.map((t) => (
                <TopicRow key={t.id} topic={t} residentId={resident.id} onOpen={() => openTopic(t)} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-[#0E1A1C] px-4 py-3.5 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}

      {modal?.kind === "coverage" && (
        <CoverageModal
          topic={modal.topic}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            flash("Topic updated.");
            load();
          }}
        />
      )}
      {modal?.kind === "rate" && (
        <RateModal
          topic={modal.topic}
          residentId={resident.id}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            flash("Rating saved.");
            load();
          }}
        />
      )}
      {modal?.kind === "detail" && (
        <TopicDetail topic={modal.topic} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

function TopicRow({
  topic,
  residentId,
  onOpen,
}: {
  topic: TopicWithRatings;
  residentId: string;
  onOpen: () => void;
}) {
  const mine = topic.ratings.find((r) => r.resident_id === residentId);
  const mineAbsent = topic.absences.find((a) => a.resident_id === residentId);
  const sc = scoreTopic(topic.ratings);

  let meta: string;
  let badge: React.ReactNode;
  if (topic.incomplete) {
    meta = "captured — coverage questions still needed";
    badge = <Pill tone="violet">Finish</Pill>;
  } else if (!topic.soc_covered) {
    meta = `image ${topic.image_soc ? "yes" : "no"} · discussed ${topic.discussed_soc ? "yes" : "no"}`;
    badge = <Pill tone="off">No SoC</Pill>;
  } else {
    meta = `${sc ? sc.n : 0} rated`;
    if (mine && sc) badge = <Pill tone={isBelowThreshold(sc.overall) ? "flag" : "default"}>{sc.overall.toFixed(2)}</Pill>;
    else if (mineAbsent) badge = <Pill tone="off">Absent</Pill>;
    else badge = <Pill tone="violet">Rate now</Pill>;
  }

  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center justify-between gap-3 border-t border-[#E2EAE9] px-4 py-3.5 text-left active:bg-[#F7FAFA]"
    >
      <div>
        <div className="text-[14.5px] font-bold text-[#0E1A1C]">{topic.title}</div>
        <div className="mt-0.5 text-[11.5px] text-[#8A999D]">{meta}</div>
      </div>
      {badge}
    </button>
  );
}

function Pill({ tone, children }: { tone: "default" | "off" | "violet" | "flag"; children: React.ReactNode }) {
  const styles = {
    default: "bg-[#DCEFEB] text-[#064B45]",
    off: "bg-[#EAEFEE] text-[#8A999D]",
    violet: "bg-[#EEE7F3] text-[#5E3F73]",
    flag: "bg-[#FAEBD4] text-[#8F5205]",
  }[tone];
  return (
    <span className={`whitespace-nowrap rounded-lg px-2 py-1 font-mono text-[10px] font-semibold uppercase ${styles}`}>
      {children}
    </span>
  );
}

function TopicDetail({ topic, onClose }: { topic: TopicWithRatings; onClose: () => void }) {
  const sc = scoreTopic(topic.ratings);
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-[#F2F6F5] p-5 sm:rounded-3xl">
        <button onClick={onClose} className="text-sm font-bold text-[#0E7C72]">
          ‹ Back
        </button>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#0E1A1C]">{topic.title}</h1>
        {!topic.soc_covered ? (
          <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
            <h3 className="font-bold text-[#0E1A1C]">Not covered</h3>
            <p className="mt-1 text-[13.5px] text-[#414F52]">
              Image of Fitzpatrick IV–VI: {topic.image_soc ? "yes" : "no"} · Explicitly discussed:{" "}
              {topic.discussed_soc ? "yes" : "no"}
            </p>
          </div>
        ) : !sc ? (
          <div className="mt-4 rounded-2xl bg-white p-6 text-center text-sm text-[#8A999D] shadow-sm">
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
              <h3 className="font-bold text-[#0E1A1C]">Item averages</h3>
              {Object.entries(sc.perItem).map(([k, v]) => (
                <div key={k} className="mt-2.5">
                  <div className="flex justify-between text-[12.5px] font-semibold">
                    <span className="capitalize">{k}</span>
                    <span className="font-mono">{v.toFixed(2)}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#EAEFEE]">
                    <div
                      className={`h-full rounded-full ${v < 3.5 ? "bg-[#8F5205]" : "bg-[#0E7C72]"}`}
                      style={{ width: `${(v / 5) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
