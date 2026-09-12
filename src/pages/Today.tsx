import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { todayLocalDate, isDayOpen, closesAtLabel } from "../lib/domain";
import { SESSION_TYPE_COLOR } from "../lib/content";
import { SESSION_TYPES, type Absence, type Cycle, type Day, type Rating, type Resident, type Session, type Topic } from "../types";
import { CoverageModal } from "../components/CoverageModal";
import { DERM_TOPICS } from "../lib/topics";
import { RateModal } from "../components/RateModal";
import { TopicDetail } from "../components/TopicDetail";
import { TopicRow } from "../components/TopicRow";

type TopicWithRatings = Topic & { ratings: Rating[]; absences: Absence[] };
type SessionWithTopics = Session & { topics: TopicWithRatings[] };

export function Today({
  resident,
  active,
  programTimezone,
  onLogout,
  onAbout,
}: {
  resident: Resident;
  active: boolean;
  programTimezone: string;
  onLogout: () => void;
  onAbout: () => void;
}) {
  const date = todayLocalDate();
  const open = isDayOpen(date, programTimezone);

  const [day, setDay] = useState<Day | null>(null);
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [sessions, setSessions] = useState<SessionWithTopics[]>([]);
  const [logger, setLogger] = useState<Resident | null>(null);
  const [codeById, setCodeById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<{ kind: "coverage" | "rate" | "detail" | "delete"; topic: TopicWithRatings } | null>(null);

  const [newSessionType, setNewSessionType] = useState<string>(SESSION_TYPES[0]);
  const [quickTitle, setQuickTitle] = useState("");
  const [showTopicSuggestions, setShowTopicSuggestions] = useState(false);
  const [busy, setBusy] = useState(false);

  // Case-insensitive substring match against the reference topic list, so
  // "the same letter at the start" (or anywhere in the name) surfaces a
  // suggestion regardless of how the resident capitalizes it — this never
  // blocks a custom entry, it's suggestions only. Ranked so the plain term
  // ("Melanoma") outranks longer variants that merely contain it
  // ("Subungual melanoma") — an exact match first, then anything starting
  // with what was typed, then everything else in the list's own order.
  const topicSuggestions = (() => {
    const q = quickTitle.trim().toLowerCase();
    if (!q) return [];
    const rank = (t: string) => {
      const tl = t.toLowerCase();
      if (tl === q) return 0;
      if (tl.startsWith(q)) return 1;
      return 2;
    };
    return DERM_TOPICS.filter((t) => t.toLowerCase().includes(q))
      .map((t, i) => ({ t, i }))
      .sort((a, b) => rank(a.t) - rank(b.t) || a.i - b.i)
      .slice(0, 8)
      .map(({ t }) => t);
  })();
  const [search, setSearch] = useState("");

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2400);
  }

  const load = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);

    const [{ data: cohortRows }, { data: cycleRow }] = await Promise.all([
      supabase
        .from("residents")
        .select("id, resident_code")
        .eq("program_id", resident.program_id)
        .eq("pgy", resident.pgy),
      supabase.from("cycles").select("*").eq("program_id", resident.program_id).eq("pgy", resident.pgy).maybeSingle(),
    ]);
    setCodeById(
      Object.fromEntries(((cohortRows as { id: string; resident_code: string }[] | null) ?? []).map((r) => [r.id, r.resident_code])),
    );
    setCycle((cycleRow as Cycle | null) ?? null);

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

  // Only reachable when someone else already holds the claim — the normal
  // days_update RLS policy only lets the current logger (or nobody) change
  // logger_id, so this goes through a security-definer function instead,
  // capped server-side at 2 uses per day (see emergency_claim_logger).
  async function emergencyClaimLogger() {
    if (!day) return;
    setBusy(true);
    const { error } = await supabase.rpc("emergency_claim_logger", { p_day_id: day.id });
    setBusy(false);
    if (error) return flash(error.message);
    setDay({ ...day, logger_id: resident.id, emergency_claims: day.emergency_claims + 1 });
    setLogger(resident);
    flash("Backup claim used · you're the logger for this day now.");
  }

  async function releaseLogger() {
    if (!day) return;
    const { error } = await supabase.from("days").update({ logger_id: null }).eq("id", day.id);
    if (error) return flash(error.message);
    setDay({ ...day, logger_id: null });
    setLogger(null);
    flash("Released · anyone else can claim it. Nothing you've logged is affected.");
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

  function editTopic(t: TopicWithRatings) {
    setModal({ kind: "coverage", topic: t });
  }

  // Only offered while no one has rated it yet — once a rating exists,
  // deleting the topic would silently discard someone's real input, so at
  // that point the logger has to fix coverage instead of removing it outright.
  // Asks first via the "delete" modal below rather than a native confirm(),
  // which doesn't render reliably in every browser/webview context.
  function confirmDeleteTopic(t: TopicWithRatings) {
    setModal({ kind: "delete", topic: t });
  }

  async function deleteTopic(t: TopicWithRatings) {
    setBusy(true);
    const { error } = await supabase.from("topics").delete().eq("id", t.id);
    setBusy(false);
    if (error) return flash(error.message);
    setSessions((prev) => prev.map((s) => ({ ...s, topics: s.topics.filter((topic) => topic.id !== t.id) })));
    setModal(null);
    flash("Topic deleted.");
  }

  // Once the cohort has moved past Phase 1 (data gathering) into
  // Identification and baseline, new topics no longer get captured — see
  // CycleTab.tsx. Already-registered topics can still be rated/coverage-marked.
  const captureLocked = !!cycle?.phase2_started_at;

  const allTopics = sessions.flatMap((s) => s.topics);
  const needsRating = allTopics.filter(
    (t) =>
      !t.incomplete &&
      t.soc_covered &&
      open &&
      !t.ratings.some((r) => r.resident_id === resident.id) &&
      !t.absences.some((a) => a.resident_id === resident.id),
  );

  if (loading) {
    return <div className="p-8 text-center text-sm text-[#3F4C50]">Loading…</div>;
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
          <div className="text-right">
            <div className="text-[8.5px] font-semibold uppercase tracking-wide text-[#3F4C50]">Home page</div>
            <button onClick={onAbout} className="text-xs font-bold text-[#0E7C72]">
              SoC-TEQ
            </button>
          </div>
          <button onClick={onLogout} className="text-xs font-bold text-[#3F4C50]">
            Log out
          </button>
        </div>
      </div>

      <div className="px-5">
        <div className="mt-2 text-xs text-[#3F4C50]">
          You are <b className="text-[#0E1A1C]">{resident.resident_code}</b> · {open ? `open until ${closesAtLabel(date)}` : "closed"}
        </div>

        {needsRating.length > 0 && (
          <div className="mt-4 rounded-2xl border-2 border-[#93393E] bg-[#F8E4E4] p-4">
            <div className="font-mono text-[10px] font-extrabold uppercase tracking-widest text-[#93393E]">
              Needs your rating
            </div>
            <p className="mt-1 text-[12.5px] font-semibold text-[#93393E]">
              {needsRating.length} topic{needsRating.length === 1 ? "" : "s"} today still need{needsRating.length === 1 ? "s" : ""} your
              rating.
            </p>
            <div className="mt-2.5 flex flex-col gap-1.5">
              {needsRating.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setModal({ kind: "rate", topic: t })}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 text-left"
                >
                  <span className="text-[13.5px] font-bold text-[#0E1A1C]">{t.title}</span>
                  <span className="whitespace-nowrap text-xs font-bold text-[#93393E]">Rate ›</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* logger card */}
        <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm">
          {!day?.logger_id ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-[#0E1A1C]">Logger not claimed</h3>
                  <p className="mt-1 text-[12.5px] text-[#232D30]">
                    One {resident.pgy} resident registers the day's topics and marks SoC coverage. The
                    rest rate.
                  </p>
                </div>
                <span className="whitespace-nowrap rounded-lg bg-[#EAEFEE] px-2 py-1 font-mono text-[10px] font-semibold uppercase text-[#3F4C50]">
                  Open
                </span>
              </div>
              {captureLocked ? (
                <div className="mt-2 text-[11px] text-[#3F4C50]">
                  Topic capture is closed · this cycle has moved past Phase 1 (data gathering).
                </div>
              ) : open ? (
                <button
                  onClick={claimLogger}
                  className="mt-3 w-full rounded-2xl bg-[#0E7C72] py-3 text-sm font-bold text-white"
                >
                  Claim logger
                </button>
              ) : (
                <div className="mt-2 text-[11px] text-[#3F4C50]">This day closed without a logger.</div>
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
                    <div className="text-xs text-[#232D30]">
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
                    className="mt-3 w-full rounded-2xl bg-[#EAEFEE] py-2.5 text-xs font-bold text-[#232D30]"
                  >
                    Release logger · wrong tap, or had to leave
                  </button>
                </>
              )}
              {!iAmLogger && open && (
                <>
                  <div className="mt-3 flex items-center gap-1.5">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#2B5F8A] text-[9px] font-bold text-white">
                      i
                    </span>
                    <span className="text-[12px] font-bold text-[#2B5F8A]">Backup claim</span>
                  </div>
                  <p className="mt-1 text-[10.5px] leading-relaxed text-[#3F4C50]">
                    Takes the logger role from {logger?.full_name ?? "the current logger"}. Use only if they're no
                    longer available and forgot to unclaim, or are unreachable. Can be used up to 2 times per day;{" "}
                    {Math.max(0, 2 - day.emergency_claims)} use{Math.max(0, 2 - day.emergency_claims) === 1 ? "" : "s"}{" "}
                    left today.
                  </p>
                  <button
                    onClick={emergencyClaimLogger}
                    disabled={busy || day.emergency_claims >= 2}
                    className="mt-2 w-full rounded-2xl bg-[#2B5F8A] py-2.5 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {day.emergency_claims >= 2 ? "Backup claim limit reached today" : "Backup claim logger"}
                  </button>
                </>
              )}
            </>
          )}
        </div>

        {/* quick capture */}
        {iAmLogger && open && captureLocked && (
          <div className="mt-4 rounded-2xl bg-white px-4 py-3.5 text-[12.5px] text-[#3F4C50] shadow-sm">
            Topic capture is closed for this cycle · Phase 1 (data gathering) has ended. Existing topics can still
            be rated and marked for coverage. To review, go to Summary and open Cycle.
          </div>
        )}
        {iAmLogger && open && !captureLocked && (
          <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#0E1A1C]">Quick capture</h3>
                <p className="mt-1 text-[12.5px] text-[#232D30]">Name it now, finish it later.</p>
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
            <label className="relative mt-3 block">
              <div className="mb-1.5 text-xs font-bold text-[#0E1A1C]">Topic name</div>
              <input
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                onFocus={() => setShowTopicSuggestions(true)}
                onBlur={() => setTimeout(() => setShowTopicSuggestions(false), 120)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") capture();
                }}
                placeholder="Start typing to search…"
                autoComplete="off"
                className="input"
              />
              {showTopicSuggestions && topicSuggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-2xl bg-white shadow-lg">
                  {topicSuggestions.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setQuickTitle(t);
                        setShowTopicSuggestions(false);
                      }}
                      className="block w-full border-t border-[#E2EAE9] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#232D30] first:border-t-0 active:bg-[#F7FAFA]"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
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
        {sessions.length > 0 && (
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search today's topics…"
            className="input mt-4"
          />
        )}
        <div className="mt-4 flex flex-col gap-3">
          {sessions.length === 0 && (
            <div className="rounded-3xl bg-white p-6 text-center text-sm text-[#3F4C50] shadow-sm">
              Nothing registered for this day yet.
            </div>
          )}
          {sessions
            .map((s) => ({
              ...s,
              topics: search.trim() ? s.topics.filter((t) => t.title.toLowerCase().includes(search.trim().toLowerCase())) : s.topics,
            }))
            .filter((s) => s.topics.length > 0)
            .map((s) => (
              <div key={s.id} className="overflow-hidden rounded-3xl bg-white shadow-sm">
                <div className="flex items-center justify-between px-4 py-3.5">
                  <span className="flex items-center text-[13.5px] font-extrabold text-[#0E1A1C]">
                    <span
                      className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                      style={{ background: SESSION_TYPE_COLOR[s.type] ?? "#3F4C50" }}
                    />
                    {s.type}
                  </span>
                  <span className="whitespace-nowrap rounded-lg bg-[#EAEFEE] px-2 py-1 font-mono text-[10px] font-semibold uppercase text-[#3F4C50]">
                    {s.topics.length} topic{s.topics.length === 1 ? "" : "s"}
                  </span>
                </div>
                {s.topics.map((t) => (
                  <TopicRow
                    key={t.id}
                    topic={t}
                    residentId={resident.id}
                    onOpen={() => openTopic(t)}
                    onEdit={iAmLogger && open && t.ratings.length === 0 ? () => editTopic(t) : undefined}
                    onDelete={iAmLogger && open && t.ratings.length === 0 ? () => confirmDeleteTopic(t) : undefined}
                  />
                ))}
              </div>
            ))}
          {sessions.length > 0 &&
            search.trim() &&
            sessions.every((s) => !s.topics.some((t) => t.title.toLowerCase().includes(search.trim().toLowerCase()))) && (
              <div className="rounded-3xl bg-white p-6 text-center text-sm text-[#3F4C50] shadow-sm">
                No topics match "{search.trim()}".
              </div>
            )}
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
        <TopicDetail topic={modal.topic} codeById={codeById} residentId={resident.id} onClose={() => setModal(null)} />
      )}
      {modal?.kind === "delete" && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full max-w-md rounded-t-3xl bg-[#F2F6F5] p-5 sm:rounded-3xl">
            <h2 className="text-xl font-extrabold tracking-tight text-[#0E1A1C]">Delete this topic?</h2>
            <p className="mt-2 text-sm text-[#232D30]">
              "{modal.topic.title}" will be permanently removed. This can't be undone.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setModal(null)}
                className="flex-1 rounded-2xl bg-[#EAEFEE] py-3 text-sm font-bold text-[#232D30]"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteTopic(modal.topic)}
                disabled={busy}
                className="flex-1 rounded-2xl bg-[#93393E] py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                {busy ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


