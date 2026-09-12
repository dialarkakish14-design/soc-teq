import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { cycleMonth, cyclePhase, daysSinceStart, formatDateShort, isBelowThreshold, scoreTopic } from "../lib/domain";
import { downloadCsv } from "../lib/csv";
import { LikertBreakdown } from "../components/LikertBreakdown";
import {
  CLAIM_FORMATS,
  RATING_DOMAINS,
  THRESHOLD,
  type Assessment,
  type Claim,
  type Cycle,
  type Rating,
  type Resident,
  type Resource,
} from "../types";

interface PriorityTopic {
  title: string;
  overall: number;
  perItem: Record<string, number>;
}

const OTHER_FORMAT = "__other__";

// "March 5 · 2:00 PM · Room 302" — skips whichever pieces are unset, and
// returns null if none are, so callers can just check truthiness.
function formatWhenWhere(date: string | null, time: string | null, location: string | null): string | null {
  const parts: string[] = [];
  if (date) parts.push(formatDateShort(date));
  if (time) {
    const [h, m] = time.split(":").map(Number);
    parts.push(new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }));
  }
  if (location) parts.push(location);
  return parts.length ? parts.join(" · ") : null;
}

export function CycleTab({ resident }: { resident: Resident }) {
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [priority, setPriority] = useState<PriorityTopic[]>([]);
  const [cohortCount, setCohortCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2400);
  }

  const [loadError, setLoadError] = useState("");

  // Everything the tab needs comes back from one function call instead of
  // several sequential round trips — see get_cycle_dashboard() in
  // schema.sql / patch_cycle_dashboard_rpc.sql. That used to be the real
  // source of the Cycle tab feeling slow to open: not any one query being
  // heavy, just the fixed latency of each round trip adding up.
  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_cycle_dashboard", { p_pgy: resident.pgy });

    if (error) {
      setLoadError(error.message);
      setLoading(false);
      return;
    }

    const result = data as {
      cycle: Cycle | null;
      cohort_count: number;
      claims: Claim[];
      assessments: Assessment[];
      resources: Resource[];
      priority_topics: { title: string; ratings: Pick<Rating, "depth" | "clarity" | "nuance" | "mgmt" | "conf">[] }[];
    };

    setCycle(result.cycle);
    setCohortCount(result.cohort_count ?? 0);
    setClaims(result.claims ?? []);
    setAssessments(result.assessments ?? []);
    setResources(result.resources ?? []);

    const gaps: PriorityTopic[] = [];
    for (const t of result.priority_topics ?? []) {
      const sc = scoreTopic(t.ratings as Rating[]);
      if (sc && isBelowThreshold(sc.overall)) gaps.push({ title: t.title, overall: sc.overall, perItem: sc.perItem });
    }
    setPriority(gaps);

    setLoading(false);
  }, [resident.pgy]);

  useEffect(() => {
    load();
  }, [load]);

  if (loadError) {
    return (
      <div className="rounded-3xl bg-[#F8E4E4] p-4 text-sm font-semibold text-[#93393E] shadow-sm">{loadError}</div>
    );
  }

  if (loading) {
    return <div className="rounded-3xl bg-white p-6 text-center text-sm text-[#3F4C50] shadow-sm">Loading…</div>;
  }

  if (!cycle) {
    return <NoCycleYet resident={resident} onStarted={load} />;
  }

  const phase = cyclePhase(cycle.start_date);
  const month = cycleMonth(cycle.start_date);
  const phase2Started = !!cycle.phase2_started_at;
  const phase3Started = !!cycle.phase3_started_at;
  // What's actually shown below is driven by the explicit phase2Started/
  // phase3Started flags, not the raw calendar phase — a resident can (and
  // often will) start Phase 3 before day 98, so the badge and roadmap need
  // to reflect that instead of still reading "Phase 2" while Phase 3's
  // claiming/delivery content is what's actually on screen.
  const displayPhase: 1 | 2 | 3 | 4 = !phase2Started ? 1 : !phase3Started ? 2 : phase === 4 ? 4 : 3;
  const mine = claims.filter((c) => c.resident_id === resident.id);
  const claimedTitles = new Set(claims.map((c) => c.topic_title));
  const claimRate = priority.length ? Math.round((claimedTitles.size / priority.length) * 100) : 0;
  const allClaimed = priority.length > 0 && claimedTitles.size >= priority.length;
  const delivered = claims.filter((c) => c.status === "delivered");
  const scholarly = claims.filter((c) => c.scholarly);

  // Every mutation below updates local state directly from the result
  // instead of calling load() again — a full reload re-fetches every
  // claim/assessment/resource plus every rated topic across the cycle,
  // which made every single click (claim, mark delivered, ...) feel slow.
  // We already know the result of our own write, so there's no reason to
  // wait on a fresh round trip just to show it.

  async function claimTopic(title: string, format: string, deliverDate: string, deliverTime: string, deliverLocation: string) {
    const { data, error } = await supabase
      .from("claims")
      .insert({
        cycle_id: cycle!.id,
        resident_id: resident.id,
        topic_title: title,
        format,
        deliver_date: deliverDate || null,
        deliver_time: deliverTime || null,
        deliver_location: deliverLocation.trim() || null,
      })
      .select("*")
      .single();
    if (error) return flash(error.message);
    setClaims((prev) => [...prev, data as Claim]);
    flash("Claimed · you'll build this over months 4–6.");
  }

  async function updateClaimDetails(id: string, deliverDate: string, deliverTime: string, deliverLocation: string) {
    const details = {
      deliver_date: deliverDate || null,
      deliver_time: deliverTime || null,
      deliver_location: deliverLocation.trim() || null,
    };
    const { error } = await supabase.from("claims").update(details).eq("id", id);
    if (error) return flash(error.message);
    setClaims((prev) => prev.map((c) => (c.id === id ? { ...c, ...details } : c)));
    flash("Updated.");
  }

  async function releaseClaim(id: string) {
    const { error } = await supabase.from("claims").delete().eq("id", id);
    if (error) return flash(error.message);
    setClaims((prev) => prev.filter((c) => c.id !== id));
    flash("Released.");
  }

  async function markDelivered(id: string) {
    const { error } = await supabase.from("claims").update({ status: "delivered" }).eq("id", id);
    if (error) return flash(error.message);
    setClaims((prev) => prev.map((c) => (c.id === id ? { ...c, status: "delivered" } : c)));
    flash("Recorded as delivered.");
  }

  async function undoDelivered(id: string) {
    const { error } = await supabase.from("claims").update({ status: "planned" }).eq("id", id);
    if (error) return flash(error.message);
    setClaims((prev) => prev.map((c) => (c.id === id ? { ...c, status: "planned" } : c)));
    flash("Back to planned.");
  }

  async function markScholarly(id: string) {
    const { error } = await supabase.from("claims").update({ scholarly: true }).eq("id", id);
    if (error) return flash(error.message);
    setClaims((prev) => prev.map((c) => (c.id === id ? { ...c, scholarly: true } : c)));
    flash("Recorded as scholarly output.");
  }

  async function undoScholarly(id: string) {
    const { error } = await supabase.from("claims").update({ scholarly: false }).eq("id", id);
    if (error) return flash(error.message);
    setClaims((prev) => prev.map((c) => (c.id === id ? { ...c, scholarly: false } : c)));
    flash("Undone.");
  }

  async function recordAssessment(assessPhase: "baseline" | "followup", score: number) {
    if (!(score >= 0 && score <= 100)) return flash("Enter a score between 0 and 100.");
    const { data, error } = await supabase
      .from("assessments")
      .insert({ cycle_id: cycle!.id, resident_id: resident.id, phase: assessPhase, score })
      .select("*")
      .single();
    if (error) return flash(error.message);
    setAssessments((prev) => [...prev, data as Assessment]);
    flash("Score recorded.");
  }

  async function shareResource(title: string, source: string, url: string, takeaway: string, file: File | null) {
    if (!source.trim() || !takeaway.trim()) return flash("Add where it's from and what you took from it.");

    let filePath: string | null = null;
    let fileName: string | null = null;
    if (file) {
      filePath = `${resident.program_id}/${resident.pgy}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("resource-papers").upload(filePath, file);
      if (uploadError) return flash(uploadError.message);
      fileName = file.name;
    }

    const { data, error } = await supabase
      .from("resources")
      .insert({
        program_id: resident.program_id,
        pgy: resident.pgy,
        topic_title: title,
        resident_id: resident.id,
        source: source.trim(),
        url: url.trim() || null,
        takeaway: takeaway.trim(),
        file_path: filePath,
        file_name: fileName,
      })
      .select("*")
      .single();
    if (error) return flash(error.message);
    setResources((prev) => [data as Resource, ...prev]);
    flash("Shared with your group.");
  }

  async function deleteResource(id: string) {
    const { error } = await supabase.from("resources").delete().eq("id", id);
    if (error) return flash(error.message);
    setResources((prev) => prev.filter((r) => r.id !== id));
    flash("Removed.");
  }

  async function updateResource(id: string, source: string, url: string, takeaway: string, file: File | null) {
    if (!source.trim() || !takeaway.trim()) return flash("Add where it's from and what you took from it.");

    let filePath: string | undefined;
    let fileName: string | undefined;
    if (file) {
      filePath = `${resident.program_id}/${resident.pgy}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("resource-papers").upload(filePath, file);
      if (uploadError) return flash(uploadError.message);
      fileName = file.name;
    }

    const updates: Partial<Resource> = { source: source.trim(), url: url.trim() || null, takeaway: takeaway.trim() };
    if (filePath) {
      updates.file_path = filePath;
      updates.file_name = fileName!;
    }

    const { error } = await supabase.from("resources").update(updates).eq("id", id);
    if (error) return flash(error.message);
    setResources((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    flash("Updated.");
  }

  async function downloadResourceFile(path: string, name: string) {
    const { data, error } = await supabase.storage.from("resource-papers").download(path);
    if (error) return flash(error.message);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(data);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function exportPriorityCsv() {
    const header = ["topic", "overall_rm", ...RATING_DOMAINS.map((d) => d.key)];
    const rows = priority.map((p) => [
      p.title,
      p.overall.toFixed(2),
      ...RATING_DOMAINS.map((d) => (p.perItem[d.key] != null ? p.perItem[d.key].toFixed(2) : "")),
    ]);
    downloadCsv(`soc-teq_priority-topics_${resident.pgy.replace("-", "")}_${new Date().toISOString().slice(0, 10)}.csv`, [
      header,
      ...rows,
    ]);
  }

  function exportTopicNotesCsv(title: string) {
    const rows = resources.filter((r) => r.topic_title === title).map((r) => [title, r.source, r.url ?? "", r.takeaway]);
    downloadCsv(`soc-teq_notes_${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`, [
      ["topic", "source", "url", "takeaway"],
      ...rows,
    ]);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-[#0E1A1C]">Cycle 1</h3>
            <div className="text-xs text-[#3F4C50]">
              Month {month} of 6 · started {formatDateShort(cycle.start_date)}
            </div>
          </div>
          <span className="whitespace-nowrap rounded-lg bg-[#DCEFEB] px-2 py-1 font-mono text-[10px] font-semibold uppercase text-[#064B45]">
            Phase {displayPhase}
          </span>
        </div>
        <div className="mt-3.5 h-2 overflow-hidden rounded-full bg-[#EAEFEE]">
          <div className="h-full rounded-full bg-[#0E7C72]" style={{ width: `${Math.min(100, (daysSinceStart(cycle.start_date) / 180) * 100)}%` }} />
        </div>
      </div>

      <EngagementBox claimRate={claimRate} delivered={delivered} scholarly={scholarly} />

      {phase === 1 && <Phase1 count={priority.length} />}
      {phase !== 1 && !phase2Started && <StartPhase2 resident={resident} onStarted={load} />}
      {phase2Started && !phase3Started && (
        <>
          <Phase2
            priority={priority}
            claims={claims}
            assessments={assessments}
            resident={resident}
            cohortCount={cohortCount}
            onClaim={claimTopic}
            onRelease={releaseClaim}
            onAssess={recordAssessment}
            onExport={exportPriorityCsv}
          />
          {allClaimed ? (
            <StartPhase3 resident={resident} onStarted={load} />
          ) : (
            <div className="rounded-2xl bg-[#F5F8F7] px-4 py-3.5 text-[12.5px] text-[#3F4C50]">
              {claimedTitles.size} of {priority.length} priority topics claimed so far. Once every topic is
              claimed, the option to begin resident-led remediation appears here.
            </div>
          )}
        </>
      )}
      {phase3Started && phase !== 4 && (
        <Phase3
          mine={mine}
          resources={resources}
          onDeliver={markDelivered}
          onUndoDeliver={undoDelivered}
          onScholarly={markScholarly}
          onUndoScholarly={undoScholarly}
          onShare={shareResource}
          onDeleteResource={deleteResource}
          onUpdateResource={updateResource}
          onDownloadFile={downloadResourceFile}
          onExportNotes={exportTopicNotesCsv}
          onUpdateDetails={updateClaimDetails}
        />
      )}
      {phase3Started && phase === 4 && (
        <Phase4 assessments={assessments} resident={resident} claims={claims} cohortCount={cohortCount} onAssess={recordAssessment} />
      )}

      <PhaseCards phase={displayPhase} />

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-[#0E1A1C] px-4 py-3.5 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function Stat({ n, label }: { n: string | number; label: string }) {
  return (
    <div className="flex-1">
      <h2 className="text-xl font-extrabold text-[#0E1A1C]">{n}</h2>
      <div className="mt-0.5 text-[10.5px] text-[#3F4C50]">{label}</div>
    </div>
  );
}

// "Sessions delivered" and "Scholarly output" are tappable — they expand
// to show which topics they actually are, since a bare count on its own
// isn't very informative to a resident trying to see what the cohort has
// actually built.
function EngagementBox({ claimRate, delivered, scholarly }: { claimRate: number; delivered: Claim[]; scholarly: Claim[] }) {
  const [expanded, setExpanded] = useState<"delivered" | "scholarly" | null>(null);
  const list = expanded === "delivered" ? delivered : expanded === "scholarly" ? scholarly : null;

  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm">
      <h3 className="font-bold text-[#0E1A1C]">Resident engagement</h3>
      <div className="mt-2.5 flex text-center">
        <Stat n={`${claimRate}%`} label="Claim rate" />
        <button
          onClick={() => setExpanded((e) => (e === "delivered" ? null : "delivered"))}
          className={`flex-1 rounded-xl py-1 ${expanded === "delivered" ? "bg-[#F5F8F7]" : ""}`}
        >
          <h2 className="text-xl font-extrabold text-[#0E1A1C]">{delivered.length}</h2>
          <div className="mt-0.5 flex items-center justify-center gap-0.5 text-[10.5px] text-[#3F4C50]">
            Sessions delivered
            <span className={`text-[9px] transition-transform ${expanded === "delivered" ? "rotate-180" : ""}`}>▾</span>
          </div>
        </button>
        <button
          onClick={() => setExpanded((e) => (e === "scholarly" ? null : "scholarly"))}
          className={`flex-1 rounded-xl py-1 ${expanded === "scholarly" ? "bg-[#F5F8F7]" : ""}`}
        >
          <h2 className="text-xl font-extrabold text-[#0E1A1C]">{scholarly.length}</h2>
          <div className="mt-0.5 flex items-center justify-center gap-0.5 text-[10.5px] text-[#3F4C50]">
            Scholarly output
            <span className={`text-[9px] transition-transform ${expanded === "scholarly" ? "rotate-180" : ""}`}>▾</span>
          </div>
        </button>
      </div>
      {!expanded && <p className="mt-1.5 text-center text-[10px] text-[#3F4C50]">Tap a stat to see what's behind it.</p>}
      {list && (
        <div className="mt-3 border-t border-[#E2EAE9] pt-2">
          {list.length === 0 ? (
            <div className="py-2 text-center text-[12.5px] text-[#3F4C50]">Nothing here yet.</div>
          ) : (
            list.map((c) => (
              <div key={c.id} className="flex items-center justify-between border-t border-[#E2EAE9] py-2 first:border-t-0">
                <div className="text-[13px] font-bold text-[#0E1A1C]">{c.topic_title}</div>
                <div className="text-[11px] text-[#3F4C50]">{c.format}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function Phase1({ count }: { count: number }) {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm">
      <h3 className="font-bold text-[#0E1A1C]">Keep logging</h3>
      <p className="mt-1.5 text-[13px] text-[#232D30]">
        {count} skin of color topic{count === 1 ? "" : "s"} logged so far this cycle. At the end of month 3
        everything scoring below {THRESHOLD} becomes your group's priority list.
      </p>
    </div>
  );
}

// A typeahead over the priority list itself — same pattern as the topic
// search in Today.tsx's Quick Capture — so residents can see and pick from
// what's actually on the list instead of having to know the exact title.
function TopicSearchInput({
  topics,
  value,
  onChange,
}: {
  topics: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const q = value.trim().toLowerCase();
  const suggestions = (q ? topics.filter((t) => t.toLowerCase().includes(q)) : topics).slice(0, 8);
  return (
    <div className="relative mt-3">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
        placeholder="Search topics…"
        autoComplete="off"
        className="input"
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-2xl bg-white shadow-lg">
          {suggestions.map((t) => (
            <button
              key={t}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(t);
                setShowSuggestions(false);
              }}
              className="block w-full px-3 py-2.5 text-left text-[13px] text-[#232D30] hover:bg-[#F5F8F7]"
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Phase 2: identification and baseline — the priority list, claiming a
// topic and choosing a teaching format, and the baseline assessment all
// live here. Phase 3 is delivery/tracking only for what was already
// claimed here — see Phase3 below.
function Phase2({
  priority,
  claims,
  assessments,
  resident,
  cohortCount,
  onClaim,
  onRelease,
  onAssess,
  onExport,
}: {
  priority: PriorityTopic[];
  claims: Claim[];
  assessments: Assessment[];
  resident: Resident;
  cohortCount: number;
  onClaim: (title: string, format: string, deliverDate: string, deliverTime: string, deliverLocation: string) => void;
  onRelease: (id: string) => void;
  onAssess: (phase: "baseline" | "followup", score: number) => void;
  onExport: () => void;
}) {
  const [formats, setFormats] = useState<Record<string, string>>({});
  const [customFormats, setCustomFormats] = useState<Record<string, string>>({});
  const [deliverDates, setDeliverDates] = useState<Record<string, string>>({});
  const [deliverTimes, setDeliverTimes] = useState<Record<string, string>>({});
  const [deliverLocations, setDeliverLocations] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const claimedCount = new Set(claims.map((c) => c.topic_title)).size;
  const fairShare = cohortCount > 0 ? Math.ceil(priority.length / cohortCount) : null;
  const filtered = priority.filter((p) => p.title.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <>
      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-bold text-[#0E1A1C]">Priority educational needs</h3>
            <p className="mt-1 text-[12.5px] text-[#232D30]">Claim the ones you'll build something on over months 4–6.</p>
          </div>
          {priority.length > 0 && (
            <button onClick={onExport} className="whitespace-nowrap rounded-xl bg-[#F5F8F7] px-3 py-2 text-xs font-bold text-[#064B45]">
              Export (CSV)
            </button>
          )}
        </div>
        <p className="mt-2 text-[11px] text-[#3F4C50]">
          The export includes every flagged topic's 5-Likert breakdown, so your program director can see exactly
          what to prep questions on.
        </p>
        {priority.length === 0 ? (
          <div className="mt-3 text-center text-sm text-[#3F4C50]">Nothing scored below {THRESHOLD} this cycle.</div>
        ) : (
          <>
            <div className="mt-2.5 rounded-xl bg-[#F5F8F7] px-3 py-2.5 text-[12px] font-semibold text-[#232D30]">
              {priority.length} topic{priority.length === 1 ? "" : "s"} flagged · {claimedCount} claimed so far
              {fairShare != null && cohortCount > 0 && (
                <> · about {fairShare} each for {cohortCount} resident{cohortCount === 1 ? "" : "s"} to split it fairly</>
              )}
              .
            </div>
            {priority.length > 5 && (
              <TopicSearchInput topics={priority.map((p) => p.title)} value={search} onChange={setSearch} />
            )}
            {filtered.map((p) => {
              const claimsForTopic = claims.filter((c) => c.topic_title === p.title);
              const mineClaim = claimsForTopic.find((c) => c.resident_id === resident.id);
              const chosen = formats[p.title] ?? "";
              return (
                <div key={p.title} className="border-t border-[#E2EAE9] py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[14.5px] font-bold text-[#0E1A1C]">{p.title}</div>
                      <div className="text-xs text-[#3F4C50]">
                        {claimsForTopic.length ? `Claimed by ${claimsForTopic.length} resident${claimsForTopic.length > 1 ? "s" : ""}` : "Not yet claimed"}
                      </div>
                    </div>
                    <span className="whitespace-nowrap rounded-lg bg-[#FAEBD4] px-2 py-1 font-mono text-[10px] font-semibold uppercase text-[#8F5205]">
                      {p.overall.toFixed(2)}
                    </span>
                  </div>
                  <LikertBreakdown perItem={p.perItem} />
                  {claimsForTopic.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1.5">
                      {claimsForTopic.map((c) => {
                        const when = formatWhenWhere(c.deliver_date, c.deliver_time, c.deliver_location);
                        return (
                          <div key={c.id} className="rounded-xl bg-[#F5F8F7] px-3 py-2 text-[12.5px] text-[#232D30]">
                            {c.resident_id === resident.id ? "You claimed this" : "Claimed"}: {c.format}
                            {when && <div className="mt-0.5 text-[11px] font-bold text-[#2B5F8A]">{when}</div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {mineClaim ? (
                    <button onClick={() => onRelease(mineClaim.id)} className="mt-1.5 text-xs font-semibold text-[#3F4C50]">
                      Release this topic
                    </button>
                  ) : (
                    <>
                      <select
                        value={chosen}
                        onChange={(e) => setFormats((f) => ({ ...f, [p.title]: e.target.value }))}
                        className="input mt-2"
                      >
                        <option value="" disabled>
                          Choose how you'll teach it…
                        </option>
                        {CLAIM_FORMATS.map((f) => (
                          <option key={f}>{f}</option>
                        ))}
                        <option value={OTHER_FORMAT}>Other…</option>
                      </select>
                      {chosen === OTHER_FORMAT && (
                        <input
                          value={customFormats[p.title] ?? ""}
                          onChange={(e) => setCustomFormats((c) => ({ ...c, [p.title]: e.target.value }))}
                          placeholder="Describe how you'll teach it"
                          className="input mt-2"
                        />
                      )}
                      <div className="mt-2 flex gap-2">
                        <input
                          type="date"
                          value={deliverDates[p.title] ?? ""}
                          onChange={(e) => setDeliverDates((d) => ({ ...d, [p.title]: e.target.value }))}
                          className="input flex-1"
                        />
                        <input
                          type="time"
                          value={deliverTimes[p.title] ?? ""}
                          onChange={(e) => setDeliverTimes((t) => ({ ...t, [p.title]: e.target.value }))}
                          className="input flex-1"
                        />
                      </div>
                      <input
                        value={deliverLocations[p.title] ?? ""}
                        onChange={(e) => setDeliverLocations((l) => ({ ...l, [p.title]: e.target.value }))}
                        placeholder="Where (optional)"
                        className="input mt-2"
                      />
                      <div className="mt-1 text-[10.5px] text-[#3F4C50]">
                        Day, time, and location are all optional, and visible to the rest of {resident.pgy} once
                        set.
                      </div>
                      <button
                        onClick={() =>
                          onClaim(
                            p.title,
                            chosen === OTHER_FORMAT ? (customFormats[p.title] ?? "").trim() : chosen,
                            deliverDates[p.title] ?? "",
                            deliverTimes[p.title] ?? "",
                            deliverLocations[p.title] ?? "",
                          )
                        }
                        disabled={!chosen || (chosen === OTHER_FORMAT && !(customFormats[p.title] ?? "").trim())}
                        className="mt-2 w-full rounded-xl bg-[#0E7C72] py-2.5 text-sm font-bold text-white disabled:opacity-50"
                      >
                        Claim this topic
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
      <AssessmentCard
        phase="baseline"
        label="Baseline assessment"
        desc="Taken now, before remediation begins."
        assessments={assessments}
        resident={resident}
        cohortCount={cohortCount}
        onAssess={onAssess}
      />
    </>
  );
}

// Phase 3: resident-led remediation — tracking what was already claimed
// in Phase 2 (delivered, scholarly output, shared readings). No claiming
// UI here; that only happens in Phase 2.
function Phase3({
  mine,
  resources,
  onDeliver,
  onUndoDeliver,
  onScholarly,
  onUndoScholarly,
  onShare,
  onDeleteResource,
  onUpdateResource,
  onDownloadFile,
  onExportNotes,
  onUpdateDetails,
}: {
  mine: Claim[];
  resources: Resource[];
  onDeliver: (id: string) => void;
  onUndoDeliver: (id: string) => void;
  onScholarly: (id: string) => void;
  onUndoScholarly: (id: string) => void;
  onShare: (title: string, source: string, url: string, takeaway: string, file: File | null) => void;
  onDeleteResource: (id: string) => void;
  onUpdateResource: (id: string, source: string, url: string, takeaway: string, file: File | null) => void;
  onDownloadFile: (path: string, name: string) => void;
  onExportNotes: (title: string) => void;
  onUpdateDetails: (id: string, deliverDate: string, deliverTime: string, deliverLocation: string) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-2 text-left">
        <h3 className="font-bold text-[#0E1A1C]">What you committed to</h3>
        <span className={`shrink-0 text-xl font-extrabold text-[#3F4C50] transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && mine.length > 0 && (
        <p className="mt-1 text-[11px] leading-relaxed text-[#3F4C50]">
          When you deliver, consider all 5 Likert items and try to cover them all.
        </p>
      )}
      {!open ? null : mine.length === 0 ? (
        <div className="mt-3 text-center text-sm text-[#3F4C50]">You didn't claim any topics this cycle.</div>
      ) : (
        mine.map((c) => (
          <CommittedTopicRow
            key={c.id}
            claim={c}
            resources={resources.filter((r) => r.topic_title === c.topic_title)}
            onDeliver={onDeliver}
            onUndoDeliver={onUndoDeliver}
            onScholarly={onScholarly}
            onUndoScholarly={onUndoScholarly}
            onShare={onShare}
            onDeleteResource={onDeleteResource}
            onUpdateResource={onUpdateResource}
            onDownloadFile={onDownloadFile}
            onExportNotes={onExportNotes}
            onUpdateDetails={onUpdateDetails}
          />
        ))
      )}
    </div>
  );
}

function FilePicker({ file, onChange }: { file: File | null; onChange: (f: File | null) => void }) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] font-semibold text-[#3F4C50]">Upload the paper (optional, PDF or image, up to 20MB)</div>
      <div className="flex items-center gap-2">
        <span className="cursor-pointer whitespace-nowrap rounded-lg bg-[#EAEFEE] px-3 py-1.5 text-[11px] font-bold text-[#232D30]">
          Choose file
        </span>
        {file && <span className="truncate text-[11px] text-[#3F4C50]">{file.name}</span>}
        <input
          type="file"
          accept="application/pdf,image/png,image/jpeg"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          className="hidden"
        />
      </div>
    </label>
  );
}

function ResourceRow({
  resource,
  onDelete,
  onUpdate,
  onDownloadFile,
}: {
  resource: Resource;
  onDelete: (id: string) => void;
  onUpdate: (id: string, source: string, url: string, takeaway: string, file: File | null) => void;
  onDownloadFile: (path: string, name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [source, setSource] = useState(resource.source);
  const [url, setUrl] = useState(resource.url ?? "");
  const [takeaway, setTakeaway] = useState(resource.takeaway);
  const [file, setFile] = useState<File | null>(null);

  if (editing) {
    return (
      <div className="mt-2 flex flex-col gap-2 border-t border-[#E2EAE9] pt-2">
        <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Where it's from (e.g. JAAD)" className="input" />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link" className="input" />
        <textarea value={takeaway} onChange={(e) => setTakeaway(e.target.value)} placeholder="What a co-resident should know" className="input min-h-[60px]" />
        <FilePicker file={file} onChange={setFile} />
        {resource.file_name && !file && (
          <div className="text-[11px] text-[#3F4C50]">Current file: {resource.file_name} · choose a new one to replace it</div>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => {
              onUpdate(resource.id, source, url, takeaway, file);
              setEditing(false);
            }}
            className="flex-1 rounded-xl bg-[#0E7C72] py-2 text-xs font-bold text-white"
          >
            Save
          </button>
          <button onClick={() => setEditing(false)} className="flex-1 rounded-xl bg-[#EAEFEE] py-2 text-xs font-bold text-[#232D30]">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 flex items-start justify-between gap-2 border-t border-[#E2EAE9] pt-2">
      <div className="text-[12px] text-[#232D30]">
        <div className="font-semibold">{resource.source}</div>
        <p className="mt-0.5">{resource.takeaway}</p>
        {resource.file_path && resource.file_name && (
          <button
            onClick={() => onDownloadFile(resource.file_path!, resource.file_name!)}
            className="mt-1 text-[11px] font-bold text-[#0E7C72]"
          >
            Download {resource.file_name}
          </button>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <button onClick={() => setEditing(true)} className="text-[11px] font-semibold text-[#3F4C50]">
          Edit
        </button>
        <button onClick={() => onDelete(resource.id)} className="text-[11px] font-semibold text-[#93393E]">
          Delete
        </button>
      </div>
    </div>
  );
}

function ResourceShare({
  title,
  resources,
  onShare,
  onDelete,
  onUpdate,
  onDownloadFile,
}: {
  title: string;
  resources: Resource[];
  onShare: (title: string, source: string, url: string, takeaway: string, file: File | null) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, source: string, url: string, takeaway: string, file: File | null) => void;
  onDownloadFile: (path: string, name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState("");
  const [url, setUrl] = useState("");
  const [takeaway, setTakeaway] = useState("");
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="mt-3 rounded-xl bg-[#F5F8F7] p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#232D30]">
          {resources.length === 0
            ? "No shared readings yet"
            : `${resources.length} shared reading${resources.length === 1 ? "" : "s"} on this condition`}
        </span>
        <button onClick={() => setOpen((o) => !o)} className="text-xs font-bold text-[#0E7C72]">
          {open ? "Done" : resources.length ? "Share another" : "Share a paper"}
        </button>
      </div>
      {resources.map((r) => (
        <ResourceRow key={r.id} resource={r} onDelete={onDelete} onUpdate={onUpdate} onDownloadFile={onDownloadFile} />
      ))}
      {open && (
        <div className="mt-2 flex flex-col gap-2">
          <p className="text-[11px] leading-relaxed text-[#3F4C50]">
            You can write a summary, note what stood out, or upload the paper itself (a PDF, or a photo of the
            highlighted pages).
          </p>
          <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Where it's from (e.g. JAAD)" className="input" />
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link" className="input" />
          <textarea value={takeaway} onChange={(e) => setTakeaway(e.target.value)} placeholder="What a co-resident should know" className="input min-h-[60px]" />
          <FilePicker file={file} onChange={setFile} />
          <button
            onClick={() => {
              onShare(title, source, url, takeaway, file);
              setSource("");
              setUrl("");
              setTakeaway("");
              setFile(null);
            }}
            className="rounded-xl bg-[#0E7C72] py-2.5 text-sm font-bold text-white"
          >
            {resources.length ? "Add another paper" : "Add to this condition"}
          </button>
        </div>
      )}
    </div>
  );
}

function CommittedTopicRow({
  claim,
  resources,
  onDeliver,
  onUndoDeliver,
  onScholarly,
  onUndoScholarly,
  onShare,
  onDeleteResource,
  onUpdateResource,
  onDownloadFile,
  onExportNotes,
  onUpdateDetails,
}: {
  claim: Claim;
  resources: Resource[];
  onDeliver: (id: string) => void;
  onUndoDeliver: (id: string) => void;
  onScholarly: (id: string) => void;
  onUndoScholarly: (id: string) => void;
  onShare: (title: string, source: string, url: string, takeaway: string, file: File | null) => void;
  onDeleteResource: (id: string) => void;
  onUpdateResource: (id: string, source: string, url: string, takeaway: string, file: File | null) => void;
  onDownloadFile: (path: string, name: string) => void;
  onExportNotes: (title: string) => void;
  onUpdateDetails: (id: string, deliverDate: string, deliverTime: string, deliverLocation: string) => void;
}) {
  const [showScholarlyInfo, setShowScholarlyInfo] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [editDate, setEditDate] = useState(claim.deliver_date ?? "");
  const [editTime, setEditTime] = useState(claim.deliver_time ?? "");
  const [editLocation, setEditLocation] = useState(claim.deliver_location ?? "");
  const c = claim;
  const statusColor = c.scholarly
    ? "bg-[#EEE7F3] text-[#5E3F73]"
    : c.status === "delivered"
      ? "bg-[#DCEFEB] text-[#064B45]"
      : "bg-[#FAEBD4] text-[#8F5205]";

  return (
    <div className="border-t border-[#E2EAE9] py-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[14.5px] font-bold text-[#0E1A1C]">{c.topic_title}</div>
          <div className="text-xs text-[#3F4C50]">{c.format}</div>
          {!editingDetails &&
            formatWhenWhere(c.deliver_date, c.deliver_time, c.deliver_location) && (
              <div className="mt-0.5 text-[11px] font-bold text-[#2B5F8A]">
                {formatWhenWhere(c.deliver_date, c.deliver_time, c.deliver_location)}
              </div>
            )}
        </div>
        <span className={`whitespace-nowrap rounded-lg px-2 py-1 font-mono text-[10px] font-semibold uppercase ${statusColor}`}>
          {c.scholarly ? "Scholarly" : c.status === "delivered" ? "Delivered" : "Planned"}
        </span>
      </div>
      {editingDetails ? (
        <div className="mt-2 flex flex-col gap-2">
          <div className="flex gap-2">
            <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="input flex-1" />
            <input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} className="input flex-1" />
          </div>
          <input
            value={editLocation}
            onChange={(e) => setEditLocation(e.target.value)}
            placeholder="Where (optional)"
            className="input"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                onUpdateDetails(c.id, editDate, editTime, editLocation);
                setEditingDetails(false);
              }}
              className="flex-1 rounded-xl bg-[#0E7C72] py-2 text-xs font-bold text-white"
            >
              Save
            </button>
            <button onClick={() => setEditingDetails(false)} className="flex-1 rounded-xl bg-[#EAEFEE] py-2 text-xs font-bold text-[#232D30]">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setEditingDetails(true)} className="mt-1.5 text-xs font-semibold text-[#3F4C50]">
          {c.deliver_date || c.deliver_time || c.deliver_location ? "Edit day/time/location" : "Add day/time/location"}
        </button>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {c.status !== "delivered" ? (
          <button onClick={() => onDeliver(c.id)} className="rounded-xl bg-[#0E7C72] px-3 py-2 text-xs font-bold text-white">
            Mark delivered
          </button>
        ) : (
          <button onClick={() => onUndoDeliver(c.id)} className="rounded-xl bg-[#EAEFEE] px-3 py-2 text-xs font-bold text-[#232D30]">
            Undo delivered
          </button>
        )}
        {c.status === "delivered" && !c.scholarly && (
          <button onClick={() => onScholarly(c.id)} className="rounded-xl bg-[#EEE7F3] px-3 py-2 text-xs font-bold text-[#5E3F73]">
            Became scholarly work
          </button>
        )}
        {c.scholarly && (
          <button onClick={() => onUndoScholarly(c.id)} className="rounded-xl bg-[#EEE7F3] px-3 py-2 text-xs font-bold text-[#5E3F73]">
            Undo scholarly work
          </button>
        )}
        {c.status === "delivered" && (
          <button
            type="button"
            onClick={() => setShowScholarlyInfo((o) => !o)}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EEE7F3] text-[10px] font-bold text-[#5E3F73]"
          >
            ?
          </button>
        )}
        {resources.length > 0 && (
          <button
            onClick={() => onExportNotes(c.topic_title)}
            className="rounded-xl bg-[#EAEFEE] px-3 py-2 text-xs font-bold text-[#232D30]"
          >
            Export notes (CSV)
          </button>
        )}
      </div>
      {showScholarlyInfo && (
        <p className="mt-1.5 rounded-xl bg-[#EEE7F3] px-3 py-2 text-[11.5px] leading-relaxed text-[#5E3F73]">
          "Scholarly work" means it led to something beyond the teaching itself, like a poster, a conference
          presentation, or a publication, not just delivering the session.
        </p>
      )}
      <ResourceShare
        title={c.topic_title}
        resources={resources}
        onShare={onShare}
        onDelete={onDeleteResource}
        onUpdate={onUpdateResource}
        onDownloadFile={onDownloadFile}
      />
    </div>
  );
}

function Phase4({
  assessments,
  resident,
  claims,
  cohortCount,
  onAssess,
}: {
  assessments: Assessment[];
  resident: Resident;
  claims: Claim[];
  cohortCount: number;
  onAssess: (phase: "baseline" | "followup", score: number) => void;
}) {
  const baseline = assessments.filter((a) => a.phase === "baseline");
  const followup = assessments.filter((a) => a.phase === "followup");
  const mean = (list: Assessment[]) => (list.length ? list.reduce((a, x) => a + x.score, 0) / list.length : null);
  const bothComplete = cohortCount > 0 && baseline.length >= cohortCount && followup.length >= cohortCount;
  const b = bothComplete ? mean(baseline) : null;
  const f = bothComplete ? mean(followup) : null;

  return (
    <>
      <AssessmentCard
        phase="followup"
        label="Follow-up assessment"
        desc="Same format as the baseline, six months on."
        assessments={assessments}
        resident={resident}
        cohortCount={cohortCount}
        onAssess={onAssess}
      />
      {b != null && f != null && (
        <div className={`rounded-2xl px-4 py-3.5 ${f >= b ? "bg-[#064B45] text-[#DCEEEB]" : "bg-[#8F5205] text-[#FBF1E1]"}`}>
          <div className="font-mono text-[9.5px] uppercase tracking-widest opacity-85">Change since baseline</div>
          <div className="mt-0.5 flex items-center justify-between">
            <div className="text-[11px] opacity-90">
              {b.toFixed(1)}% → {f.toFixed(1)}% · {followup.length} taken
            </div>
            <div className="font-mono text-2xl font-semibold">
              {f >= b ? "+" : ""}
              {(f - b).toFixed(1)}
            </div>
          </div>
        </div>
      )}
      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <h3 className="font-bold text-[#0E1A1C]">What was claimed this cycle</h3>
        {claims.length === 0 ? (
          <div className="mt-3 text-center text-sm text-[#3F4C50]">No topics were claimed this cycle.</div>
        ) : (
          claims.map((c) => (
            <div key={c.id} className="flex items-center justify-between border-t border-[#E2EAE9] py-3">
              <div>
                <div className="text-[14px] font-bold text-[#0E1A1C]">{c.topic_title}</div>
                <div className="text-xs text-[#3F4C50]">{c.format}</div>
              </div>
              <span
                className={`whitespace-nowrap rounded-lg px-2 py-1 font-mono text-[10px] font-semibold uppercase ${
                  c.status === "delivered" ? "bg-[#DCEFEB] text-[#064B45]" : "bg-[#EAEFEE] text-[#3F4C50]"
                }`}
              >
                {c.status === "delivered" ? "Delivered" : "Not delivered"}
              </span>
            </div>
          ))
        )}
      </div>
    </>
  );
}

function AssessmentCard({
  phase,
  label,
  desc,
  assessments,
  resident,
  cohortCount,
  onAssess,
}: {
  phase: "baseline" | "followup";
  label: string;
  desc: string;
  assessments: Assessment[];
  resident: Resident;
  cohortCount: number;
  onAssess: (phase: "baseline" | "followup", score: number) => void;
}) {
  const [score, setScore] = useState("");
  const phaseAssessments = assessments.filter((a) => a.phase === phase);
  const mine = phaseAssessments.find((a) => a.resident_id === resident.id);
  const everyoneIn = cohortCount > 0 && phaseAssessments.length >= cohortCount;
  const mean = everyoneIn ? phaseAssessments.reduce((a, x) => a + x.score, 0) / phaseAssessments.length : null;

  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-[#0E1A1C]">{label}</h3>
          <p className="mt-0.5 text-[12.5px] text-[#3F4C50]">{desc}</p>
        </div>
        <span
          className={`whitespace-nowrap rounded-lg px-2 py-1 font-mono text-[10px] font-semibold uppercase ${
            mine ? "bg-[#DCEFEB] text-[#064B45]" : "bg-[#EAEFEE] text-[#3F4C50]"
          }`}
        >
          {mine ? `${mine.score}%` : "Not taken"}
        </span>
      </div>
      <p className="mt-2 text-[11.5px] leading-relaxed text-[#3F4C50]">
        Enter your own score below · it's yours alone to see until every {resident.pgy} resident has entered
        theirs, then the group average appears here instead of individual scores.
      </p>
      {mean != null ? (
        <div className="mt-3 flex items-center justify-between border-t border-[#E2EAE9] pt-3 text-[12.5px] text-[#232D30]">
          <span>Group average · all {phaseAssessments.length} in</span>
          <b className="font-mono">{mean.toFixed(1)}%</b>
        </div>
      ) : (
        phaseAssessments.length > 0 && (
          <div className="mt-3 border-t border-[#E2EAE9] pt-3 text-[12.5px] text-[#3F4C50]">
            {phaseAssessments.length} of {cohortCount || "?"} entered so far · average shows once everyone's in.
          </div>
        )
      )}
      {!mine && (
        <div className="mt-3 flex gap-2">
          <input
            type="number"
            min={0}
            max={100}
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="0–100"
            className="input flex-1"
          />
          <button
            onClick={() => onAssess(phase, +score)}
            className="whitespace-nowrap rounded-xl bg-[#0E7C72] px-4 py-3 text-sm font-bold text-white"
          >
            Record score
          </button>
        </div>
      )}
    </div>
  );
}

function PhaseCards({ phase }: { phase: 1 | 2 | 3 | 4 }) {
  const cards: { n: 1 | 2 | 3 | 4; title: string; months: string; desc: string }[] = [
    { n: 1, title: "Baseline logging", months: "1–3", desc: "Log routine teaching encounters and rate instructional quality." },
    {
      n: 2,
      title: "Identification and baseline",
      months: "end of 3",
      desc: `Topics averaging below ${THRESHOLD} are flagged as priority educational needs, claimed by residents, and a baseline knowledge assessment is taken.`,
    },
    {
      n: 3,
      title: "Resident-led remediation",
      months: "4–6",
      desc: "Build and deliver on what was claimed in Phase 2: peer-teaching modules, journal clubs, case repositories, and more.",
    },
    { n: 4, title: "Impact evaluation", months: "end of 6", desc: "A follow-up assessment checks whether the learning held." },
  ];
  return (
    <div className="flex flex-col gap-2.5">
      {cards.map((c) => (
        <div
          key={c.n}
          className={`rounded-2xl bg-white p-4 shadow-sm ${
            phase === c.n ? "opacity-100 ring-2 ring-[#0E7C72]" : phase > c.n ? "opacity-50" : "opacity-60"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E7C72]">
                Phase {c.n} · months {c.months}
              </div>
              <h3 className="mt-0.5 text-[14.5px] font-bold text-[#0E1A1C]">{c.title}</h3>
            </div>
            <span
              className={`whitespace-nowrap rounded-lg px-2 py-1 font-mono text-[10px] font-semibold uppercase ${
                phase === c.n ? "bg-[#DCEFEB] text-[#064B45]" : "bg-[#EAEFEE] text-[#3F4C50]"
              }`}
            >
              {phase === c.n ? "Now" : phase > c.n ? "Done" : "Ahead"}
            </span>
          </div>
          <p className="mt-1.5 text-[12.5px] text-[#232D30]">{c.desc}</p>
        </div>
      ))}
    </div>
  );
}

function NoCycleYet({ resident, onStarted }: { resident: Resident; onStarted: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setBusy(true);
    setError("");
    const { error: rpcError } = await supabase.rpc("start_cycle", { p_pgy: resident.pgy });
    setBusy(false);
    if (rpcError) return setError(rpcError.message);
    onStarted();
  }

  return (
    <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
      <h3 className="font-bold text-[#0E1A1C]">Begin Cycle 1</h3>
      <p className="mt-2 text-[13px] leading-relaxed text-[#3F4C50]">
        This starts the 6-month tracking cycle for {resident.pgy}: months 1–3 gather data, months 4–6 are for
        claiming and delivering on the priority educational topics found. Any resident can start it, but make sure
        you've discussed this with the rest of {resident.pgy} and your program director first.
      </p>
      {error && (
        <div className="mt-3 rounded-xl bg-[#F8E4E4] px-3.5 py-2.5 text-sm font-semibold text-[#93393E]">{error}</div>
      )}
      <button
        onClick={start}
        disabled={busy}
        className="mt-4 w-full rounded-2xl bg-[#0E7C72] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#0E7C72]/25 disabled:opacity-60"
      >
        {busy ? "Starting…" : "Begin Cycle 1"}
      </button>
    </div>
  );
}

function StartPhase2({ resident, onStarted }: { resident: Resident; onStarted: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setBusy(true);
    setError("");
    const { error: rpcError } = await supabase.rpc("start_phase2", { p_pgy: resident.pgy });
    setBusy(false);
    if (rpcError) return setError(rpcError.message);
    onStarted();
  }

  return (
    <div className="rounded-2xl bg-[#FAEBD4] p-4 shadow-sm">
      <h3 className="font-bold text-[#8F5205]">3 months are up. Begin identification and baseline?</h3>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#8F5205]">
        This flags every topic scoring below {THRESHOLD} as a priority need, opens claiming (choosing what
        you'll build over months 4–6) and the baseline assessment. Any resident can start this, but talk it over
        with {resident.pgy} and your program director first.
      </p>
      {error && (
        <div className="mt-2.5 rounded-xl bg-[#F8E4E4] px-3.5 py-2.5 text-sm font-semibold text-[#93393E]">{error}</div>
      )}
      <button
        onClick={start}
        disabled={busy}
        className="mt-3 w-full rounded-2xl bg-[#8F5205] py-3 text-sm font-bold text-white disabled:opacity-60"
      >
        {busy ? "Starting…" : "Begin identification and baseline"}
      </button>
    </div>
  );
}

function StartPhase3({ resident, onStarted }: { resident: Resident; onStarted: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setBusy(true);
    setError("");
    const { error: rpcError } = await supabase.rpc("start_phase3", { p_pgy: resident.pgy });
    setBusy(false);
    if (rpcError) return setError(rpcError.message);
    onStarted();
  }

  return (
    <div className="rounded-2xl bg-[#DCEFEB] p-4 shadow-sm">
      <h3 className="font-bold text-[#064B45]">Every topic is claimed. Begin resident-led remediation?</h3>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#064B45]">
        Move into months 4–6 to start building and delivering on what was claimed above. Any resident can start
        this, but talk it over with {resident.pgy} and your program director first.
      </p>
      {error && (
        <div className="mt-2.5 rounded-xl bg-[#F8E4E4] px-3.5 py-2.5 text-sm font-semibold text-[#93393E]">{error}</div>
      )}
      <button
        onClick={start}
        disabled={busy}
        className="mt-3 w-full rounded-2xl bg-[#0E7C72] py-3 text-sm font-bold text-white disabled:opacity-60"
      >
        {busy ? "Starting…" : "Begin resident-led remediation"}
      </button>
    </div>
  );
}
