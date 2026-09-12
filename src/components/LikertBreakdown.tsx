import { useState } from "react";
import { isBelowThreshold } from "../lib/domain";
import { RATING_DOMAINS } from "../types";

// The per-domain (5-Likert) breakdown behind a topic's overall score, so
// residents can see exactly where a topic is weak before deciding how to
// address it. Used on the Cycle tab's priority list and on My Profile's
// claimed-topics list.
export function LikertBreakdown({ perItem }: { perItem: Record<string, number> }) {
  const [open, setOpen] = useState(false);
  const available = RATING_DOMAINS.filter((d) => perItem[d.key] != null);
  if (!available.length) return null;
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-[11px] font-semibold text-[#3F4C50]"
      >
        {open ? "Hide" : "Show"} Likert breakdown
        <span className={`text-sm font-extrabold transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="mt-1.5 flex flex-col gap-1 rounded-xl bg-[#F5F8F7] px-3 py-2">
          {available.map((d) => (
            <div key={d.key} className="flex items-center justify-between text-[11.5px] text-[#232D30]">
              <span>{d.name}</span>
              <b className={`font-mono ${isBelowThreshold(perItem[d.key]) ? "text-[#8F5205]" : "text-[#064B45]"}`}>
                {perItem[d.key].toFixed(2)}
              </b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
