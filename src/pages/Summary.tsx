import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  formatDateLong,
  formatDateShort,
  formatMonthLabel,
  isDayOpen,
  isBelowThreshold,
  itemAverages,
  monthlyBrief,
  responseRecord,
  shiftDate,
  shiftMonth,
  summaryStats,
  todayLocalDate,
  type TopicEntry,
} from "../lib/domain";
import { SESSION_TYPE_COLOR, RM_DEFINITION } from "../lib/content";
import { THRESHOLD, type Absence, type Rating, type Resident, type SessionType, type Topic } from "../types";
import { TopicRow } from "../components/TopicRow";
import { TopicDetail } from "../components/TopicDetail";
import { RateModal } from "../components/RateModal";
import { CycleTab } from "./CycleTab";

type TopicFull = Topic & {
  ratings: Rating[];
  absences: Absence[];
  sessions: { id: string; type: SessionType; days: { id: string; date: string; pgy: string } } | null;
};

type Tab = "day" | "week" | "month" | "notes" | "cycle";

export function Summary({ resident, active, onAbout }: { resident: Resident; active: boolean; onAbout: () => void }) {
  const [tab, setTab] = useState<Tab>("day");
  const [rows, setRows] = useState<TopicFull[]>([]);
  const [cohortSize, setCohortSize] = useState(0);
  const [codeById, setCodeById] = useState<Record<string, string>>({});
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

    const [{ data: topicRows, error: topicsError }, { data: cohortRows, count }] = await Promise.all([
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
    ]);
    if (topicsError) flash(topicsError.message);

    setRows((topicRows as TopicFull[] | null) ?? []);
    setCohortSize(count ?? 0);
    setCodeById(
      Object.fromEntries(((cohortRows as { id: string; resident_code: string }[] | null) ?? []).map((r) => [r.id, r.resident_code])),
    );
    setLoading(false);
  }, [resident.program_id, resident.pgy]);

  useEffect(() => {
    load(true);
  }, [load]);

  // See Today.tsx for why this exists — every screen preloads once at
  // login for instant tab switches, so it needs its own silent revalidate
  // whenever it becomes the active tab or it'll show stale data.
  useEffect(() => {
    if (active) load();
  }, [active, load]);

  function openTopic(t: TopicFull) {
    if (t.incomplete || !t.soc_covered || !t.sessions?.days) {
      setModal({ kind: "detail", topic: t });
      return;
    }
    const mine = t.ratings.find((r) => r.resident_id === resident.id);
    const mineAbsent = t.absences.find((a) => a.resident_id === resident.id);
    const open = isDayOpen(t.sessions.days.date);
    if (!mine && !mineAbsent && open) {
      setModal({ kind: "rate", topic: t });
    } else {
      setModal({ kind: "detail", topic: t });
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-sm text-[#5C6B6F]">Loading…</div>;
  }

  const mine = rows.filter((r) => r.sessions?.days);
  const toEntry = (r: TopicFull): TopicEntry => ({
    id: r.id,
    title: r.title,
    socCovered: r.soc_covered,
    date: r.sessions!.days.date,
    sessionType: r.sessions!.type,
    ratings: r.ratings,
    absences: r.absences,
  });

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-24">
      <div className="flex items-start justify-between px-5 pt-6">
        <div>
          <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E7C72]">
            Summary · {resident.pgy}
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#0E1A1C]">Cohort record</h1>
        </div>
        <button onClick={onAbout} className="mt-0.5 text-xs font-bold text-[#0E7C72]">
          SoC-TEQ
        </button>
      </div>

      <div className="px-5">
        <div className="mt-4 flex gap-1.5 rounded-2xl bg-[#E6ECEB] p-1">
          {(["day", "week", "month", "notes", "cycle"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-xl py-2.5 text-[13px] font-bold capitalize ${
                tab === t ? "bg-white text-[#064B45] shadow-sm" : "text-[#5C6B6F]"
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
            />
          )}
          {tab === "notes" && <NotesTab rows={mine} codeById={codeById} onOpenTopic={openTopic} />}
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
        <TopicDetail topic={modal.topic} codeById={codeById} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

function SessionDot({ type }: { type: string }) {
  return (
    <span
      className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
      style={{ background: SESSION_TYPE_COLOR[type] ?? "#5C6B6F" }}
    />
  );
}

type CoverageFilter = "all" | "covered" | "not";

function DayTab({
  rows,
  residentId,
  onOpenTopic,
  filterDate,
  onFilterDateChange,
}: {
  rows: TopicFull[];
  residentId: string;
  onOpenTopic: (t: TopicFull) => void;
  filterDate: string | null;
  onFilterDateChange: (d: string | null) => void;
}) {
  const [coverageFilter, setCoverageFilter] = useState<CoverageFilter>("all");

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
            className="whitespace-nowrap rounded-xl bg-[#EAEFEE] px-3 py-3 text-xs font-bold text-[#2E3A3D]"
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
              coverageFilter === f ? "bg-white text-[#064B45] shadow-sm" : "text-[#5C6B6F]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {days.length === 0 && (
        <div className="rounded-3xl bg-white p-6 text-center text-sm text-[#5C6B6F] shadow-sm">
          {filterDate ? "Nothing logged on that day." : "Nothing logged yet."}
        </div>
      )}

      {days.map(([date, sessMap]) => {
        const topics = [...sessMap.values()].flatMap((s) => s.topics);
        const covered = topics.filter((t) => t.soc_covered);
        const sessions = [...sessMap.entries()]
          .map(([sid, s]) => ({ sid, type: s.type, topics: s.topics.filter(matchesFilter) }))
          .filter((s) => s.topics.length > 0);
        return (
          <div key={date}>
            <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#5C6B6F]">
              {formatDateLong(date)} · {covered.length} SoC topic{covered.length === 1 ? "" : "s"}
              {isDayOpen(date) ? " · open" : ""}
            </div>
            {sessions.length === 0 ? (
              <div className="mt-2 rounded-3xl bg-white p-6 text-center text-sm text-[#5C6B6F] shadow-sm">
                Nothing matches this filter on this day.
              </div>
            ) : (
              <div className="mt-2 flex flex-col gap-3">
                {sessions.map((s) => (
                  <div key={s.sid} className="overflow-hidden rounded-3xl bg-white shadow-sm">
                    <div className="flex items-center justify-between px-4 py-3.5">
                      <span className="flex items-center text-[15.5px] font-extrabold text-[#0E1A1C]">
                        <SessionDot type={s.type} />
                        {s.type}
                      </span>
                      <span className="whitespace-nowrap rounded-lg bg-[#EAEFEE] px-2 py-1 font-mono text-[10px] font-semibold uppercase text-[#5C6B6F]">
                        {s.topics.length} topic{s.topics.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    {s.topics.map((t) => (
                      <TopicRow key={t.id} topic={t} residentId={residentId} onOpen={() => onOpenTopic(t)} />
                    ))}
                  </div>
                ))}
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
}: {
  rows: TopicFull[];
  codeById: Record<string, string>;
  onOpenTopic: (t: TopicFull) => void;
}) {
  const titleKey = (t: string) => t.trim().toLowerCase();
  const groups = new Map<string, TopicFull[]>();
  for (const r of rows) {
    if (!r.soc_covered || !r.ratings.some((rt) => rt.note?.trim())) continue;
    const key = titleKey(r.title);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  const conditions = [...groups.values()]
    .map((instances) => ({
      title: instances[0].title,
      instances: [...instances].sort((a, b) => (a.sessions!.days.date < b.sessions!.days.date ? 1 : -1)),
      noteCount: instances.reduce((n, t) => n + t.ratings.filter((rt) => rt.note?.trim()).length, 0),
    }))
    .sort((a, b) => b.noteCount - a.noteCount);

  if (conditions.length === 0) {
    return (
      <div className="rounded-3xl bg-white p-6 text-center text-sm text-[#5C6B6F] shadow-sm">
        No notes yet. Notes left while rating a topic will collect here by condition.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {conditions.map((c) => (
        <div key={c.title} className="rounded-3xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#0E1A1C]">{c.title}</h3>
            <span className="whitespace-nowrap rounded-lg bg-[#EAEFEE] px-2 py-1 font-mono text-[10px] font-semibold uppercase text-[#5C6B6F]">
              {c.noteCount} note{c.noteCount === 1 ? "" : "s"}
            </span>
          </div>
          {c.instances.map((t) => {
            const notes = t.ratings.filter((rt) => rt.note?.trim());
            if (notes.length === 0) return null;
            return (
              <div key={t.id} className="mt-2.5 border-t border-[#E2EAE9] pt-2.5">
                <button onClick={() => onOpenTopic(t)} className="text-[11px] font-semibold text-[#5C6B6F]">
                  {t.sessions!.type} · {formatDateShort(t.sessions!.days.date)}
                </button>
                {notes.map((rt) => (
                  <div key={rt.id} className="mt-1.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-[#5C6B6F]">
                      {codeById[rt.resident_id] ?? "Resident"}
                    </div>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-[#2E3A3D]">{rt.note}</p>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
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
          className="rounded-xl bg-[#EAEFEE] px-3 py-3 text-sm font-bold text-[#2E3A3D]"
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
          className="rounded-xl bg-[#EAEFEE] px-3 py-3 text-sm font-bold text-[#2E3A3D] disabled:opacity-40"
        >
          ›
        </button>
      </div>

      {!entries.length ? (
        <div className="rounded-3xl bg-white p-6 text-center text-sm text-[#5C6B6F] shadow-sm">
          Nothing logged in this period.
        </div>
      ) : (
        <PeriodContent entries={entries} byId={byId} period={period} label={label} cohortSize={cohortSize} onOpenTopic={onOpenTopic} />
      )}
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
  const brief = period === "month" ? monthlyBrief(entries) : null;
  const [showRmInfo, setShowRmInfo] = useState(false);

  return (
    <>
      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <div className="flex text-center">
          <Stat n={stats.visualCount} label="Visually relevant topics" />
          <Stat n={`${stats.exposurePct}%`} label="Teaching exposure" />
          <div className="flex-1">
            <h2 className={`text-2xl font-extrabold ${stats.avgScore != null && stats.avgScore < THRESHOLD ? "text-[#8F5205]" : "text-[#0E1A1C]"}`}>
              {stats.avgScore ? stats.avgScore.toFixed(2) : "—"}
            </h2>
            <button onClick={() => setShowRmInfo((s) => !s)} className="mt-0.5 flex items-center justify-center gap-1 text-[11px] text-[#5C6B6F]">
              Mean RM
              <span className={`flex h-3 w-3 items-center justify-center rounded-full text-[8px] font-bold ${showRmInfo ? "bg-[#0E7C72] text-white" : "bg-[#DCEFEB] text-[#064B45]"}`}>
                i
              </span>
            </button>
          </div>
        </div>
        {showRmInfo && (
          <div className="mt-3 rounded-xl bg-[#F0F5F4] px-3 py-2.5 text-[11.5px] leading-relaxed text-[#2E3A3D]">
            {RM_DEFINITION}
          </div>
        )}
        <p className="mt-3 text-[12.5px] text-[#2E3A3D]">
          {label} · {stats.coveredCount} of {stats.visualCount} visually relevant topics fully SoC-covered.{" "}
          {stats.gaps.length} flagged below {THRESHOLD}.
        </p>
      </div>

      {perItem && (
        <div className="rounded-3xl bg-white p-4 shadow-sm">
          <h3 className="font-bold text-[#0E1A1C]">Item averages</h3>
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
          <div className="mt-3 flex flex-wrap gap-3 text-[11.5px] text-[#2E3A3D]">
            <Legend color="#0E7C72" label={`Rated ${response.rated}`} />
            <Legend color="#3D6B49" label={`Absent, declared ${response.declared}`} />
            <Legend color="#8F5205" label={`No response ${response.noResponse}`} />
            {response.waiting > 0 && <Legend color="#C9D3D2" label={`Still open ${response.waiting}`} />}
          </div>
          <p className="mt-3 text-[12.5px] text-[#2E3A3D]">Response rate {response.responseRatePct}%.</p>
        </div>
      )}

      {stats.gaps.length > 0 && (
        <div className="rounded-3xl bg-white p-4 shadow-sm">
          <h3 className="font-bold text-[#0E1A1C]">
            Priority educational needs <span className="font-normal text-[#5C6B6F]">· below {THRESHOLD}</span>
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
                  <div className="text-[11.5px] text-[#5C6B6F]">
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

      {brief && <MonthlyBriefCard brief={brief} label={label} />}
    </>
  );
}

function Stat({ n, label, tone }: { n: string | number; label: string; tone?: "teal" | "amber" }) {
  return (
    <div className="flex-1">
      <h2 className={`text-2xl font-extrabold ${tone === "amber" ? "text-[#8F5205]" : "text-[#0E1A1C]"}`}>{n}</h2>
      <div className="mt-0.5 text-[11px] text-[#5C6B6F]">{label}</div>
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

function MonthlyBriefCard({
  brief,
  label,
}: {
  brief: NonNullable<ReturnType<typeof monthlyBrief>>;
  label: string;
}) {
  return (
    <div className="rounded-3xl bg-gradient-to-br from-[#123F3A] to-[#0A2A27] p-5 text-[#DCEEEA]">
      <div className="font-mono text-[9.5px] uppercase tracking-widest text-[#7FC3B9]">Monthly brief · {label}</div>
      <h3 className="mt-2 text-lg font-bold text-white">What to work on next</h3>
      <p className="mt-2 text-[13.5px] text-[#BEDCD6]">
        Across {brief.coveredCount} skin of color topic{brief.coveredCount === 1 ? "" : "s"} this month, your cohort
        scored {brief.weakest.name.toLowerCase()} lowest ({brief.weakestVal.toFixed(2)}) and{" "}
        {brief.strongest.name.toLowerCase()} highest ({brief.strongestVal.toFixed(2)}).
      </p>
      <ul className="mt-2.5 list-disc space-y-1.5 pl-4 text-[13.5px] text-[#D6EBE7]">
        <li>
          {brief.gapTitles.length
            ? `Priority needs: ${brief.gapTitles.join(", ")} — below ${THRESHOLD}.`
            : `No topic fell below ${THRESHOLD} this month.`}
        </li>
        <li>
          Weakest item is {brief.weakest.name.toLowerCase()}. {brief.weakest.statement}
        </li>
        {brief.uncoveredTitles.length > 0 && (
          <li>Visually relevant but not SoC-covered: {brief.uncoveredTitles.join(", ")}.</li>
        )}
      </ul>
      <p className="mt-3.5 text-[11.5px] text-[#DCEEEA]/70">
        Draft example, generated from your data — not AI-written.
      </p>
    </div>
  );
}
