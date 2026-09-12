import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { downloadCsv } from "../lib/csv";
import {
  engagementTrend,
  exclusionSummary,
  formatDateLong,
  formatDateShort,
  formatMonthLabel,
  isDayOpen,
  isBelowThreshold,
  itemAverages,
  monthlyBrief,
  responseRecord,
  scoreTrend,
  shiftDate,
  shiftMonth,
  summaryStats,
  todayLocalDate,
  type EngagementPoint,
  type ScorePoint,
  type TopicEntry,
} from "../lib/domain";
import { SESSION_TYPE_COLOR, RM_DEFINITION } from "../lib/content";
import { FITZPATRICK_TONES, THRESHOLD, type Absence, type Cycle, type Rating, type Resident, type SessionType, type Topic } from "../types";
import { TopicRow } from "../components/TopicRow";
import { TopicDetail } from "../components/TopicDetail";
import { RateModal } from "../components/RateModal";
import { CycleTab } from "./CycleTab";

type TopicFull = Topic & {
  ratings: Rating[];
  absences: Absence[];
  sessions: { id: string; type: SessionType; days: { id: string; date: string; pgy: string } } | null;
};

interface PrivateNoteRow {
  topic_id: string;
  note: string;
  updated_at: string;
}

type Tab = "day" | "week" | "month" | "notes" | "cycle";

function toEntry(r: TopicFull): TopicEntry {
  return {
    id: r.id,
    title: r.title,
    socCovered: r.soc_covered,
    date: r.sessions!.days.date,
    sessionType: r.sessions!.type,
    ratings: r.ratings,
    absences: r.absences,
    nuanceApplicable: r.nuance_applicable,
    mgmtApplicable: r.mgmt_applicable,
  };
}

export function Summary({
  resident,
  active,
  programTimezone,
  onAbout,
}: {
  resident: Resident;
  active: boolean;
  programTimezone: string;
  onAbout: () => void;
}) {
  const [tab, setTab] = useState<Tab>("day");
  const [rows, setRows] = useState<TopicFull[]>([]);
  const [cohortSize, setCohortSize] = useState(0);
  const [codeById, setCodeById] = useState<Record<string, string>>({});
  const [privateNotes, setPrivateNotes] = useState<PrivateNoteRow[]>([]);
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<{ kind: "rate" | "detail"; topic: TopicFull } | null>(null);

  const [dayFilter, setDayFilter] = useState<string | null>(null);
  const [weekAnchor, setWeekAnchor] = useState(todayLocalDate());
  const [monthAnchor, setMonthAnchor] = useState(todayLocalDate().slice(0, 7));

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2400);
  }

  const load = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);

    const [{ data: topicRows, error: topicsError }, { data: cohortRows, count }, { data: noteRows }, { data: cycleRow }] =
      await Promise.all([
        supabase
          .from("topics")
          .select("*, ratings(*), absences(*), sessions(id, type, days(id, date, pgy))")
          .eq("incomplete", false)
          .order("created_at", { ascending: false }),
        supabase
          .from("residents")
          .select("id, resident_code", { count: "exact" })
          .eq("program_id", resident.program_id)
          .eq("pgy", resident.pgy),
        supabase.from("private_notes").select("topic_id, note, updated_at").eq("resident_id", resident.id),
        supabase.from("cycles").select("*").eq("program_id", resident.program_id).eq("pgy", resident.pgy).maybeSingle(),
      ]);
    if (topicsError) flash(topicsError.message);

    setRows((topicRows as TopicFull[] | null) ?? []);
    setCohortSize(count ?? 0);
    setCodeById(
      Object.fromEntries(((cohortRows as { id: string; resident_code: string }[] | null) ?? []).map((r) => [r.id, r.resident_code])),
    );
    setPrivateNotes((noteRows as PrivateNoteRow[] | null) ?? []);
    setCycle((cycleRow as Cycle | null) ?? null);
    setLoading(false);
  }, [resident.program_id, resident.pgy, resident.id]);

  useEffect(() => {
    load(true);
  }, [load]);

  // See Today.tsx for why this exists — every screen preloads once at
  // login for instant tab switches, so it needs its own silent revalidate
  // whenever it becomes the active tab or it'll show stale data.
  useEffect(() => {
    if (active) load();
  }, [active, load]);

  // Once this cycle has moved past Phase 1, no new rating gets added
  // anywhere in the app for the topics gathered during it — not just from
  // Today's own rating banner, but from browsing here too. See Today.tsx.
  const captureLocked = !!cycle?.phase2_started_at;

  function openTopic(t: TopicFull) {
    if (t.incomplete || !t.soc_covered || !t.sessions?.days) {
      setModal({ kind: "detail", topic: t });
      return;
    }
    const mine = t.ratings.find((r) => r.resident_id === resident.id);
    const mineAbsent = t.absences.find((a) => a.resident_id === resident.id);
    const open = isDayOpen(t.sessions.days.date, programTimezone);
    if (!mine && !mineAbsent && open && !captureLocked) {
      setModal({ kind: "rate", topic: t });
    } else {
      setModal({ kind: "detail", topic: t });
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-sm text-[#3F4C50]">Loading…</div>;
  }

  const mine = rows.filter((r) => r.sessions?.days);
  const engagementPoints = engagementTrend(mine.map(toEntry), cohortSize);
  const scorePoints = scoreTrend(mine.map(toEntry));

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-24">
      <div className="flex items-start justify-between px-5 pt-6">
        <div>
          <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E7C72]">
            Summary · {resident.pgy}
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#0E1A1C]">Team record</h1>
        </div>
        <div className="mt-0.5 text-right">
          <div className="text-[8.5px] font-semibold uppercase tracking-wide text-[#3F4C50]">Home page</div>
          <button onClick={onAbout} className="text-xs font-bold text-[#0E7C72]">
            SoC-TEQ
          </button>
        </div>
      </div>

      <div className="px-5">
        <div className="mt-4 flex gap-1.5 rounded-2xl bg-[#E6ECEB] p-1">
          {(["day", "week", "month", "notes", "cycle"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-xl py-2.5 text-[13px] font-bold capitalize ${
                tab === t ? "bg-white text-[#064B45] shadow-sm" : "text-[#3F4C50]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {tab === "day" && (
            <DayTab
              rows={mine}
              residentId={resident.id}
              programTimezone={programTimezone}
              onOpenTopic={openTopic}
              filterDate={dayFilter}
              onFilterDateChange={setDayFilter}
            />
          )}
          {tab === "week" && (
            <PeriodTab
              rows={mine}
              toEntry={toEntry}
              period="week"
              cohortSize={cohortSize}
              onOpenTopic={openTopic}
              weekAnchor={weekAnchor}
              onWeekAnchorChange={setWeekAnchor}
              monthAnchor={monthAnchor}
              onMonthAnchorChange={setMonthAnchor}
              engagementPoints={engagementPoints}
              scorePoints={scorePoints}
            />
          )}
          {tab === "month" && (
            <PeriodTab
              rows={mine}
              toEntry={toEntry}
              period="month"
              cohortSize={cohortSize}
              onOpenTopic={openTopic}
              weekAnchor={weekAnchor}
              onWeekAnchorChange={setWeekAnchor}
              monthAnchor={monthAnchor}
              onMonthAnchorChange={setMonthAnchor}
              engagementPoints={engagementPoints}
              scorePoints={scorePoints}
            />
          )}
          {tab === "notes" && (
            <NotesTab
              rows={mine}
              codeById={codeById}
              onOpenTopic={openTopic}
              privateNotes={privateNotes}
              programTimezone={programTimezone}
            />
          )}
          {tab === "cycle" && <CycleTab resident={resident} />}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-[#0E1A1C] px-4 py-3.5 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}

      {modal?.kind === "rate" && (
        <RateModal
          topic={modal.topic}
          residentId={resident.id}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            flash("Saved.");
            load();
          }}
        />
      )}
      {modal?.kind === "detail" && (
        <TopicDetail topic={modal.topic} codeById={codeById} residentId={resident.id} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

function SessionDot({ type }: { type: string }) {
  return (
    <span
      className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
      style={{ background: SESSION_TYPE_COLOR[type] ?? "#3F4C50" }}
    />
  );
}

type CoverageFilter = "all" | "covered" | "not";

function DayTab({
  rows,
  residentId,
  programTimezone,
  onOpenTopic,
  filterDate,
  onFilterDateChange,
}: {
  rows: TopicFull[];
  residentId: string;
  programTimezone: string;
  onOpenTopic: (t: TopicFull) => void;
  filterDate: string | null;
  onFilterDateChange: (d: string | null) => void;
}) {
  const [coverageFilter, setCoverageFilter] = useState<CoverageFilter>("all");
  const [openSessions, setOpenSessions] = useState<Set<string>>(new Set());
  const [openTones, setOpenTones] = useState<Set<string>>(new Set());
  function toggleTone(key: string) {
    setOpenTones((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }
  function toggleSession(sid: string) {
    setOpenSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });
  }

  const byDate = new Map<string, Map<string, { type: SessionType; topics: TopicFull[] }>>();
  for (const r of rows) {
    const date = r.sessions!.days.date;
    if (!byDate.has(date)) byDate.set(date, new Map());
    const sessMap = byDate.get(date)!;
    const sid = r.sessions!.id;
    if (!sessMap.has(sid)) sessMap.set(sid, { type: r.sessions!.type, topics: [] });
    sessMap.get(sid)!.topics.push(r);
  }
  const allDays = [...byDate.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  const days = filterDate ? allDays.filter(([date]) => date === filterDate) : allDays;

  const matchesFilter = (t: TopicFull) =>
    coverageFilter === "all" || (coverageFilter === "covered" ? t.soc_covered : !t.soc_covered);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 rounded-3xl bg-white p-3 shadow-sm">
        <input
          type="date"
          value={filterDate ?? ""}
          max={todayLocalDate()}
          onChange={(e) => onFilterDateChange(e.target.value || null)}
          className="input flex-1"
        />
        {filterDate && (
          <button
            onClick={() => onFilterDateChange(null)}
            className="whitespace-nowrap rounded-xl bg-[#EAEFEE] px-3 py-3 text-xs font-bold text-[#232D30]"
          >
            Show all
          </button>
        )}
      </div>

      <div className="flex gap-1.5 rounded-2xl bg-[#E6ECEB] p-1">
        {(
          [
            ["all", "All"],
            ["covered", "SoC covered"],
            ["not", "Not covered"],
          ] as [CoverageFilter, string][]
        ).map(([f, label]) => (
          <button
            key={f}
            onClick={() => setCoverageFilter(f)}
            className={`flex-1 rounded-xl py-2 text-[12px] font-bold ${
              coverageFilter === f ? "bg-white text-[#064B45] shadow-sm" : "text-[#3F4C50]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {(() => {
        const inView = days.flatMap(([, sessMap]) => [...sessMap.values()].flatMap((s) => s.topics));
        if (!inView.length) return null;
        const viewStats = summaryStats(inView.map(toEntry));
        const viewExclusions = exclusionSummary(inView.map(toEntry));
        return (
          <div className="rounded-2xl bg-white px-3.5 py-2.5 shadow-sm">
            <p className="text-[11.5px] font-semibold text-[#3F4C50]">
              Teaching exposure: <span className="text-[#0E1A1C]">{viewStats.exposurePct}%</span> of visually relevant
              topics {filterDate ? "on this day" : "logged"} were SoC-covered.
            </p>
            {viewExclusions && viewExclusions.withExclusion > 0 && (
              <p className="mt-1 text-[11px] leading-relaxed text-[#3F4C50]">
                {viewExclusions.withExclusion} of {viewExclusions.covered} covered topic
                {viewExclusions.covered === 1 ? "" : "s"} had Nuance and/or Management marked outside scope.
              </p>
            )}
          </div>
        );
      })()}

      {days.length === 0 && (
        <div className="rounded-3xl bg-white p-6 text-center text-sm text-[#3F4C50] shadow-sm">
          {filterDate ? "Nothing logged on that day." : "Nothing logged yet."}
        </div>
      )}

      {days.map(([date, sessMap]) => {
        const topics = [...sessMap.values()].flatMap((s) => s.topics);
        const covered = topics.filter((t) => t.soc_covered);
        const sessions = [...sessMap.entries()]
          .map(([sid, s]) => ({ sid, type: s.type, topics: s.topics.filter(matchesFilter) }))
          .filter((s) => s.topics.length > 0);

        const sessionTypeCounts = new Map<SessionType, number>();
        for (const s of sessMap.values()) {
          sessionTypeCounts.set(s.type, (sessionTypeCounts.get(s.type) ?? 0) + 1);
        }
        const toneTopics: Record<string, string[]> = Object.fromEntries(FITZPATRICK_TONES.map((t) => [t, []]));
        for (const t of covered) {
          if (!t.skin_type) continue;
          if (t.skin_type === "Mixed across IV–VI") FITZPATRICK_TONES.forEach((tone) => toneTopics[tone].push(t.title));
          else if (t.skin_type in toneTopics) toneTopics[t.skin_type].push(t.title);
        }
        const dayBrief = monthlyBrief(topics.map(toEntry));

        return (
          <div key={date}>
            <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#3F4C50]">
              {date === todayLocalDate() ? "Today, " : ""}
              {formatDateLong(date)} · {covered.length} SoC topic{covered.length === 1 ? "" : "s"}
              {isDayOpen(date, programTimezone) ? " · open" : ""}
            </div>

            {coverageFilter === "all" && (
              <div className="mt-2 rounded-3xl bg-white p-4 shadow-sm">
                <h3 className="font-bold text-[#0E1A1C]">Day snapshot</h3>
                <p className="mt-0.5 text-[11.5px] text-[#3F4C50]">Everything logged and rated on this day.</p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {[...sessionTypeCounts.entries()].map(([type, count]) => (
                    <span
                      key={type}
                      className="flex items-center gap-1.5 rounded-lg bg-[#F5F8F7] px-2.5 py-1.5 text-[12px] font-semibold text-[#232D30]"
                    >
                      <SessionDot type={type} />
                      {count} {type}
                      {count === 1 ? "" : "s"}
                    </span>
                  ))}
                </div>
                <div className="mt-3 border-t border-[#E2EAE9] pt-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-[#3F4C50]">
                    Fitzpatrick tones shown
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    {FITZPATRICK_TONES.map((t) => {
                      const key = `${date}:${t}`;
                      const isOpen = openTones.has(key);
                      const count = toneTopics[t].length;
                      return (
                        <button
                          key={t}
                          onClick={() => count > 0 && toggleTone(key)}
                          disabled={count === 0}
                          className={`flex-1 rounded-lg py-2 text-center font-mono text-[11px] font-semibold transition-colors ${
                            count ? "bg-[#DCEFEB] text-[#064B45]" : "bg-[#EEF1F0] text-[#3F4C50]"
                          } ${isOpen ? "ring-2 ring-[#0E7C72]" : ""}`}
                        >
                          {t.replace("Fitzpatrick ", "")}
                          {count ? ` · ${count}` : ""}
                        </button>
                      );
                    })}
                  </div>
                  {FITZPATRICK_TONES.filter((t) => openTones.has(`${date}:${t}`) && toneTopics[t].length > 0).map((t) => (
                    <div key={t} className="mt-2 rounded-xl bg-[#F5F8F7] px-3 py-2.5 text-[12px] leading-relaxed text-[#232D30]">
                      <span className="font-semibold">{t} shown in:</span>{" "}
                      {toneTopics[t].join(", ")}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {coverageFilter === "all" && dayBrief && (
              <div className="mt-2">
                <BriefCard brief={dayBrief} label={formatDateShort(date)} period="day" />
              </div>
            )}

            {sessions.length === 0 ? (
              <div className="mt-2 rounded-3xl bg-white p-6 text-center text-sm text-[#3F4C50] shadow-sm">
                Nothing matches this filter on this day.
              </div>
            ) : (
              <div className="mt-2 flex flex-col gap-3">
                {sessions.map((s) => {
                  const isOpen = openSessions.has(s.sid);
                  return (
                    <div key={s.sid} className="overflow-hidden rounded-3xl bg-white shadow-sm">
                      <button
                        onClick={() => toggleSession(s.sid)}
                        className="flex w-full items-center justify-between gap-2 px-4 py-3.5"
                      >
                        <span className="flex items-center text-[13.5px] font-extrabold text-[#0E1A1C]">
                          <SessionDot type={s.type} />
                          {s.type}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="whitespace-nowrap rounded-lg bg-[#EAEFEE] px-2 py-1 font-mono text-[10px] font-semibold uppercase text-[#3F4C50]">
                            {s.topics.length} topic{s.topics.length === 1 ? "" : "s"}
                          </span>
                          <span className={`text-xl font-extrabold text-[#3F4C50] transition-transform ${isOpen ? "rotate-180" : ""}`}>
                            ▾
                          </span>
                        </span>
                      </button>
                      {isOpen &&
                        s.topics.map((t) => (
                          <TopicRow key={t.id} topic={t} residentId={residentId} onOpen={() => onOpenTopic(t)} showSkinType />
                        ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Every note a resident has left, grouped by condition (across every
// session it's ever come up in) rather than buried inside each topic's own
// detail view — a resident preparing to teach or claim a remediation topic
// can see everything anyone said about it in one place.
function NotesTab({
  rows,
  codeById,
  onOpenTopic,
  privateNotes,
  programTimezone,
}: {
  rows: TopicFull[];
  codeById: Record<string, string>;
  onOpenTopic: (t: TopicFull) => void;
  privateNotes: PrivateNoteRow[];
  programTimezone: string;
}) {
  const [view, setView] = useState<"picker" | "private" | "public">("picker");

  const privateCount = privateNotes.filter((n) => n.note.trim()).length;
  const publicCount = rows.reduce(
    (n, r) => n + (r.soc_covered ? r.ratings.filter((rt) => rt.note?.trim()).length : 0),
    0,
  );

  if (view === "private") {
    return <PrivateNotesBrowser rows={rows} privateNotes={privateNotes} onOpenTopic={onOpenTopic} onBack={() => setView("picker")} />;
  }
  if (view === "public") {
    return <PublicNotesBrowser rows={rows} codeById={codeById} onOpenTopic={onOpenTopic} onBack={() => setView("picker")} />;
  }

  // Exports only include days that have fully closed (past their program's
  // 4am cutoff) — a day still open can still be edited by the logger or
  // rated by residents, so exporting it risks a snapshot that's already
  // stale by the time someone opens the file.
  const dayClosed = (date: string) => !isDayOpen(date, programTimezone);

  function exportPrivateNotesCsv() {
    const topicById = new Map(rows.map((r) => [r.id, r]));
    const header = ["date", "session", "topic", "note", "updated_at"];
    const dataRows = privateNotes
      .filter((n) => n.note.trim())
      .map((n) => ({ n, topic: topicById.get(n.topic_id) }))
      .filter(({ topic }) => topic?.sessions?.days.date && dayClosed(topic.sessions.days.date))
      .map(({ n, topic }) => [topic!.sessions!.days.date, topic!.sessions!.type, topic!.title, n.note, n.updated_at]);
    downloadCsv(`soc-teq_private-notes_${new Date().toISOString().slice(0, 10)}.csv`, [header, ...dataRows]);
  }

  function exportPublicNotesCsv() {
    const header = ["date", "session", "topic", "resident_code", "note"];
    const dataRows = rows
      .filter((r) => r.soc_covered && r.sessions?.days.date && dayClosed(r.sessions.days.date))
      .flatMap((r) =>
        r.ratings
          .filter((rt) => rt.note?.trim())
          .map((rt) => [r.sessions!.days.date, r.sessions!.type, r.title, codeById[rt.resident_id] ?? "Resident", rt.note ?? ""]),
      );
    downloadCsv(`soc-teq_public-notes_${new Date().toISOString().slice(0, 10)}.csv`, [header, ...dataRows]);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <button onClick={() => setView("private")} className="w-full text-left">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#0E1A1C]">My private notes</h3>
            <span className="whitespace-nowrap rounded-lg bg-[#EEE7F3] px-2 py-1 font-mono text-[10px] font-semibold uppercase text-[#5E3F73]">
              {privateCount}
            </span>
          </div>
          <p className="mt-1 text-[12.5px] text-[#3F4C50]">Only visible to you.</p>
        </button>
        <button onClick={exportPrivateNotesCsv} className="mt-2.5 text-xs font-bold text-[#064B45]">
          Export private notes (CSV)
        </button>
      </div>
      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <button onClick={() => setView("public")} className="w-full text-left">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#0E1A1C]">Public group notes</h3>
            <span className="whitespace-nowrap rounded-lg bg-[#DCEFEB] px-2 py-1 font-mono text-[10px] font-semibold uppercase text-[#064B45]">
              {publicCount}
            </span>
          </div>
          <p className="mt-1 text-[12.5px] text-[#3F4C50]">Left while rating · visible to your whole group.</p>
        </button>
        <button onClick={exportPublicNotesCsv} className="mt-2.5 text-xs font-bold text-[#064B45]">
          Export public notes (CSV)
        </button>
      </div>
    </div>
  );
}

// Shared browsing shell for both note views: back button, search, and a
// collapsible "topics mentioned" list that filters the notes below it to
// one topic. The actual note list is supplied by the caller as children,
// since private/public notes have different shapes and can't share a
// render function without losing type safety.
function NotesBrowserShell({
  onBack,
  search,
  onSearchChange,
  topics,
  selectedTitle,
  onSelectTitle,
  children,
}: {
  onBack: () => void;
  search: string;
  onSearchChange: (v: string) => void;
  topics: { title: string; count: number }[];
  selectedTitle: string | null;
  onSelectTitle: (t: string | null) => void;
  children: React.ReactNode;
}) {
  const [showTopicList, setShowTopicList] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <button onClick={onBack} className="text-left text-sm font-bold text-[#0E7C72]">
        ‹ Back
      </button>

      <input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search notes or topics…"
        className="input"
      />

      <div className="rounded-2xl bg-white shadow-sm">
        <button onClick={() => setShowTopicList((s) => !s)} className="flex w-full items-center justify-between gap-2 px-4 py-3">
          <span className="text-[13px] font-bold text-[#0E1A1C]">
            Topics mentioned{selectedTitle ? ` · ${selectedTitle}` : ""}
          </span>
          <span className={`text-lg font-extrabold text-[#3F4C50] transition-transform ${showTopicList ? "rotate-180" : ""}`}>
            ▾
          </span>
        </button>
        {showTopicList && (
          <div className="flex flex-col gap-1 px-4 pb-3">
            <button
              onClick={() => {
                onSelectTitle(null);
                setShowTopicList(false);
              }}
              className={`rounded-xl px-3 py-2 text-left text-[13px] font-semibold ${
                !selectedTitle ? "bg-[#DCEFEB] text-[#064B45]" : "text-[#232D30]"
              }`}
            >
              All topics
            </button>
            {topics.map((t) => (
              <button
                key={t.title}
                onClick={() => {
                  onSelectTitle(t.title);
                  setShowTopicList(false);
                }}
                className={`flex items-center justify-between rounded-xl px-3 py-2 text-left text-[13px] font-semibold ${
                  selectedTitle === t.title ? "bg-[#DCEFEB] text-[#064B45]" : "text-[#232D30]"
                }`}
              >
                <span>{t.title}</span>
                <span className="font-mono text-[10px] text-[#3F4C50]">{t.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {children}
    </div>
  );
}

function PrivateNotesBrowser({
  rows,
  privateNotes,
  onOpenTopic,
  onBack,
}: {
  rows: TopicFull[];
  privateNotes: PrivateNoteRow[];
  onOpenTopic: (t: TopicFull) => void;
  onBack: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const titleKey = (t: string) => t.trim().toLowerCase();
  const topicById = new Map(rows.map((r) => [r.id, r]));

  const groups = (() => {
    const m = new Map<string, { topic: TopicFull; note: PrivateNoteRow }[]>();
    for (const n of privateNotes) {
      const topic = topicById.get(n.topic_id);
      if (!topic || !n.note.trim()) continue;
      const key = titleKey(topic.title);
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push({ topic, note: n });
    }
    return [...m.values()]
      .map((entries) => ({
        title: entries[0].topic.title,
        entries: [...entries].sort((a, b) => (a.note.updated_at < b.note.updated_at ? 1 : -1)),
      }))
      .sort((a, b) => b.entries.length - a.entries.length);
  })();

  const q = search.trim().toLowerCase();
  const filtered = groups
    .filter((g) => !selectedTitle || g.title === selectedTitle)
    .map((g) => ({
      ...g,
      entries: g.entries.filter((e) => !q || g.title.toLowerCase().includes(q) || e.note.note.toLowerCase().includes(q)),
    }))
    .filter((g) => g.entries.length > 0);

  return (
    <NotesBrowserShell
      onBack={onBack}
      search={search}
      onSearchChange={setSearch}
      topics={groups.map((g) => ({ title: g.title, count: g.entries.length }))}
      selectedTitle={selectedTitle}
      onSelectTitle={setSelectedTitle}
    >
      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-white p-6 text-center text-sm text-[#3F4C50] shadow-sm">
          {privateNotes.length === 0 ? "No private notes yet." : "No notes match."}
        </div>
      ) : (
        filtered.map((g) => (
          <div key={g.title} className="rounded-3xl bg-white p-4 shadow-sm">
            <h3 className="font-bold text-[#0E1A1C]">{g.title}</h3>
            {g.entries.map((e) => (
              <div key={e.note.topic_id} className="mt-2.5 border-t border-[#E2EAE9] pt-2.5">
                <button onClick={() => onOpenTopic(e.topic)} className="text-[11px] font-semibold text-[#3F4C50]">
                  {e.topic.sessions!.type} · {formatDateShort(e.topic.sessions!.days.date)}
                </button>
                <p className="mt-1 text-[13px] leading-relaxed text-[#232D30]">{e.note.note}</p>
              </div>
            ))}
          </div>
        ))
      )}
    </NotesBrowserShell>
  );
}

function PublicNotesBrowser({
  rows,
  codeById,
  onOpenTopic,
  onBack,
}: {
  rows: TopicFull[];
  codeById: Record<string, string>;
  onOpenTopic: (t: TopicFull) => void;
  onBack: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const titleKey = (t: string) => t.trim().toLowerCase();
  const noteCountOf = (t: TopicFull) => t.ratings.filter((rt) => rt.note?.trim()).length;

  const groups = (() => {
    const m = new Map<string, TopicFull[]>();
    for (const r of rows) {
      if (!r.soc_covered || !r.ratings.some((rt) => rt.note?.trim())) continue;
      const key = titleKey(r.title);
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(r);
    }
    return [...m.values()]
      .map((instances) => ({
        title: instances[0].title,
        instances: [...instances].sort((a, b) => (a.sessions!.days.date < b.sessions!.days.date ? 1 : -1)),
      }))
      .sort((a, b) => b.instances.reduce((n, t) => n + noteCountOf(t), 0) - a.instances.reduce((n, t) => n + noteCountOf(t), 0));
  })();

  const q = search.trim().toLowerCase();
  const filtered = groups
    .filter((g) => !selectedTitle || g.title === selectedTitle)
    .map((g) => ({
      ...g,
      instances: g.instances.filter(
        (t) => !q || g.title.toLowerCase().includes(q) || t.ratings.some((rt) => rt.note?.toLowerCase().includes(q)),
      ),
    }))
    .filter((g) => g.instances.length > 0);

  return (
    <NotesBrowserShell
      onBack={onBack}
      search={search}
      onSearchChange={setSearch}
      topics={groups.map((g) => ({ title: g.title, count: g.instances.reduce((n, t) => n + noteCountOf(t), 0) }))}
      selectedTitle={selectedTitle}
      onSelectTitle={setSelectedTitle}
    >
      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-white p-6 text-center text-sm text-[#3F4C50] shadow-sm">
          {groups.length === 0 ? "No notes yet. Notes left while rating a topic will collect here." : "No notes match."}
        </div>
      ) : (
        filtered.map((g) => (
          <div key={g.title} className="rounded-3xl bg-white p-4 shadow-sm">
            <h3 className="font-bold text-[#0E1A1C]">{g.title}</h3>
            {g.instances.map((t) => {
              const notes = t.ratings.filter((rt) => rt.note?.trim());
              if (notes.length === 0) return null;
              return (
                <div key={t.id} className="mt-2.5 border-t border-[#E2EAE9] pt-2.5">
                  <button onClick={() => onOpenTopic(t)} className="text-[11px] font-semibold text-[#3F4C50]">
                    {t.sessions!.type} · {formatDateShort(t.sessions!.days.date)}
                  </button>
                  {notes.map((rt) => (
                    <div key={rt.id} className="mt-1.5">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-[#3F4C50]">
                        {codeById[rt.resident_id] ?? "Resident"}
                      </div>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-[#232D30]">{rt.note}</p>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))
      )}
    </NotesBrowserShell>
  );
}

function PeriodTab({
  rows,
  toEntry,
  period,
  cohortSize,
  onOpenTopic,
  weekAnchor,
  onWeekAnchorChange,
  monthAnchor,
  onMonthAnchorChange,
  engagementPoints,
  scorePoints,
}: {
  rows: TopicFull[];
  toEntry: (r: TopicFull) => TopicEntry;
  period: "week" | "month";
  cohortSize: number;
  onOpenTopic: (t: TopicFull) => void;
  weekAnchor: string;
  onWeekAnchorChange: (d: string) => void;
  monthAnchor: string;
  onMonthAnchorChange: (m: string) => void;
  engagementPoints?: EngagementPoint[];
  scorePoints?: ScorePoint[];
}) {
  const today = todayLocalDate();
  const rangeStart = period === "week" ? shiftDate(weekAnchor, -6) : monthAnchor + "-01";
  const rangeEndExclusive = period === "week" ? shiftDate(weekAnchor, 1) : shiftMonth(monthAnchor, 1) + "-01";
  const label = period === "week" ? `${formatDateShort(rangeStart)} – ${formatDateShort(weekAnchor)}` : formatMonthLabel(monthAnchor);

  const inRange = rows.filter((r) => {
    const d = r.sessions!.days.date;
    return d >= rangeStart && d < rangeEndExclusive;
  });
  const entries = inRange.map(toEntry);
  const byId = new Map(inRange.map((r) => [r.id, r]));

  const atPresent = period === "week" ? weekAnchor >= today : monthAnchor >= today.slice(0, 7);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-3xl bg-white p-3 shadow-sm">
        <button
          onClick={() =>
            period === "week" ? onWeekAnchorChange(shiftDate(weekAnchor, -7)) : onMonthAnchorChange(shiftMonth(monthAnchor, -1))
          }
          className="rounded-xl bg-[#EAEFEE] px-3 py-3 text-sm font-bold text-[#232D30]"
        >
          ‹
        </button>
        {period === "week" ? (
          <input
            type="date"
            value={weekAnchor}
            max={today}
            onChange={(e) => onWeekAnchorChange(e.target.value || today)}
            className="input flex-1"
          />
        ) : (
          <input
            type="month"
            value={monthAnchor}
            max={today.slice(0, 7)}
            onChange={(e) => onMonthAnchorChange(e.target.value || today.slice(0, 7))}
            className="input flex-1"
          />
        )}
        <button
          onClick={() =>
            period === "week" ? onWeekAnchorChange(shiftDate(weekAnchor, 7)) : onMonthAnchorChange(shiftMonth(monthAnchor, 1))
          }
          disabled={atPresent}
          className="rounded-xl bg-[#EAEFEE] px-3 py-3 text-sm font-bold text-[#232D30] disabled:opacity-40"
        >
          ›
        </button>
      </div>

      {scorePoints && <ScoreTrendCard points={scorePoints} />}
      {engagementPoints && <EngagementTrendCard points={engagementPoints} />}

      {!entries.length ? (
        <div className="rounded-3xl bg-white p-6 text-center text-sm text-[#3F4C50] shadow-sm">
          Nothing logged in this period.
        </div>
      ) : (
        <PeriodContent entries={entries} byId={byId} period={period} label={label} cohortSize={cohortSize} onOpenTopic={onOpenTopic} />
      )}
    </div>
  );
}

// The score-side counterpart to EngagementTrendCard below — same visual
// language (weekly bars, current week dimmed) but tracking mean RM instead
// of response rate, so a resident can see teaching quality trending over
// time rather than just one period's snapshot number.
function ScoreTrendCard({ points }: { points: ScorePoint[] }) {
  const scored = points.filter((p) => p.mean != null);
  const latest = scored[scored.length - 1];
  const previous = scored[scored.length - 2];
  const delta = latest && previous ? latest.mean! - previous.mean! : 0;
  const trendWord = !previous || Math.abs(delta) < 0.005 ? "holding steady" : delta > 0 ? "rising" : "falling";
  const trendColor = delta > 0.005 ? "#0E7C72" : delta < -0.005 ? "#8F5205" : "#3F4C50";
  const weekLabel = (d: string) => new Date(d + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" });

  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-[#0E1A1C]">Score trend</h3>
          <p className="mt-0.5 text-[11.5px] text-[#3F4C50]">Mean RM, last 8 weeks</p>
        </div>
        <div className="text-right">
          <div className="font-mono text-2xl font-extrabold text-[#0E1A1C]">{latest ? latest.mean!.toFixed(2) : "—"}</div>
          {latest && previous && (
            <div className="text-[11px] font-semibold" style={{ color: trendColor }}>
              {delta > 0.005 ? "▲" : delta < -0.005 ? "▼" : "–"} {Math.abs(delta).toFixed(2)} · {trendWord}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-end gap-1.5" style={{ height: 64 }}>
        {points.map((p) => (
          <div
            key={p.weekStart}
            className={`flex-1 rounded-t-md ${
              p.mean == null ? "bg-[#EAEFEE]" : p.mean < THRESHOLD ? "bg-[#8F5205]" : p.current ? "bg-[#0E7C72]/45" : "bg-[#0E7C72]"
            }`}
            style={{ height: `${p.mean == null ? 4 : Math.max(4, (p.mean / 5) * 64)}px` }}
          />
        ))}
      </div>
      <div className="mt-1 flex gap-1.5">
        {points.map((p, i) => (
          <div key={p.weekStart} className="flex-1 text-center font-mono text-[9px] text-[#3F4C50]">
            {i % 2 === 0 ? weekLabel(p.weekStart) : ""}
          </div>
        ))}
      </div>

      <p className="mt-3.5 text-[11.5px] leading-relaxed text-[#3F4C50]">
        Amber bars are weeks that averaged below {THRESHOLD}. Gray means nothing was rated that week.
      </p>
    </div>
  );
}

// A self-facing mirror on the cohort's own participation over time — never
// shown to faculty or a program lead, and framed that way explicitly, so it
// reads as an incentive for residents' own benefit rather than a metric
// someone else is watching.
function EngagementTrendCard({ points }: { points: EngagementPoint[] }) {
  const latest = points[points.length - 1];
  const previous = points[points.length - 2];
  const delta = previous ? latest.pct - previous.pct : 0;
  const trendWord = !previous || delta === 0 ? "holding steady" : delta > 0 ? "rising" : "falling";
  const trendColor = delta > 0 ? "#0E7C72" : delta < 0 ? "#8F5205" : "#3F4C50";
  const weekLabel = (d: string) => new Date(d + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" });

  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-[#0E1A1C]">Your engagement over time</h3>
          <p className="mt-0.5 text-[11.5px] text-[#3F4C50]">Response rate, last 8 weeks</p>
        </div>
        <div className="text-right">
          <div className="font-mono text-2xl font-extrabold text-[#0E1A1C]">{latest.pct}%</div>
          {previous && (
            <div className="text-[11px] font-semibold" style={{ color: trendColor }}>
              {delta > 0 ? "▲" : delta < 0 ? "▼" : "–"} {Math.abs(delta)}% · {trendWord}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-end gap-1.5" style={{ height: 64 }}>
        {points.map((p) => (
          <div
            key={p.weekStart}
            className={`flex-1 rounded-t-md ${p.current ? "bg-[#0E7C72]/45" : "bg-[#0E7C72]"}`}
            style={{ height: `${Math.max(4, (p.pct / 100) * 64)}px` }}
          />
        ))}
      </div>
      <div className="mt-1 flex gap-1.5">
        {points.map((p, i) => (
          <div key={p.weekStart} className="flex-1 text-center font-mono text-[9px] text-[#3F4C50]">
            {i % 2 === 0 ? weekLabel(p.weekStart) : ""}
          </div>
        ))}
      </div>

      <p className="mt-3.5 rounded-xl bg-[#F0F5F4] px-3 py-2.5 text-[11.5px] leading-relaxed text-[#232D30]">
        This is visible only within your PGY year, never to faculty. It might feel like one more thing to check,
        but think of it as a mirror on your own training: closing these gaps benefits you directly, and you're the
        one with the power to do it.
      </p>
    </div>
  );
}

function PeriodContent({
  entries,
  byId,
  period,
  label,
  cohortSize,
  onOpenTopic,
}: {
  entries: TopicEntry[];
  byId: Map<string, TopicFull>;
  period: "week" | "month";
  label: string;
  cohortSize: number;
  onOpenTopic: (t: TopicFull) => void;
}) {
  const stats = summaryStats(entries);
  const response = responseRecord(entries, cohortSize);
  const perItem = itemAverages(entries);
  const brief = monthlyBrief(entries);
  const exclusions = exclusionSummary(entries);
  const [showRmInfo, setShowRmInfo] = useState(false);

  return (
    <>
      <div>
        <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E7C72]">
          {period === "week" ? "Weekly summary" : "Monthly summary"}
        </div>
        <p className="mt-1 text-[12px] text-[#3F4C50]">
          Everything logged and rated across this {period} as a whole, not broken out by individual day.
        </p>
      </div>

      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <div className="flex text-center">
          <Stat n={stats.visualCount} label="Visually relevant topics" />
          <Stat n={`${stats.exposurePct}%`} label="Teaching exposure" />
          <div className="flex-1">
            <h2 className={`text-2xl font-extrabold ${stats.avgScore != null && stats.avgScore < THRESHOLD ? "text-[#8F5205]" : "text-[#0E1A1C]"}`}>
              {stats.avgScore ? stats.avgScore.toFixed(2) : "—"}
            </h2>
            <button onClick={() => setShowRmInfo((s) => !s)} className="mt-0.5 flex items-center justify-center gap-1 text-[11px] text-[#3F4C50]">
              Mean RM
              <span className={`flex h-3 w-3 items-center justify-center rounded-full text-[8px] font-bold ${showRmInfo ? "bg-[#0E7C72] text-white" : "bg-[#DCEFEB] text-[#064B45]"}`}>
                i
              </span>
            </button>
          </div>
        </div>
        {showRmInfo && (
          <div className="mt-3 rounded-xl bg-[#F0F5F4] px-3 py-2.5 text-[11.5px] leading-relaxed text-[#232D30]">
            {RM_DEFINITION}
          </div>
        )}
        <p className="mt-3 text-[12.5px] text-[#232D30]">
          {label} · {stats.coveredCount} of {stats.visualCount} visually relevant topics fully SoC-covered.{" "}
          {stats.gaps.length} flagged below {THRESHOLD}.
        </p>
        {exclusions && exclusions.withExclusion > 0 && (
          <p className="mt-1.5 text-[11px] leading-relaxed text-[#3F4C50]">
            {exclusions.withExclusion} of {exclusions.covered} covered topic{exclusions.covered === 1 ? "" : "s"} had Nuance
            and/or Management marked outside scope, so the average above isn't a like-for-like 5-domain mean across every
            topic.
          </p>
        )}
      </div>

      {perItem && (
        <div className="rounded-3xl bg-white p-4 shadow-sm">
          <h3 className="font-bold text-[#0E1A1C]">Team item averages</h3>
          <p className="mt-0.5 text-[11.5px] text-[#3F4C50]">Mean across every resident's rating this period, not an individual score.</p>
          {Object.entries(perItem).map(([k, v]) => (
            <div key={k} className="mt-2.5">
              <div className="flex justify-between text-[12.5px] font-semibold">
                <span className="capitalize">{k}</span>
                <span className="font-mono">{v.toFixed(2)}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#EAEFEE]">
                <div
                  className={`h-full rounded-full ${v < THRESHOLD ? "bg-[#8F5205]" : "bg-[#0E7C72]"}`}
                  style={{ width: `${(v / 5) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {response.total > 0 && (
        <div className="rounded-3xl bg-white p-4 shadow-sm">
          <h3 className="font-bold text-[#0E1A1C]">Response record</h3>
          <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-[#EAEFEE]">
            {response.rated > 0 && <div style={{ width: `${(response.rated / response.total) * 100}%` }} className="bg-[#0E7C72]" />}
            {response.declared > 0 && <div style={{ width: `${(response.declared / response.total) * 100}%` }} className="bg-[#3D6B49]" />}
            {response.noResponse > 0 && <div style={{ width: `${(response.noResponse / response.total) * 100}%` }} className="bg-[#8F5205]" />}
            {response.waiting > 0 && <div style={{ width: `${(response.waiting / response.total) * 100}%` }} className="bg-[#C9D3D2]" />}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-[11.5px] text-[#232D30]">
            <Legend color="#0E7C72" label={`Rated ${response.rated}`} />
            <Legend color="#3D6B49" label={`Absent, declared ${response.declared}`} />
            <Legend color="#8F5205" label={`Forgot to rate ${response.noResponse}`} />
            {response.waiting > 0 && <Legend color="#C9D3D2" label={`Still open ${response.waiting}`} />}
          </div>
          <p className="mt-3 text-[12.5px] text-[#232D30]">Response rate {response.responseRatePct}%.</p>
        </div>
      )}

      {stats.gaps.length > 0 && (
        <div className="rounded-3xl bg-white p-4 shadow-sm">
          <h3 className="font-bold text-[#0E1A1C]">
            Priority educational needs <span className="font-normal text-[#3F4C50]">· below {THRESHOLD}</span>
          </h3>
          {stats.gaps.map(({ entry, score }) => {
            const full = byId.get(entry.id);
            return (
              <button
                key={entry.id}
                onClick={() => full && onOpenTopic(full)}
                className="flex w-full items-center justify-between gap-3 border-t border-[#E2EAE9] py-3 text-left"
              >
                <div>
                  <div className="text-[14px] font-bold text-[#0E1A1C]">{entry.title}</div>
                  <div className="text-[11.5px] text-[#3F4C50]">
                    {entry.sessionType} · {formatDateShort(entry.date)}
                  </div>
                </div>
                <span
                  className={`whitespace-nowrap rounded-lg px-2 py-1 font-mono text-[10px] font-semibold uppercase ${
                    isBelowThreshold(score.overall) ? "bg-[#FAEBD4] text-[#8F5205]" : "bg-[#DCEFEB] text-[#064B45]"
                  }`}
                >
                  {score.overall.toFixed(2)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {brief && <BriefCard brief={brief} label={label} period={period} />}
    </>
  );
}

function Stat({ n, label, tone }: { n: string | number; label: string; tone?: "teal" | "amber" }) {
  return (
    <div className="flex-1">
      <h2 className={`text-2xl font-extrabold ${tone === "amber" ? "text-[#8F5205]" : "text-[#0E1A1C]"}`}>{n}</h2>
      <div className="mt-0.5 text-[11px] text-[#3F4C50]">{label}</div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}

function BriefCard({
  brief,
  label,
  period,
}: {
  brief: NonNullable<ReturnType<typeof monthlyBrief>>;
  label: string;
  period: "day" | "week" | "month";
}) {
  const periodLabel = period === "day" ? "Daily brief" : period === "week" ? "Weekly brief" : "Monthly brief";
  const periodWord = period === "day" ? "today" : period === "week" ? "this week" : "this month";
  return (
    <div className="rounded-3xl bg-gradient-to-br from-[#123F3A] to-[#0A2A27] p-5 text-[#DCEEEA]">
      <div className="font-mono text-[9.5px] uppercase tracking-widest text-[#7FC3B9]">
        {periodLabel} · {label}
      </div>
      <h3 className="mt-2 text-lg font-bold text-white">What to work on next</h3>
      <p className="mt-2 text-[13.5px] text-[#BEDCD6]">
        Across {brief.coveredCount} skin of color topic{brief.coveredCount === 1 ? "" : "s"} {periodWord}, your group
        scored {brief.weakest.name.toLowerCase()} lowest ({brief.weakestVal.toFixed(2)}) and{" "}
        {brief.strongest.name.toLowerCase()} highest ({brief.strongestVal.toFixed(2)}).
      </p>
      <ul className="mt-2.5 list-disc space-y-1.5 pl-4 text-[13.5px] text-[#D6EBE7]">
        <li>
          {brief.gapTitles.length
            ? `Priority needs: ${brief.gapTitles.join(", ")}, below ${THRESHOLD}.`
            : `No topic fell below ${THRESHOLD} ${periodWord}.`}
        </li>
        <li>
          Weakest item is {brief.weakest.name.toLowerCase()}. {brief.weakest.statement}
        </li>
        {brief.uncoveredTitles.length > 0 && (
          <li>Visually relevant but not SoC-covered: {brief.uncoveredTitles.join(", ")}.</li>
        )}
      </ul>
      <p className="mt-3.5 text-[11.5px] text-[#DCEEEA]/70">Generated from your data.</p>
    </div>
  );
}
