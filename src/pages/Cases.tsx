import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { formatDateShort, isBelowThreshold, scoreTopic } from "../lib/domain";
import type { Rating, Resident, SessionType, SkinType } from "../types";
import { TopicDetail } from "../components/TopicDetail";

const TONES: SkinType[] = ["Fitzpatrick IV", "Fitzpatrick V", "Fitzpatrick VI"];

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

export function Cases({ resident, onAbout }: { resident: Resident; onAbout: () => void }) {
  const [rows, setRows] = useState<CaseTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CaseTopic | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("topics")
      .select("id, title, skin_type, soc_covered, incomplete, image_soc, discussed_soc, ratings(*), sessions(type, days(date))")
      .eq("soc_covered", true)
      .order("created_at", { ascending: false });

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

  if (loading) {
    return <div className="p-8 text-center text-sm text-[#8A999D]">Loading…</div>;
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

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-24">
      <div className="flex items-start justify-between px-5 pt-6">
        <div>
          <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E7C72]">
            Diversity database
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#0E1A1C]">Topics covered in SoC</h1>
          <p className="mt-1 text-[13px] text-[#2E3A3D]">Which skin types each condition has actually been taught in.</p>
        </div>
        <button onClick={onAbout} className="mt-0.5 text-xs font-bold text-[#0E7C72]">
          SoC-TEQ
        </button>
      </div>

      <div className="px-5">
        {conditions.length === 0 ? (
          <div className="mt-4 rounded-3xl bg-white p-6 text-center text-sm text-[#8A999D] shadow-sm">
            Nothing here yet.
          </div>
        ) : (
          <>
            <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[#0E1A1C]">Tone coverage</h3>
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
              {conditions.map((c) => {
                const missing = TONES.filter((t) => !c.tones.has(t));
                return (
                  <button
                    key={c.title}
                    onClick={() => setSelected(c.latest)}
                    className="rounded-3xl bg-white p-4 text-left shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-[#0E1A1C]">{c.title}</h3>
                        <div className="mt-0.5 text-xs text-[#8A999D]">
                          {c.instances.length} session{c.instances.length > 1 ? "s" : ""} · {c.latest.sessionType} ·{" "}
                          {formatDateShort(c.latest.date)}
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
                            c.tones.has(t) ? "bg-[#DCEFEB] text-[#064B45]" : "bg-[#EEF1F0] text-[#8A999D]"
                          }`}
                        >
                          {t.replace("Fitzpatrick ", "")}
                        </span>
                      ))}
                    </div>
                    {missing.length > 0 && (
                      <div className="mt-2 text-[11px] text-[#8A999D]">
                        Not yet taught in {missing.map((m) => m.replace("Fitzpatrick ", "type ")).join(" and ")}.
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {selected && <TopicDetail topic={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
