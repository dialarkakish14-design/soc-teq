import { useState } from "react";
import { WHY_CARDS } from "../lib/content";
import type { MissionTone } from "../lib/content";

const TONE_STYLES: Record<MissionTone, { bg: string; text: string }> = {
  teal: { bg: "#DCEFEB", text: "#064B45" },
  rose: { bg: "#F8E4E4", text: "#93393E" },
  plum: { bg: "#EEE7F3", text: "#5E3F73" },
  amber: { bg: "#FAEBD4", text: "#8F5205" },
  sage: { bg: "#E3EFE5", text: "#3D6B49" },
};

export function WhyThisMatters({ onBack }: { onBack: () => void }) {
  const [open, setOpen] = useState<Set<number>>(new Set());
  function toggle(i: number) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <div className="mx-auto min-h-dvh max-w-md">
      <div className="flex items-center px-4 pt-3.5">
        <button onClick={onBack} className="text-sm font-bold text-[#0E7C72]">
          ‹ Back
        </button>
      </div>
      <div className="px-4 pb-10 pt-2">
        <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E7C72]">
          Why this matters
        </div>
        <h1 className="mt-2 text-[28px] font-extrabold leading-tight tracking-tight text-[#0E1A1C]">
          The evidence behind SoC-TEQ
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-[#2E3A3D]">
          Every number below is from published research on skin of color education and care — not
          opinion. Tap a card to read more.
        </p>

        <div className="mt-3 flex flex-col gap-3.5">
          {WHY_CARDS.map((c, i) => {
            const style = TONE_STYLES[c.tone];
            const isOpen = open.has(i);
            return (
              <div key={c.title} className="rounded-[22px] p-[22px]" style={{ background: style.bg }}>
                <button onClick={() => toggle(i)} className="flex w-full items-start justify-between gap-3 text-left">
                  <div>
                    <div className="font-mono text-[11px] font-semibold" style={{ color: style.text }}>
                      {c.eyebrow}
                    </div>
                    <h2 className="mt-1.5 text-[19px] font-bold leading-tight tracking-tight text-[#0E1A1C]">
                      {c.title}
                    </h2>
                  </div>
                  <span
                    className={`mt-1 shrink-0 text-2xl font-extrabold transition-transform ${isOpen ? "rotate-180" : ""}`}
                    style={{ color: style.text }}
                  >
                    ▾
                  </span>
                </button>
                {isOpen && <p className="mt-3 text-[14px] leading-relaxed text-[#2E3A3D]">{c.body}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
