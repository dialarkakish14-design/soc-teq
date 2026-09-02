import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { formatDateShort, isBelowThreshold, isDayOpen, scoreTopic } from "../lib/domain";
import { RATING_DOMAINS, type Absence, type Rating, type Resident, type SessionType, type Topic } from "../types";
import { TopicDetail } from "../components/TopicDetail";
import { InfoTag } from "../components/InfoTag";
import { RM_DEFINITION } from "../lib/content";

type TopicFull = Topic & {
  ratings: Rating[];
  absences: Absence[];
  sessions: { type: SessionType; days: { date: string } } | null;
};

interface CohortResident {
  id: string;
  resident_code: string;
}

export function TrackMyInfo({
  resident,
  active,
  onAbout,
  onLogout,
}: {
  resident: Resident;
  active: boolean;
  onAbout: () => void;
  onLogout: () => void;
}) {
  const [rows, setRows] = useState<TopicFull[]>([]);
  const [cohort, setCohort] = useState<CohortResident[]>([]);
  const [loggerDays, setLoggerDays] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TopicFull | null>(null);

  const load = useCallback(async () => {
    const [{ data: topicRows }, { data: cohortRows }, { count: loggerCount }] = await Promise.all([
      supabase
        .from("topics")
        .select("*, ratings(*), absences(*), sessions(type, days(date))")
        .eq("incomplete", false)
        .order("created_at", { ascending: false }),
      supabase
        .from("residents")
        .select("id, resident_code")
        .eq("program_id", resident.program_id)
        .eq("pgy", resident.pgy),
      supabase
        .from("days")
        .select("id", { count: "exact", head: true })
        .eq("logger_id", resident.id),
    ]);

    setRows(((topicRows as TopicFull[] | null) ?? []).filter((r) => r.sessions?.days));
    setCohort((cohortRows as CohortResident[] | null) ?? []);
    setLoggerDays(loggerCount ?? 0);
    setLoading(false);
  }, [resident.id, resident.program_id, resident.pgy]);

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

  const codeById = Object.fromEntries(cohort.map((c) => [c.id, c.resident_code]));
  const covered = rows.filter((r) => r.soc_covered);
  const mine = covered.filter((r) => r.ratings.some((rt) => rt.resident_id === resident.id));
  const declared = covered.filter((r) => r.absences.some((a) => a.resident_id === resident.id && a.reason === "declared"));
  const noResponse = covered.filter((r) => r.absences.some((a) => a.resident_id === resident.id && a.reason === "no_response"));
  const waitingOnMe = covered.filter(
    (r) =>
      isDayOpen(r.sessions!.days.date) &&
      !r.ratings.some((rt) => rt.resident_id === resident.id) &&
      !r.absences.some((a) => a.resident_id === resident.id),
  );

  const myMean = (r: TopicFull) => {
    const mineRating = r.ratings.find((rt) => rt.resident_id === resident.id)!;
    return RATING_DOMAINS.reduce((a, d) => a + (mineRating[d.key] as number), 0) / RATING_DOMAINS.length;
  };
  const myAvg = mine.length ? mine.reduce((a, r) => a + myMean(r), 0) / mine.length : null;
  const teamAvg = mine.length
    ? mine.reduce((a, r) => a + (scoreTopic(r.ratings)?.overall ?? 0), 0) / mine.length
    : null;

  const myPer: Record<string, number> = {};
  const coPer: Record<string, number> = {};
  if (mine.length) {
    for (const d of RATING_DOMAINS) {
      myPer[d.key] = mine.reduce((a, r) => a + (r.ratings.find((rt) => rt.resident_id === resident.id)![d.key] as number), 0) / mine.length;
      coPer[d.key] = mine.reduce((a, r) => a + (scoreTopic(r.ratings)?.perItem[d.key] ?? 0), 0) / mine.length;
    }
  }

  function exportTopicCsv() {
    const header = [
      "date",
      "session",
      "topic",
      "visually_relevant",
      "image_soc",
      "discussed_soc",
      "soc_covered",
      "skin_type",
      ...RATING_DOMAINS.map((d) => `${d.key}_mean`),
      "rm_mean",
      "n_rated",
      "n_absent_declared",
      "n_no_response",
      "cohort_size",
      "flagged",
    ];
    const dataRows = rows.map((r) => {
      const sc = scoreTopic(r.ratings);
      const decl = r.absences.filter((a) => a.reason === "declared").length;
      const nores = r.absences.filter((a) => a.reason === "no_response").length;
      return [
        r.sessions!.days.date,
        r.sessions!.type,
        r.title,
        1,
        r.image_soc ? 1 : 0,
        r.discussed_soc ? 1 : 0,
        r.soc_covered ? 1 : 0,
        r.skin_type ?? "",
        ...RATING_DOMAINS.map((d) => (sc ? sc.perItem[d.key].toFixed(2) : "")),
        sc ? sc.overall.toFixed(2) : "",
        sc ? sc.n : 0,
        decl,
        nores,
        cohort.length,
        sc ? (isBelowThreshold(sc.overall) ? 1 : 0) : "",
      ];
    });
    downloadCsv(`soc-teq_topic_${resident.pgy.replace("-", "")}_${new Date().toISOString().slice(0, 10)}.csv`, [header, ...dataRows]);
  }

  function exportRaterCsv() {
    const header = [
      "date",
      "session",
      "topic",
      "soc_covered",
      "skin_type",
      "resident_code",
      "status",
      ...RATING_DOMAINS.map((d) => d.key),
      "rater_mean",
      "team_mean",
      "n_rated",
      "flagged",
      "note",
    ];
    const dataRows: (string | number)[][] = [];
    for (const r of covered) {
      const sc = scoreTopic(r.ratings);
      for (const c of cohort) {
        const v = r.ratings.find((rt) => rt.resident_id === c.id);
        const absence = r.absences.find((a) => a.resident_id === c.id);
        const status = v ? "rated" : absence?.reason === "declared" ? "absent_declared" : absence?.reason === "no_response" ? "no_response" : "pending";
        const raterMean = v ? (RATING_DOMAINS.reduce((a, d) => a + (v[d.key] as number), 0) / RATING_DOMAINS.length).toFixed(2) : "";
        dataRows.push([
          r.sessions!.days.date,
          r.sessions!.type,
          r.title,
          1,
          r.skin_type ?? "",
          c.resident_code,
          status,
          ...RATING_DOMAINS.map((d) => (v ? (v[d.key] as number) : "")),
          raterMean,
          sc ? sc.overall.toFixed(2) : "",
          sc ? sc.n : 0,
          sc ? (isBelowThreshold(sc.overall) ? 1 : 0) : "",
          v?.note ?? "",
        ]);
      }
    }
    downloadCsv(`soc-teq_rater_${resident.pgy.replace("-", "")}_${new Date().toISOString().slice(0, 10)}.csv`, [header, ...dataRows]);
  }

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-24">
      <div className="flex items-start justify-between px-5 pt-6">
        <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E7C72]">
          Track my info
        </div>
        <button onClick={onAbout} className="text-xs font-bold text-[#0E7C72]">
          SoC-TEQ
        </button>
      </div>

      <div className="px-5">
        <div className="mt-3 flex items-center gap-3.5">
          <div className="flex h-[54px] w-[54px] items-center justify-center rounded-2xl bg-[#DCEFEB] text-lg font-extrabold text-[#064B45]">
            {resident.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-[#0E1A1C]">{resident.full_name}</h1>
            <div className="text-xs text-[#5C6B6F]">
              {resident.pgy} · @{resident.username} · you appear as <b className="text-[#0E1A1C]">{resident.resident_code}</b> in all
              data
            </div>
          </div>
        </div>

        {waitingOnMe.length > 0 && (
          <div className="mt-4 rounded-2xl bg-[#FAEBD4] px-3.5 py-3 text-[12.5px] font-semibold leading-relaxed text-[#8F5205]">
            {waitingOnMe.length} topic{waitingOnMe.length === 1 ? "" : "s"} still waiting on your rating. If you don't
            respond before close you'll be recorded as no response.
          </div>
        )}

        <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm">
          <div className="flex text-center">
            <Stat n={mine.length} label="Rated" />
            <Stat n={declared.length} label="Absent" />
            <Stat n={noResponse.length} label="No response" />
            <Stat n={loggerDays} label="Logged" />
          </div>
          <p className="mt-3 text-[12.5px] text-[#2E3A3D]">
            Both are excluded from averages. "No response" just means a day closed without you.
          </p>
        </div>

        {mine.length > 0 && myAvg != null && teamAvg != null ? (
          <>
            <div className={`mt-3 flex items-center justify-between rounded-2xl px-4 py-3.5 ${isBelowThreshold(myAvg) ? "bg-[#8F5205] text-[#FBF1E1]" : "bg-[#064B45] text-[#DCEEEB]"}`}>
              <div>
                <InfoTag label="Your mean RM" definition={RM_DEFINITION} dark />
                <div className="mt-0.5 text-[11px] opacity-90">
                  Across {mine.length} topic{mine.length === 1 ? "" : "s"} · cohort mean {teamAvg.toFixed(2)}
                </div>
              </div>
              <div className="font-mono text-3xl font-semibold">{myAvg.toFixed(2)}</div>
            </div>

            <div className="mt-3 rounded-3xl bg-white p-4 shadow-sm">
              <h3 className="font-bold text-[#0E1A1C]">How your ratings compare</h3>
              <p className="mt-1 text-[12.5px] text-[#2E3A3D]">
                Purple is your average. The marker is the group's average on the same topics.
              </p>
              {RATING_DOMAINS.map((d) => (
                <div key={d.key} className="mt-3">
                  <div className="flex justify-between text-[12.5px] font-semibold">
                    <span>{d.name}</span>
                    <span className="font-mono">
                      {myPer[d.key].toFixed(2)} <span className="text-[#5C6B6F]">/ {coPer[d.key].toFixed(2)}</span>
                    </span>
                  </div>
                  <div className="relative mt-1.5 h-2 rounded-full bg-[#EAEFEE]">
                    <div className="h-full overflow-hidden rounded-full">
                      <div className="h-full rounded-full bg-[#5E3F73]" style={{ width: `${(myPer[d.key] / 5) * 100}%` }} />
                    </div>
                    <div
                      className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#0E1A1C] shadow"
                      style={{ left: `${(coPer[d.key] / 5) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-3xl bg-white p-4 shadow-sm">
              <h3 className="font-bold text-[#0E1A1C]">Topics you rated</h3>
              {mine.map((r) => {
                const m = myMean(r);
                const sc = scoreTopic(r.ratings);
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelected(r)}
                    className="flex w-full items-center justify-between gap-3 border-t border-[#E2EAE9] py-3 text-left first:border-t-0"
                  >
                    <div>
                      <div className="text-[14px] font-bold text-[#0E1A1C]">{r.title}</div>
                      <div className="text-[11.5px] text-[#5C6B6F]">
                        {r.sessions!.type} · {formatDateShort(r.sessions!.days.date)} · team {sc?.overall.toFixed(2)}
                      </div>
                    </div>
                    <span
                      className={`whitespace-nowrap rounded-lg px-2 py-1 font-mono text-[10px] font-semibold uppercase ${
                        isBelowThreshold(m) ? "bg-[#FAEBD4] text-[#8F5205]" : "bg-[#DCEFEB] text-[#064B45]"
                      }`}
                    >
                      {m.toFixed(2)}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="mt-3 rounded-3xl bg-white p-6 text-center text-sm text-[#5C6B6F] shadow-sm">
            You haven't rated anything yet.
          </div>
        )}

        <div className="mt-6 font-mono text-[10px] font-semibold uppercase tracking-widest text-[#5C6B6F]">Export</div>
        <button onClick={exportTopicCsv} className="mt-3 w-full rounded-2xl bg-white py-3.5 text-sm font-bold text-[#064B45] shadow-sm">
          Export topic data (CSV)
        </button>
        <div className="mt-1.5 text-[11px] text-[#5C6B6F]">
          One row per topic. No rater identities — this is the analysis file.
        </div>
        <button onClick={exportRaterCsv} className="mt-3 w-full rounded-2xl bg-white py-3.5 text-sm font-bold text-[#064B45] shadow-sm">
          Export rating-level data (CSV)
        </button>
        <div className="mt-1.5 text-[11px] text-[#5C6B6F]">
          One row per rating, resident codes only. Needed for inter-rater reliability.
        </div>

        <button
          onClick={onLogout}
          className="mt-8 w-full rounded-2xl bg-[#F8E4E4] py-3.5 text-sm font-bold text-[#93393E]"
        >
          Log out
        </button>
      </div>

      {selected && <TopicDetail topic={selected} codeById={codeById} onClose={() => setSelected(null)} />}
    </div>
  );
}

function Stat({ n, label }: { n: string | number; label: string }) {
  return (
    <div className="flex-1">
      <h2 className="text-2xl font-extrabold text-[#0E1A1C]">{n}</h2>
      <div className="mt-0.5 text-[11px] text-[#5C6B6F]">{label}</div>
    </div>
  );
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const toCell = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map((r) => r.map(toCell).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
