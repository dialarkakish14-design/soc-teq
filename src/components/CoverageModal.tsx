import { useState } from "react";
import { supabase } from "../lib/supabase";
import { SKIN_TYPES, type SkinType, type Topic } from "../types";

export function CoverageModal({
  topic,
  onClose,
  onSaved,
}: {
  topic: Topic;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [visual, setVisual] = useState<boolean | null>(null);
  const [image, setImage] = useState<boolean | null>(null);
  const [discussed, setDiscussed] = useState<boolean | null>(null);
  const [skinType, setSkinType] = useState<SkinType>("Fitzpatrick IV");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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

    const { error: updateError } = await supabase
      .from("topics")
      .update({
        incomplete: false,
        image_soc: image,
        discussed_soc: discussed,
        skin_type: covered ? skinType : null,
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
          Logger only
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#0E1A1C]">{topic.title}</h1>

        <div className="mt-3 rounded-2xl bg-[#FAEBD4] px-3.5 py-3 text-[12.5px] font-semibold leading-relaxed text-[#8F5205]">
          Before marking coverage, check with the residents in the room that you agree on what was
          shown and discussed.
        </div>

        <div className="mt-5 text-xs font-bold text-[#0E1A1C]">Is this a visually relevant topic?</div>
        <SegButtons value={visual} onChange={setVisual} />

        {visual === false && (
          <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
            <h3 className="font-bold text-[#0E1A1C]">No need to register this</h3>
            <p className="mt-1 text-[13.5px] text-[#2E3A3D]">
              Non-visual topics sit outside SoC-TEQ. Skip it and carry on with the day — nothing is
              lost.
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
                  <label className="mt-3 block">
                    <div className="mb-1.5 text-xs font-bold text-[#0E1A1C]">Skin type shown</div>
                    <select
                      value={skinType}
                      onChange={(e) => setSkinType(e.target.value as SkinType)}
                      className="input"
                    >
                      {SKIN_TYPES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                )}
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
