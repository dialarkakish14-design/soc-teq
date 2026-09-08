import { useState } from "react";
import { supabase } from "../lib/supabase";
import { COVERAGE_DEFINITIONS } from "../lib/content";
import { RATING_DOMAINS, SKIN_TYPES, type Rating, type SkinType, type Topic } from "../types";

const NUANCE_HINT = RATING_DOMAINS.find((d) => d.key === "nuance")?.hint;
const MGMT_HINT = RATING_DOMAINS.find((d) => d.key === "mgmt")?.hint;

export function CoverageModal({
  topic,
  ratings,
  onClose,
  onSaved,
}: {
  topic: Topic;
  ratings?: Rating[];
  onClose: () => void;
  onSaved: () => void;
}) {
  // A topic that's already been through coverage once (editing, not first
  // entry) starts pre-filled with its existing answers instead of blank —
  // "visually relevant" itself isn't stored, but only visually-relevant
  // topics ever reach a non-incomplete state, so that's a safe default.
  const [visual, setVisual] = useState<boolean | null>(topic.incomplete ? null : true);
  const [image, setImage] = useState<boolean | null>(topic.image_soc);
  const [discussed, setDiscussed] = useState<boolean | null>(topic.discussed_soc);
  const [skinType, setSkinType] = useState<SkinType | null>(topic.skin_type ?? null);
  // ?? true: default to "in scope" (unticked) if this is unset, rather than
  // letting a missing/undefined value read as excluded.
  const [nuanceApplicable, setNuanceApplicable] = useState(topic.nuance_applicable ?? true);
  const [nuanceReason, setNuanceReason] = useState(topic.nuance_scope_reason ?? "");
  const [mgmtApplicable, setMgmtApplicable] = useState(topic.mgmt_applicable ?? true);
  const [mgmtReason, setMgmtReason] = useState(topic.mgmt_scope_reason ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showDefs, setShowDefs] = useState(false);
  const [showScopeInfo, setShowScopeInfo] = useState(false);
  const isEdit = !topic.incomplete;

  const covered = image === true && discussed === true;

  async function save() {
    if (visual == null) {
      setError("Say whether this is a visually relevant topic.");
      return;
    }
    setBusy(true);
    setError("");

    if (visual === false) {
      // Non-visual topics sit outside the framework and are never stored.
      const { error: delError } = await supabase.from("topics").delete().eq("id", topic.id);
      setBusy(false);
      if (delError) return setError(delError.message);
      onSaved();
      return;
    }

    if (image == null || discussed == null) {
      setBusy(false);
      setError("Answer both coverage questions.");
      return;
    }

    if (covered && skinType == null) {
      setBusy(false);
      setError("Choose which skin type was shown (or Not sure).");
      return;
    }

    const { error: updateError } = await supabase
      .from("topics")
      .update({
        incomplete: false,
        image_soc: image,
        discussed_soc: discussed,
        skin_type: covered ? skinType : null,
        nuance_applicable: covered ? nuanceApplicable : true,
        nuance_scope_reason: covered && !nuanceApplicable ? nuanceReason.trim() : null,
        mgmt_applicable: covered ? mgmtApplicable : true,
        mgmt_scope_reason: covered && !mgmtApplicable ? mgmtReason.trim() : null,
      })
      .eq("id", topic.id);
    setBusy(false);
    if (updateError) return setError(updateError.message);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-[#F2F6F5] p-5 sm:rounded-3xl">
        <button onClick={onClose} className="text-sm font-bold text-[#0E7C72]">
          ‹ Cancel
        </button>
        <div className="mt-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E7C72]">
          Logger only {isEdit ? "· editing" : ""}
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#0E1A1C]">{topic.title}</h1>

        <div className="mt-3 rounded-2xl bg-[#FAEBD4] px-3.5 py-3 text-[12.5px] font-semibold leading-relaxed text-[#8F5205]">
          Before marking coverage, check with the residents in the room that you agree on what was
          shown and discussed.
        </div>

        <div className="mt-3 rounded-2xl bg-white shadow-sm">
          <button
            onClick={() => setShowDefs((s) => !s)}
            className="flex w-full items-center justify-between gap-2 px-3.5 py-3 text-left"
          >
            <span className="text-[13px] font-bold text-[#0E7C72]">What counts?</span>
            <span className={`shrink-0 text-lg font-extrabold text-[#5C6B6F] transition-transform ${showDefs ? "rotate-180" : ""}`}>
              ▾
            </span>
          </button>
          {showDefs && (
            <div className="flex flex-col gap-2.5 px-3.5 pb-3.5">
              {COVERAGE_DEFINITIONS.map((d, i) => {
                const tones = [
                  { bg: "#F8E4E4", text: "#93393E" },
                  { bg: "#DCE8F3", text: "#2B5F8A" },
                  { bg: "#EEE7F3", text: "#5E3F73" },
                ];
                const tone = tones[i % tones.length];
                return (
                  <div key={d.title} className="rounded-2xl p-3.5" style={{ background: tone.bg }}>
                    <div className="text-[12.5px] font-bold" style={{ color: tone.text }}>
                      {d.title}
                    </div>
                    <p className="mt-1.5 text-[13px] leading-[1.6] text-[#2E3A3D]">{d.body}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {isEdit && ratings && ratings.length > 0 && (
          <div className="mt-3 rounded-2xl bg-[#F8E4E4] px-3.5 py-3 text-[12.5px] font-semibold leading-relaxed text-[#93393E]">
            {ratings.length} resident{ratings.length === 1 ? " has" : "s have"} already rated this topic. Changing
            coverage here won't remove those ratings, but may affect whether this topic still counts as covered.
          </div>
        )}

        <div className="mt-5 text-xs font-bold text-[#0E1A1C]">Is this a visually relevant topic?</div>
        <SegButtons value={visual} onChange={setVisual} />

        {visual === false && (
          <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
            <h3 className="font-bold text-[#0E1A1C]">No need to register this</h3>
            <p className="mt-1 text-[13.5px] text-[#2E3A3D]">
              Non-visual topics sit outside SoC-TEQ. No need to register it.
            </p>
          </div>
        )}

        {visual === true && (
          <>
            <div className="mt-5 text-xs font-bold text-[#0E1A1C]">
              Was an image of Fitzpatrick IV–VI shown?
            </div>
            <SegButtons value={image} onChange={setImage} />

            <div className="mt-5 text-xs font-bold text-[#0E1A1C]">
              Was skin of color explicitly discussed?
            </div>
            <SegButtons value={discussed} onChange={setDiscussed} />

            {image != null && discussed != null && (
              <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-[#0E1A1C]">
                      Skin of color {covered ? "covered" : "not covered"}
                    </h3>
                    <p className="mt-1 text-[13.5px] text-[#2E3A3D]">
                      {covered ? "Your cohort can rate it now." : "Counts as a visually relevant topic that wasn't covered."}
                    </p>
                  </div>
                  <span
                    className={`whitespace-nowrap rounded-lg px-2 py-1 font-mono text-[10px] font-semibold uppercase ${
                      covered ? "bg-[#DCEFEB] text-[#064B45]" : "bg-[#EAEFEE] text-[#5C6B6F]"
                    }`}
                  >
                    {covered ? "Yes" : "No"}
                  </span>
                </div>
                {covered && (
                  <div className="mt-3">
                    <div className="mb-1.5 text-xs font-bold text-[#0E1A1C]">Skin type shown</div>
                    <div className="flex flex-wrap gap-2">
                      {SKIN_TYPES.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSkinType(s)}
                          className={`rounded-2xl border-[1.5px] px-3.5 py-2.5 text-[13px] font-bold ${
                            skinType === s
                              ? "border-[#0E7C72] bg-[#0E7C72] text-white"
                              : "border-[#E2EAE9] bg-white text-[#2E3A3D]"
                          }`}
                        >
                          {s === "Not specified" ? "Not sure" : s.replace("Fitzpatrick ", "")}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {covered && (
              <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
                <button
                  onClick={() => setShowScopeInfo((s) => !s)}
                  className="flex w-full items-center justify-between gap-2 text-left"
                >
                  <h3 className="font-bold text-[#0E1A1C]">Domains outside this session's scope</h3>
                  <span
                    className={`shrink-0 text-lg font-extrabold text-[#5C6B6F] transition-transform ${showScopeInfo ? "rotate-180" : ""}`}
                  >
                    ▾
                  </span>
                </button>
                {showScopeInfo && (
                  <p className="mt-1 text-[12.5px] leading-relaxed text-[#2E3A3D]">
                    Check with the residents present before marking a domain below. Only select a domain when
                    that area of teaching was genuinely outside the scope of the session, not when it was
                    relevant but simply wasn't covered for skin of color.
                  </p>
                )}

                <ScopeCheckbox
                  label="Nuance"
                  hint={NUANCE_HINT}
                  excluded={!nuanceApplicable}
                  onToggle={() => setNuanceApplicable((a) => !a)}
                  reason={nuanceReason}
                  onReasonChange={setNuanceReason}
                />
                <ScopeCheckbox
                  label="Management"
                  hint={MGMT_HINT}
                  excluded={!mgmtApplicable}
                  onToggle={() => setMgmtApplicable((a) => !a)}
                  reason={mgmtReason}
                  onReasonChange={setMgmtReason}
                />
              </div>
            )}
          </>
        )}

        {error && (
          <div className="mt-4 rounded-xl bg-[#F8E4E4] px-3.5 py-2.5 text-sm font-semibold text-[#93393E]">
            {error}
          </div>
        )}

        <button
          onClick={save}
          disabled={busy}
          className="mt-5 w-full rounded-2xl bg-[#0E7C72] py-4 font-bold text-white shadow-lg shadow-[#0E7C72]/25 disabled:opacity-60"
        >
          {busy ? "Saving…" : visual === false ? "Skip this topic" : "Save coverage"}
        </button>
      </div>
    </div>
  );
}

function ScopeCheckbox({
  label,
  hint,
  excluded,
  onToggle,
  reason,
  onReasonChange,
}: {
  label: string;
  hint?: string;
  excluded: boolean;
  onToggle: () => void;
  reason: string;
  onReasonChange: (v: string) => void;
}) {
  const [showHint, setShowHint] = useState(false);
  return (
    <div className="mt-3 border-t border-[#E2EAE9] pt-3 first:mt-2 first:border-t-0 first:pt-0">
      <div className="flex items-center gap-2.5">
        <button type="button" onClick={onToggle} className="flex flex-1 items-center gap-2.5 text-left">
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-[1.5px] text-xs font-bold ${
              excluded ? "border-[#0E7C72] bg-[#0E7C72] text-white" : "border-[#C9D3D2] bg-white"
            }`}
          >
            {excluded ? "✓" : ""}
          </span>
          <span className="text-[13.5px] font-semibold text-[#0E1A1C]">{label}</span>
          {excluded && (
            <span className="whitespace-nowrap rounded-lg bg-[#DCEFEB] px-2 py-0.5 font-mono text-[9.5px] font-semibold uppercase text-[#064B45]">
              Excluded
            </span>
          )}
        </button>
        {hint && (
          <button
            type="button"
            onClick={() => setShowHint((s) => !s)}
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
              showHint ? "bg-[#0E7C72] text-white" : "bg-[#EAEFEE] text-[#5C6B6F]"
            }`}
            aria-label={`What does ${label} mean?`}
          >
            ?
          </button>
        )}
      </div>
      {showHint && hint && (
        <p className="mt-1.5 pl-[30px] text-[11.5px] italic leading-relaxed text-[#5C6B6F]">{hint}</p>
      )}
      <div className="mt-2 pl-[30px]">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-[#5C6B6F]">
          Why was this outside the session's scope? <span className="font-normal normal-case">· optional</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="e.g. This was a diagnosis-only session; management was not addressed."
          className="input mt-1 min-h-[56px]"
        />
      </div>
    </div>
  );
}

function SegButtons({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="mt-1.5 flex gap-2">
      {[true, false].map((v) => (
        <button
          key={String(v)}
          onClick={() => onChange(v)}
          className={`flex-1 rounded-2xl border-[1.5px] py-3 text-sm font-bold ${
            value === v ? "border-[#0E7C72] bg-[#0E7C72] text-white" : "border-[#E2EAE9] bg-white text-[#2E3A3D]"
          }`}
        >
          {v ? "Yes" : "No"}
        </button>
      ))}
    </div>
  );
}
