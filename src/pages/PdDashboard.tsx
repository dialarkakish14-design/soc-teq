import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { formatDateShort, isBelowThreshold, scoreTopic } from "../lib/domain";
import { downloadCsv } from "../lib/csv";
import { FITZPATRICK_DEFINITION, RM_DEFINITION } from "../lib/content";
import { InfoTag } from "../components/InfoTag";
import { LikertBreakdown } from "../components/LikertBreakdown";
import {
  FitzpatrickStrip,
  PHASE3_EXPORT_HEADER,
  PRIORITY_EXPORT_HEADER,
  ResultsSummary,
  buildPhase3ExportRows,
  buildPriorityExportRows,
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

// A tap-to-collapse card, since a busy PD checking in shouldn't have to
// scroll past every section every time — Priority needs and Results start
// collapsed; Cycle status stays open since it's the shortest, most-glanced-
// at thing here.
function CollapsibleSection({
  title,
  info,
  defaultOpen,
  children,
}: {
  title: string;
  info?: { label: string; definition: string };
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-2 text-left">
        <h3 className="font-bold text-[#0E1A1C]">{title}</h3>
        <span className={`shrink-0 text-lg font-extrabold text-[#343E42] transition-transform ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
      {info && (
        <div className="mt-1">
          <InfoTag label={info.label} definition={info.definition} />
        </div>
      )}
      {open && <div className="mt-2.5">{children}</div>}
    </div>
  );
}

// Stage 2 of the PD dashboard: one function call gets every PGY year's
// current-cycle status, priority topics, claimed/delivered state, and
// baseline/follow-up results at once — reuses the exact same
// ResultsSummary and CSV export logic the resident-facing Cycle tab
// already has, just widened across PGY years instead of scoped to one.
export function PdDashboard({
  pd,
  onLogout,
  onAbout,
}: {
  pd: ProgramDirector;
  onLogout: () => void;
  onAbout: () => void;
}) {
  const [programName, setProgramName] = useState("");
  const [data, setData] = useState<Record<string, PgyData> | null>(null);
  const [pgy, setPgy] = useState<Pgy>("PGY-2");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);

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

  // Every discussed-and-rated topic, scored — not just the ones flagged as
  // priority needs, so the search below can look any of them up.
  const allTopics: PriorityTopic[] = [];
  for (const t of current?.priority_topics ?? []) {
    const sc = scoreTopic(t.ratings);
    if (sc) allTopics.push({ title: t.title, overall: sc.overall, perItem: sc.perItem, tones: expandTones(t.skin_types) });
  }
  const gaps = allTopics.filter((t) => isBelowThreshold(t.overall));
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

  const q = search.trim().toLowerCase();
  const suggestions = q ? allTopics.filter((t) => t.title.toLowerCase().includes(q)).slice(0, 8) : [];
  const selected = selectedTitle ? allTopics.find((t) => t.title === selectedTitle) : null;

  function exportClaimsCsv() {
    if (!current) return;
    downloadCsv(`soc-teq_${pgy.replace("-", "")}-claimed-delivered_${new Date().toISOString().slice(0, 10)}.csv`, [
      PHASE3_EXPORT_HEADER,
      ...buildPhase3ExportRows(current.claims, current.resources, current.requests, codeById),
    ]);
  }

  function exportPriorityCsv() {
    downloadCsv(`soc-teq_${pgy.replace("-", "")}-priority-needs_${new Date().toISOString().slice(0, 10)}.csv`, [
      PRIORITY_EXPORT_HEADER,
      ...buildPriorityExportRows(gaps),
    ]);
  }

  return (
    <div className="mx-auto min-h-dvh max-w-md px-5 py-8 pb-16">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0E1A1C]">Program Director</h1>
          <p className="mt-1 text-sm text-[#343E42]">{programName || "…"}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button onClick={onLogout} className="text-sm font-semibold text-[#343E42]">
            Log out
          </button>
          <button onClick={onAbout} className="text-xs font-bold text-[#0E7C72]">
            SoC-TEQ home
          </button>
        </div>
      </div>

      <div className="mt-5 flex rounded-2xl bg-[#EAEFEE] p-1">
        {PGY_LEVELS.map((p) => (
          <button
            key={p}
            onClick={() => {
              setPgy(p);
              setSearch("");
              setSelectedTitle(null);
            }}
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

            {allTopics.length > 0 && (
              <div className="rounded-3xl bg-white p-4 shadow-sm">
                <h3 className="font-bold text-[#0E1A1C]">Look up a topic</h3>
                <div className="relative mt-2">
                  <input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setShowSuggestions(true);
                      setSelectedTitle(null);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Search discussed topics…"
                    className="input"
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-[#E2EAE9]">
                      {suggestions.map((t) => (
                        <button
                          key={t.title}
                          onClick={() => {
                            setSelectedTitle(t.title);
                            setSearch(t.title);
                            setShowSuggestions(false);
                          }}
                          className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm hover:bg-[#F5F8F7]"
                        >
                          <span className="text-[#232D30]">{t.title}</span>
                          <span
                            className={`font-mono text-[11px] font-semibold ${
                              isBelowThreshold(t.overall) ? "text-[#8F5205]" : "text-[#064B45]"
                            }`}
                          >
                            {t.overall.toFixed(2)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selected && (
                  <div className="mt-3 rounded-xl bg-[#F5F8F7] p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-bold text-[#0E1A1C]">{selected.title}</span>
                      <span
                        className={`whitespace-nowrap rounded-lg px-2 py-1 font-mono text-[10px] font-semibold ${
                          isBelowThreshold(selected.overall) ? "bg-[#FAEBD4] text-[#8F5205]" : "bg-[#DCEFEB] text-[#064B45]"
                        }`}
                      >
                        RM {selected.overall.toFixed(2)}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#343E42]">Group average per rating item, not individual scores.</p>
                    <LikertBreakdown perItem={selected.perItem} />
                    <FitzpatrickStrip tones={selected.tones} />
                  </div>
                )}
              </div>
            )}

            <CollapsibleSection
              title="Priority educational needs"
              info={{ label: "RM score", definition: RM_DEFINITION }}
              defaultOpen={false}
            >
              <p className="text-[12.5px] text-[#343E42]">Scoring {THRESHOLD} or below out of 5.</p>
              {gaps.length === 0 ? (
                <div className="mt-3 text-center text-sm text-[#343E42]">No gaps identified yet.</div>
              ) : (
                <>
                  {gaps.map((g) => (
                    <div key={g.title} className="mt-2.5 border-t border-[#E2EAE9] pt-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[14px] font-bold text-[#0E1A1C]">{g.title}</span>
                        <span className="whitespace-nowrap rounded-lg bg-[#FAEBD4] px-2 py-1 font-mono text-[10px] font-semibold text-[#8F5205]">
                          {g.overall.toFixed(2)}
                        </span>
                      </div>
                      <LikertBreakdown perItem={g.perItem} />
                      <div className="flex items-center gap-1.5">
                        <FitzpatrickStrip tones={g.tones} />
                        <InfoTag label="Fitzpatrick" definition={FITZPATRICK_DEFINITION} />
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={exportPriorityCsv}
                    className="mt-3 w-full rounded-xl bg-[#8F5205] py-2.5 text-xs font-bold text-white"
                  >
                    Export priority needs (CSV) · {pgy}
                  </button>
                </>
              )}
            </CollapsibleSection>

            <CollapsibleSection title="Claimed, delivered, and results" defaultOpen={false}>
              {current!.claims.length > 0 && (
                <button
                  onClick={exportClaimsCsv}
                  className="mb-3 w-full rounded-xl bg-[#2B5F8A] py-2.5 text-xs font-bold text-white"
                >
                  Export claimed & delivered (CSV) · {pgy}
                </button>
              )}
              <ResultsSummary claims={current!.claims} assessments={current!.assessments} codeById={codeById} />
            </CollapsibleSection>
          </>
        )}
      </div>

      <p className="mt-6 text-[11.5px] leading-relaxed text-[#343E42]">
        Everything above is shown by resident code. Browsing individual shared materials one at a
        time (rather than in the export) is coming in a later update.
      </p>
    </div>
  );
}
