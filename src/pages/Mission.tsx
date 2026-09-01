import { MISSION_CARDS, type MissionTone } from "../lib/content";

const TONE_STYLES: Record<MissionTone, { bg: string; text: string }> = {
  teal: { bg: "#DCEFEB", text: "#064B45" },
  rose: { bg: "#F8E4E4", text: "#93393E" },
  plum: { bg: "#EEE7F3", text: "#5E3F73" },
  amber: { bg: "#FAEBD4", text: "#8F5205" },
  sage: { bg: "#E3EFE5", text: "#3D6B49" },
};

export function Mission({ onBack, onHow }: { onBack: () => void; onHow?: () => void }) {
  return (
    <div className="mx-auto min-h-dvh max-w-md">
      <div className="flex items-center px-4 pt-3.5">
        <button onClick={onBack} className="text-sm font-bold text-[#0E7C72]">
          ‹ Back
        </button>
      </div>
      <div className="px-4 pb-10 pt-2">
        <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E7C72]">
          Mission map
        </div>
        <div className="mt-3 flex flex-col gap-3.5">
          {MISSION_CARDS.map((c, i) => {
            const style = TONE_STYLES[c.tone];
            return (
              <div key={c.title} className="rounded-[22px] p-[22px]" style={{ background: style.bg }}>
                <div className="font-mono text-[11px] font-semibold" style={{ color: style.text }}>
                  {String(i + 1).padStart(2, "0")} / {String(MISSION_CARDS.length).padStart(2, "0")}
                </div>
                <h2 className="mt-3 text-[24px] font-bold tracking-tight text-[#0E1A1C]">{c.eyebrow}</h2>
                <div className="mt-1.5 text-[12.5px] font-bold" style={{ color: style.text }}>
                  {c.title}
                </div>
                <p className="mt-3 text-[14px] leading-relaxed text-[#2E3A3D]">{c.body}</p>
              </div>
            );
          })}
        </div>
        {onHow && (
          <button
            onClick={onHow}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-4 font-bold text-[#0E7C72] shadow-sm"
          >
            How to use it <i className="not-italic">›</i>
          </button>
        )}
      </div>
    </div>
  );
}
