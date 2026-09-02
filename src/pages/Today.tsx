import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { todayLocalDate, isDayOpen, closesAtLabel } from "../lib/domain";
import { SESSION_TYPE_COLOR } from "../lib/content";
import { SESSION_TYPES, type Absence, type Day, type Rating, type Resident, type Session, type Topic } from "../types";
import { CoverageModal } from "../components/CoverageModal";
import { RateModal } from "../components/RateModal";
import { TopicDetail } from "../components/TopicDetail";
import { TopicRow } from "../components/TopicRow";

type TopicWithRatings = Topic & { ratings: Rating[]; absences: Absence[] };
type SessionWithTopics = Session & { topics: TopicWithRatings[] };

export function Today({
  resident,
  active,
  onLogout,
  onAbout,
}: {
  resident: Resident;
  active: boolean;
  onLogout: () => void;
  onAbout: () => void;
}) {
  const date = todayLocalDate();
  const open = isDayOpen(date);

  const [day, setDay] = useState<Day | null>(null);
  const [sessions, setSessions] = useState<SessionWithTopics[]>([]);
  const [logger, setLogger] = useState<Resident | null>(null);
  const [codeById, setCodeById] = useState<Record<string, string>>({});
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

    const { data: cohortRows } = await supabase
      .from("residents")
      .select("id, resident_code")
      .eq("program_id", resident.program_id)
      .eq("pgy", resident.pgy);
    setCodeById(
      Object.fromEntries(((cohortRows as { id: string; resident_code: string }[] | null) ?? []).map((r) => [r.id, r.resident_code])),
    );

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
      const { data: sessionRows, error: sessionsError } = await supabase
        .from("sessions")
        .select("*, topics(*, ratings(*), absences(*))")
        .eq("day_id", dayRow.id)
        .order("created_at", { ascending: true });
      if (sessionsError) flash(sessionsError.message);
      setSessions((sessionRows as SessionWithTopics[] | null) ?? []);
    } else {
      setSessions([]);
    }

    setLoading(false);
  }, [resident.program_id, resident.pgy, date]);

  useEffect(() => {
    load(true);
  }, [load]);

  // Every screen preloads once at login for instant tab switches, but that
  // means data goes stale the moment something changes on another tab —
  // re-fetch (silently, no spinner) each time this tab becomes the active
  // one so a resident coming back from Today/Summary/etc. sees current data.
  useEffect(() => {
    if (active) load();
  }, [active, load]);

  async function claimLogger() {
    if (!day) return;
    const { error } = await supabase.from("days").update({ logger_id: resident.id }).eq("id", day.id);
    if (error) return flash(error.message);
    // Updates locally instead of refetching — we already know the result,
    // so there's no reason to wait on a round trip to show it.
    setDay({ ...day, logger_id: resident.id });
    setLogger(resident);
    flash("You're the logger for this day.");
  }

  async function releaseLogger() {
    if (!day) return;
    const { error } = await supabase.from("days").update({ logger_id: null }).eq("id", day.id);
    if (error) return flash(error.message);
    setDay({ ...day, logger_id: null });
    setLogger(null);
    flash("Released — anyone else can claim it. Nothing you've logged is affected.");
  }

  async function capture() {
    if (!day) return;
    const title = quickTitle.trim();
    if (title.length < 4) return flash("Write the full topic name, not an abbreviation.");
    setBusy(true);

    let session = sessions.find((s) => s.type === newSessionType);
    let isNewSession = false;
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
      isNewSession = true;
    }

    const { data: newTopic, error: topicError } = await supabase
      .from("topics")
      .insert({ session_id: session.id, title, incomplete: true })
      .select("*")
      .single();
    setBusy(false);
    if (topicError) return flash(topicError.message);

    // Appends the new row locally instead of refetching everything — same
    // reasoning as claim/release above.
    const captured: TopicWithRatings = { ...(newTopic as Topic), ratings: [], absences: [] };
    const finishedSession = session;
    setSessions((prev) =>
      isNewSession
        ? [...prev, { ...finishedSession, topics: [captured] }]
        : prev.map((s) => (s.id === finishedSession.id ? { ...s, topics: [...s.topics, captured] } : s)),
    );

    setQuickTitle("");
    flash("Captured. Finish the coverage questions after the session.");
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
    return <div className="p-8 text-center text-sm text-[#5C6B6F]">Loading…</div>;
  }

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-24">
      <div className="flex items-center justify-between px-5 pt-6">
        <div>
          <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E7C72]">
            {new Date(date + "T00:00:00").toLocaleDateString(undefined, { month: "long", year: "numeric" })} · {resident.pgy}
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#0E1A1C]">
            {new Date(date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
          </h1>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <button onClick={onAbout} className="text-xs font-bold text-[#0E7C72]">
            SoC-TEQ
          </button>
          <button onClick={onLogout} className="text-xs font-bold text-[#5C6B6F]">
            Log out
          </button>
        </div>
      </div>

      <div className="px-5">
        <div className="mt-2 text-xs text-[#5C6B6F]">
          You are <b className="text-[#0E1A1C]">{resident.resident_code}</b> · {open ? `open until ${closesAtLabel(date)}` : "closed"}
        </div>

        {/* logger card */}
        <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm">
          {!day?.logger_id ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-[#0E1A1C]">Logger not claimed</h3>
                  <p className="mt-1 text-[12.5px] text-[#2E3A3D]">
                    One {resident.pgy} resident registers the day's topics and marks SoC coverage. The
                    rest rate.
                  </p>
                </div>
                <span className="whitespace-nowrap rounded-lg bg-[#EAEFEE] px-2 py-1 font-mono text-[10px] font-semibold uppercase text-[#5C6B6F]">
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
                <div className="mt-2 text-[11px] text-[#5C6B6F]">This day closed without a logger.</div>
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
                    <div className="text-xs text-[#2E3A3D]">
                      {iAmLogger ? "Register each topic as it happens." : `Marks SoC coverage for ${resident.pgy}`}
                    </div>
                  </div>
                </div>
                <span className="whitespace-nowrap rounded-lg bg-[#DCEFEB] px-2 py-1 font-mono text-[10px] font-semibold uppercase text-[#064B45]">
                  Claimed
                </span>
              </div>
              {iAmLogger && open && (
                <>
                  <div className="mt-3 rounded-2xl bg-[#FAEBD4] px-3.5 py-3 text-[12.5px] font-semibold leading-relaxed text-[#8F5205]">
                    Before marking coverage, agree with the residents present on what was shown and
                    discussed.
                  </div>
                  <button
                    onClick={releaseLogger}
                    className="mt-3 w-full rounded-2xl bg-[#EAEFEE] py-2.5 text-xs font-bold text-[#2E3A3D]"
                  >
                    Release logger — wrong tap, or had to leave
                  </button>
                </>
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
                <p className="mt-1 text-[12.5px] text-[#2E3A3D]">Name it now, finish it later.</p>
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
            <div className="rounded-3xl bg-white p-6 text-center text-sm text-[#5C6B6F] shadow-sm">
              Nothing registered for this day yet.
            </div>
          )}
          {sessions.map((s) => (
            <div key={s.id} className="overflow-hidden rounded-3xl bg-white shadow-sm">
              <div className="flex items-center justify-between px-4 py-3.5">
                <span className="flex items-center text-[15.5px] font-extrabold text-[#0E1A1C]">
                  <span
                    className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: SESSION_TYPE_COLOR[s.type] ?? "#5C6B6F" }}
                  />
                  {s.type}
                </span>
                <span className="whitespace-nowrap rounded-lg bg-[#EAEFEE] px-2 py-1 font-mono text-[10px] font-semibold uppercase text-[#5C6B6F]">
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
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-[#0E1A1C] px-4 py-3.5 text-sm font-semibold text-white shadow-lg">
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
        <TopicDetail topic={modal.topic} codeById={codeById} onClose={() => setModal(null)} />
      )}
    </div>
  );
}


