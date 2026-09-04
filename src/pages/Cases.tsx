import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { formatDateShort, isBelowThreshold, scoreTopic, type TopicScore } from "../lib/domain";
import { FITZPATRICK_TONES, SESSION_TYPES, type Rating, type Resident, type SessionType, type SkinType } from "../types";
import { SESSION_TYPE_COLOR } from "../lib/content";
import { TopicDetail } from "../components/TopicDetail";

const TONES = FITZPATRICK_TONES;

interface CaseTopic {
  id: string;
  title: string;
  skin_type: SkinType | null;
  soc_covered: boolean;
  incomplete: boolean;
  image_soc: boolean | null;
  discussed_soc: boolean | null;
  ratings: Rating[];
  date: string;
  sessionType: SessionType;
}

interface ConditionSummary {
  title: string;
  instances: CaseTopic[];
  tones: Set<SkinType>;
  latest: CaseTopic;
  score: TopicScore | null;
}

export function Cases({ resident, active, onAbout }: { resident: Resident; active: boolean; onAbout: () => void }) {
  const [rows, setRows] = useState<CaseTopic[]>([]);
  const [codeById, setCodeById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CaseTopic | null>(null);
  const [openSessions, setOpenSessions] = useState<Set<SessionType>>(new Set());
  function toggleSession(t: SessionType) {
    setOpenSessions((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  const load = useCallback(async () => {
    const [{ data }, { data: cohortRows }] = await Promise.all([
      supabase
        .from("topics")
        .select("id, title, skin_type, soc_covered, incomplete, image_soc, discussed_soc, ratings(*), sessions(type, days(date))")
        .eq("soc_covered", true)
        .order("created_at", { ascending: false }),
      supabase.from("residents").select("id, resident_code").eq("program_id", resident.program_id).eq("pgy", resident.pgy),
    ]);
    setCodeById(
      Object.fromEntries(((cohortRows as { id: string; resident_code: string }[] | null) ?? []).map((r) => [r.id, r.resident_code])),
    );

    const mapped: CaseTopic[] = ((data as unknown as {
      id: string;
      title: string;
      skin_type: SkinType | null;
      soc_covered: boolean;
      incomplete: boolean;
      image_soc: boolean | null;
      discussed_soc: boolean | null;
      ratings: Rating[];
      sessions: { type: SessionType; days: { date: string } } | null;
    }[]) ?? [])
      .filter((r) => r.sessions?.days)
      .map((r) => ({
        id: r.id,
        title: r.title,
        skin_type: r.skin_type,
        soc_covered: r.soc_covered,
        incomplete: r.incomplete,
        image_soc: r.image_soc,
        discussed_soc: r.discussed_soc,
        ratings: r.ratings,
        date: r.sessions!.days.date,
        sessionType: r.sessions!.type,
      }));

    setRows(mapped);
    setLoading(false);
  }, [resident.program_id, resident.pgy]);

  useEffect(() => {
    load();
  }, [load]);

  // See Today.tsx for why this exists — every screen preloads once at
  // login for instant tab switches, so it needs its own silent revalidate
  // whenever it becomes the active tab or it'll show stale data.
  useEffect(() => {
    if (active) load();
  }, [active, load]);

  if (loading) {
    return <div className="p-8 text-center text-sm text-[#5C6B6F]">Loading…</div>;
  }

  const titleKey = (t: string) => t.trim().toLowerCase();
  const groups = new Map<string, CaseTopic[]>();
  for (const r of rows) {
    const key = titleKey(r.title);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  function tonesFor(instances: CaseTopic[]): Set<SkinType> {
    const seen = new Set<SkinType>();
    for (const inst of instances) {
      if (inst.skin_type === "Mixed across IV–VI") TONES.forEach((t) => seen.add(t));
      else if (inst.skin_type) seen.add(inst.skin_type);
    }
    return seen;
  }

  const conditions = [...groups.values()].map((instances) => ({
    title: instances[0].title,
    instances,
    tones: tonesFor(instances),
    latest: instances[0],
    score: scoreTopic(instances[0].ratings),
  }));

  const thin = conditions.filter((c) => c.tones.size < TONES.length);

  // Grouped by where it was taught, not when — Summary's Day tab already
  // owns "what happened on this specific day," so this stays the all-time
  // reference organized by session type instead of duplicating that view.
  const bySession = new Map<SessionType, Map<string, CaseTopic[]>>();
  for (const r of rows) {
    if (!bySession.has(r.sessionType)) bySession.set(r.sessionType, new Map());
    const condMap = bySession.get(r.sessionType)!;
    const key = titleKey(r.title);
    if (!condMap.has(key)) condMap.set(key, []);
    condMap.get(key)!.push(r);
  }
  const sessionGroups = SESSION_TYPES.filter((t) => bySession.has(t)).map((type) => {
    const condMap = bySession.get(type)!;
    const conds = [...condMap.values()].map((instances) => ({
      title: instances[0].title,
      instances,
      tones: tonesFor(instances),
      latest: instances[0],
      score: scoreTopic(instances[0].ratings),
    }));
    return { type, conditions: conds };
  });

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-24">
      <div className="flex items-start justify-between px-5 pt-6">
        <div>
          <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E7C72]">
            Diversity database
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#0E1A1C]">Topics covered in SoC</h1>
          <p className="mt-1 text-[13px] text-[#2E3A3D]">Which skin types each condition has been shown in.</p>
        </div>
        <div className="mt-0.5 text-right">
          <div className="text-[8.5px] font-semibold uppercase tracking-wide text-[#5C6B6F]">Home page</div>
          <button onClick={onAbout} className="text-xs font-bold text-[#0E7C72]">
            SoC-TEQ
          </button>
        </div>
      </div>

      <div className="px-5">
        {conditions.length === 0 ? (
          <div className="mt-4 rounded-3xl bg-white p-6 text-center text-sm text-[#5C6B6F] shadow-sm">
            Nothing here yet.
          </div>
        ) : (
          <>
            <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[#0E1A1C]">Fitzpatrick coverage</h3>
                <span
                  className={`whitespace-nowrap rounded-lg px-2 py-1 font-mono text-[10px] font-semibold uppercase ${
                    thin.length ? "bg-[#FAEBD4] text-[#8F5205]" : "bg-[#DCEFEB] text-[#064B45]"
                  }`}
                >
                  {conditions.length - thin.length}/{conditions.length} complete
                </span>
              </div>
              <p className="mt-1.5 text-[12.5px] text-[#2E3A3D]">
                {thin.length
                  ? `${thin.length} condition${thin.length === 1 ? " has" : "s have"} only been shown in some of Fitzpatrick IV–VI.`
                  : "Every condition has been shown across IV–VI."}
              </p>
            </div>

            <div className="mt-3 flex flex-col gap-3">
              {sessionGroups.map((g) => {
                const isOpen = openSessions.has(g.type);
                return (
                  <div key={g.type} className="overflow-hidden rounded-3xl bg-white shadow-sm">
                    <button
                      onClick={() => toggleSession(g.type)}
                      className="flex w-full items-center justify-between gap-2 px-4 py-3.5"
                    >
                      <span className="flex items-center text-[15.5px] font-extrabold text-[#0E1A1C]">
                        <span
                          className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                          style={{ background: SESSION_TYPE_COLOR[g.type] ?? "#5C6B6F" }}
                        />
                        {g.type}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="whitespace-nowrap rounded-lg bg-[#EAEFEE] px-2 py-1 font-mono text-[10px] font-semibold uppercase text-[#5C6B6F]">
                          {g.conditions.length} condition{g.conditions.length === 1 ? "" : "s"}
                        </span>
                        <span className={`text-xl font-extrabold text-[#5C6B6F] transition-transform ${isOpen ? "rotate-180" : ""}`}>
                          ▾
                        </span>
                      </span>
                    </button>
                    {isOpen && (
                      <div className="flex flex-col gap-3 px-4 pb-4">
                        {g.conditions.map((c) => (
                          <ConditionCard key={c.title} c={c} onOpen={() => setSelected(c.latest)} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {selected && (
        <TopicDetail topic={selected} codeById={codeById} residentId={resident.id} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function ConditionCard({ c, onOpen }: { c: ConditionSummary; onOpen: () => void }) {
  const missing = TONES.filter((t) => !c.tones.has(t));
  return (
    <button onClick={onOpen} className="rounded-2xl bg-[#F5F8F7] p-4 text-left">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-[#0E1A1C]">{c.title}</h3>
          <div className="mt-0.5 text-xs text-[#5C6B6F]">
            {c.instances.length} session{c.instances.length > 1 ? "s" : ""} · {formatDateShort(c.latest.date)}
          </div>
        </div>
        <span
          className={`whitespace-nowrap rounded-lg px-2 py-1 font-mono text-[10px] font-semibold uppercase ${
            c.score && isBelowThreshold(c.score.overall) ? "bg-[#FAEBD4] text-[#8F5205]" : "bg-[#DCEFEB] text-[#064B45]"
          }`}
        >
          {c.score ? c.score.overall.toFixed(2) : "—"}
        </span>
      </div>
      <div className="mt-2.5 flex gap-1.5">
        {TONES.map((t) => (
          <span
            key={t}
            className={`flex-1 rounded-lg py-1.5 text-center font-mono text-[10.5px] font-semibold ${
              c.tones.has(t) ? "bg-[#DCEFEB] text-[#064B45]" : "bg-[#EEF1F0] text-[#5C6B6F]"
            }`}
          >
            {t.replace("Fitzpatrick ", "")}
          </span>
        ))}
      </div>
      {missing.length > 0 && (
        <div className="mt-2 text-[11px] text-[#5C6B6F]">
          Not yet shown in {missing.map((m) => m.replace("Fitzpatrick ", "type ")).join(" and ")}.
        </div>
      )}
    </button>
  );
}
