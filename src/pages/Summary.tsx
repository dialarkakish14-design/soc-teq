import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  dayBack,
  formatDateLong,
  formatDateShort,
  isDayOpen,
  isBelowThreshold,
  itemAverages,
  monthlyBrief,
  responseRecord,
  summaryStats,
  todayLocalDate,
  type TopicEntry,
} from "../lib/domain";
import { THRESHOLD, type Absence, type Rating, type Resident, type SessionType, type Topic } from "../types";
import { TopicRow } from "../components/TopicRow";
import { TopicDetail } from "../components/TopicDetail";
import { RateModal } from "../components/RateModal";

type TopicFull = Topic & {
  ratings: Rating[];
  absences: Absence[];
  sessions: { id: string; type: SessionType; days: { id: string; date: string; pgy: string } } | null;
};

type Tab = "day" | "week" | "month";

export function Summary({ resident }: { resident: Resident }) {
  const [tab, setTab] = useState<Tab>("day");
  const [rows, setRows] = useState<TopicFull[]>([]);
  const [cohortSize, setCohortSize] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<{ kind: "rate" | "detail"; topic: TopicFull } | null>(null);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2400);
  }

  const load = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);

    const [{ data: topicRows, error: topicsError }, { count }] = await Promise.all([
      supabase
        .from("topics")
        .select("*, ratings(*), absences(*), sessions(id, type, days(id, date, pgy))")
        .eq("incomplete", false)
        .order("created_at", { ascending: false }),
      supabase
        .from("residents")
        .select("id", { count: "exact", head: true })
        .eq("program_id", resident.program_id)
        .eq("pgy", resident.pgy),
    ]);
    if (topicsError) flash(topicsError.message);

    setRows((topicRows as TopicFull[] | null) ?? []);
    setCohortSize(count ?? 0);
    setLoading(false);
  }, [resident.program_id, resident.pgy]);

  useEffect(() => {
    load(true);
  }, [load]);

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
    return <div className="p-8 text-center text-sm text-[#8A999D]">Loading…</div>;
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
      <div className="px-5 pt-6">
        <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E7C72]">
          Summary · {resident.pgy}
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#0E1A1C]">Cohort record</h1>

        <div className="mt-4 flex gap-1.5 rounded-2xl bg-[#E6ECEB] p-1">
          {(["day", "week", "month"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-xl py-2.5 text-[13px] font-bold capitalize ${
                tab === t ? "bg-white text-[#064B45] shadow-sm" : "text-[#8A999D]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {tab === "day" && (
            <DayTab rows={mine} residentId={resident.id} onOpenTopic={openTopic} />
          )}
          {(tab === "week" || tab === "month") && (
            <PeriodTab
              rows={mine}
              toEntry={toEntry}
              period={tab}
              cohortSize={cohortSize}
              onOpenTopic={openTopic}
            />
          )}
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
      {modal?.kind === "detail" && <TopicDetail topic={modal.topic} onClose={() => setModal(null)} />}
    </div>
  );
}

function DayTab({
  rows,
  residentId,
  onOpenTopic,
}: {
  rows: TopicFull[];
  residentId: string;
  onOpenTopic: (t: TopicFull) => void;
}) {
  const byDate = new Map<string, Map<string, { type: SessionType; topics: TopicFull[] }>>();
  for (const r of rows) {
    const date = r.sessions!.days.date;
    if (!byDate.has(date)) byDate.set(date, new Map());
    const sessMap = byDate.get(date)!;
    const sid = r.sessions!.id;
    if (!sessMap.has(sid)) sessMap.set(sid, { type: r.sessions!.type, topics: [] });
    sessMap.get(sid)!.topics.push(r);
  }
  const days = [...byDate.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));

  if (!days.length) {
    return (
      <div className="rounded-3xl bg-white p-6 text-center text-sm text-[#8A999D] shadow-sm">
        Nothing logged yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {days.map(([date, sessMap]) => {
        const topics = [...sessMap.values()].flatMap((s) => s.topics);
        const covered = topics.filter((t) => t.soc_covered);
        return (
          <div key={date}>
            <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#8A999D]">
              {formatDateLong(date)} · {covered.length} SoC topic{covered.length === 1 ? "" : "s"}
              {isDayOpen(date) ? " · open" : ""}
            </div>
            <div className="mt-2 flex flex-col gap-3">
              {[...sessMap.entries()].map(([sid, s]) => (
                <div key={sid} className="overflow-hidden rounded-3xl bg-white shadow-sm">
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <span className="text-[15.5px] font-extrabold text-[#0E1A1C]">{s.type}</span>
                    <span className="whitespace-nowrap rounded-lg bg-[#EAEFEE] px-2 py-1 font-mono text-[10px] font-semibold uppercase text-[#8A999D]">
                      {s.topics.length} topic{s.topics.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  {s.topics.map((t) => (
                    <TopicRow key={t.id} topic={t} residentId={residentId} onOpen={() => onOpenTopic(t)} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PeriodTab({
  rows,
  toEntry,
  period,
  cohortSize,
  onOpenTopic,
}: {
  rows: TopicFull[];
  toEntry: (r: TopicFull) => TopicEntry;
  period: "week" | "month";
  cohortSize: number;
  onOpenTopic: (t: TopicFull) => void;
}) {
  const from = period === "week" ? dayBack(6) : todayLocalDate().slice(0, 8) + "01";
  const label =
    period === "week"
      ? "Last 7 days"
      : new Date(todayLocalDate() + "T00:00:00").toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const inRange = rows.filter((r) => r.sessions!.days.date >= from);
  const entries = inRange.map(toEntry);
  const byId = new Map(inRange.map((r) => [r.id, r]));

  if (!entries.length) {
    return (
      <div className="rounded-3xl bg-white p-6 text-center text-sm text-[#8A999D] shadow-sm">
        Nothing logged in this period.
      </div>
    );
  }

  const stats = summaryStats(entries);
  const response = responseRecord(entries, cohortSize);
  const perItem = itemAverages(entries);
  const brief = period === "month" ? monthlyBrief(entries) : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <div className="flex text-center">
          <Stat n={stats.visualCount} label="Visually relevant topics" />
          <Stat n={`${stats.exposurePct}%`} label="Teaching exposure" />
          <Stat
            n={stats.avgScore ? stats.avgScore.toFixed(2) : "—"}
            label="Mean RM"
            tone={stats.avgScore != null && stats.avgScore < THRESHOLD ? "amber" : "teal"}
          />
        </div>
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
            Priority educational needs <span className="font-normal text-[#8A999D]">· below {THRESHOLD}</span>
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
                  <div className="text-[11.5px] text-[#8A999D]">
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
    </div>
  );
}

function Stat({ n, label, tone }: { n: string | number; label: string; tone?: "teal" | "amber" }) {
  return (
    <div className="flex-1">
      <h2 className={`text-2xl font-extrabold ${tone === "amber" ? "text-[#8F5205]" : "text-[#0E1A1C]"}`}>{n}</h2>
      <div className="mt-0.5 text-[11px] text-[#8A999D]">{label}</div>
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
