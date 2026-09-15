import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { formatDateShort, isBelowThreshold, scoreTopic } from "../lib/domain";
import { downloadCsv } from "../lib/csv";
import {
  FitzpatrickStrip,
  PHASE3_EXPORT_HEADER,
  ResultsSummary,
  buildPhase3ExportRows,
  expandTones,
  type PriorityTopic,
} from "./CycleTab";
import { THRESHOLD, type Assessment, type Claim, type Pgy, type ProgramDirector, type Rating, type Resource, type SkinType, type TopicRequest } from "../types";

const PGY_LEVELS: Pgy[] = ["PGY-2", "PGY-3", "PGY-4"];

interface PgyData {
  cycle: { id: string; start_date: string; cycle_number: number; phase2_started_at: string | null; phase3_started_at: string | null; phase4_started_at: string | null } | null;
  cohort_count: number;
  cohort: { id: string; resident_code: string }[];
  claims: Claim[];
  assessments: Assessment[];
  resources: Resource[];
  requests: TopicRequest[];
  priority_topics: { title: string; ratings: Rating[]; skin_types: (SkinType | null)[] }[];
}

// Stage 2 of the PD dashboard: one function call gets every PGY year's
// current-cycle status, priority topics, claimed/delivered state, and
// baseline/follow-up results at once — reuses the exact same
// ResultsSummary and CSV export logic the resident-facing Cycle tab
// already has, just widened across PGY years instead of scoped to one.
// Materials are exported alongside everything else, but browsing/
// downloading them one at a time in the dashboard itself is a follow-up.
export function PdDashboard({ pd, onLogout }: { pd: ProgramDirector; onLogout: () => void }) {
  const [programName, setProgramName] = useState("");
  const [data, setData] = useState<Record<string, PgyData> | null>(null);
  const [pgy, setPgy] = useState<Pgy>("PGY-2");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [{ data: programRow }, { data: dashboard, error: dashError }] = await Promise.all([
      supabase.from("programs_public").select("name").eq("id", pd.program_id).maybeSingle(),
      supabase.rpc("get_pd_dashboard"),
    ]);
    setProgramName((programRow as { name: string } | null)?.name ?? "");
    if (dashError) setError(dashError.message);
    else setData(dashboard as Record<string, PgyData>);
    setLoading(false);
  }, [pd.program_id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <div className="p-8 text-center text-sm text-[#343E42]">Loading…</div>;
  }

  const current = data?.[pgy];
  const gaps: PriorityTopic[] = [];
  for (const t of current?.priority_topics ?? []) {
    const sc = scoreTopic(t.ratings);
    if (sc && isBelowThreshold(sc.overall)) {
      gaps.push({ title: t.title, overall: sc.overall, perItem: sc.perItem, tones: expandTones(t.skin_types) });
    }
  }
  const codeById = Object.fromEntries((current?.cohort ?? []).map((r) => [r.id, r.resident_code]));
  const cycle = current?.cycle;
  const displayPhase = !cycle
    ? 0
    : !cycle.phase2_started_at
      ? 1
      : !cycle.phase3_started_at
        ? 2
        : !cycle.phase4_started_at
          ? 3
          : 4;

  function exportPgyCsv() {
    if (!current) return;
    downloadCsv(`soc-teq_${pgy.replace("-", "")}-full-export_${new Date().toISOString().slice(0, 10)}.csv`, [
      PHASE3_EXPORT_HEADER,
      ...buildPhase3ExportRows(current.claims, current.resources, current.requests, codeById),
    ]);
  }

  return (
    <div className="mx-auto min-h-dvh max-w-md px-5 py-8 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0E1A1C]">Program Director</h1>
          <p className="mt-1 text-sm text-[#343E42]">{programName || "…"}</p>
        </div>
        <button onClick={onLogout} className="text-sm font-semibold text-[#343E42]">
          Log out
        </button>
      </div>

      <div className="mt-5 flex rounded-2xl bg-[#EAEFEE] p-1">
        {PGY_LEVELS.map((p) => (
          <button
            key={p}
            onClick={() => setPgy(p)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors ${
              pgy === p ? "bg-white text-[#0E1A1C] shadow-sm" : "text-[#343E42]"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-4 rounded-2xl bg-[#F8E4E4] p-4 text-sm font-semibold text-[#93393E]">{error}</div>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {!cycle ? (
          <div className="rounded-3xl bg-white p-5 text-center text-sm text-[#343E42] shadow-sm">
            No cycle has started yet for {pgy}.
          </div>
        ) : (
          <>
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-[#0E1A1C]">Cycle {cycle.cycle_number}</h3>
                  <div className="text-xs text-[#343E42]">
                    {current!.cohort_count} resident{current!.cohort_count === 1 ? "" : "s"} · started{" "}
                    {formatDateShort(cycle.start_date)}
                  </div>
                </div>
                <span className="whitespace-nowrap rounded-lg bg-[#DCEFEB] px-2 py-1 font-mono text-[10px] font-semibold uppercase text-[#064B45]">
                  Phase {displayPhase}
                </span>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <h3 className="font-bold text-[#0E1A1C]">Priority educational needs</h3>
              <p className="mt-0.5 text-[12.5px] text-[#343E42]">Scoring below {THRESHOLD} out of 5.</p>
              {gaps.length === 0 ? (
                <div className="mt-3 text-center text-sm text-[#343E42]">No gaps identified yet.</div>
              ) : (
                gaps.map((g) => (
                  <div key={g.title} className="mt-2.5 border-t border-[#E2EAE9] pt-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-bold text-[#0E1A1C]">{g.title}</span>
                      <span className="whitespace-nowrap rounded-lg bg-[#FAEBD4] px-2 py-1 font-mono text-[10px] font-semibold text-[#8F5205]">
                        {g.overall.toFixed(2)}
                      </span>
                    </div>
                    <FitzpatrickStrip tones={g.tones} />
                  </div>
                ))
              )}
            </div>

            {current!.claims.length > 0 && (
              <button onClick={exportPgyCsv} className="rounded-2xl bg-[#2B5F8A] py-3.5 text-sm font-bold text-white">
                Export everything (CSV) · {pgy}
              </button>
            )}

            <ResultsSummary claims={current!.claims} assessments={current!.assessments} codeById={codeById} />
          </>
        )}
      </div>

      <p className="mt-6 text-[11.5px] leading-relaxed text-[#343E42]">
        Everything above is shown by resident code. Browsing individual shared
        materials one at a time (rather than in the export) is coming in a later update.
      </p>
    </div>
  );
}
