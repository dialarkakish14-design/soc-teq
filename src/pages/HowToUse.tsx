import { HOWTO_STEPS } from "../lib/content";

export function HowToUse({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  return (
    <div className="mx-auto min-h-dvh max-w-md">
      <div className="flex items-center px-4 pt-3.5">
        <button onClick={onBack} className="text-sm font-bold text-[#0E7C72]">
          ‹ Back
        </button>
      </div>
      <div className="px-4 pb-10 pt-2">
        <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E7C72]">
          Getting started
        </div>
        <h1 className="mt-2 text-[28px] font-extrabold leading-tight tracking-tight text-[#0E1A1C]">
          How to use SoC-TEQ
        </h1>

        <p className="mt-3 text-[14px] leading-relaxed text-[#2E3A3D]">
          Every day — in your didactics, lectures, grand rounds and clinics — the topics you're
          taught get registered here, along with whether each one covered skin of color, meaning
          Fitzpatrick IV–VI.
        </p>
        <p className="mt-3 text-[14px] leading-relaxed text-[#2E3A3D]">It happens in two parts.</p>

        <div className="mt-3 rounded-2xl bg-[#DCEFEB] p-4">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#064B45]">
            Part 1 · the logger
          </div>
          <p className="mt-2 text-[13.5px] leading-relaxed text-[#2E3A3D]">
            One resident is the logger for the day. For each topic they answer whether it's visually
            relevant, and whether it meets both criteria to count as skin of color covered — an image
            of Fitzpatrick IV–VI, and explicit discussion of skin of color. The cohort talks these
            through together and the logger records the answer.
          </p>
        </div>
        <div className="mt-3 rounded-2xl bg-[#EEE7F3] p-4">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#5E3F73]">
            Part 2 · everyone
          </div>
          <p className="mt-2 text-[13.5px] leading-relaxed text-[#2E3A3D]">
            If both criteria are yes, the topic opens for every resident who was there to rate on the
            five items. Those five ratings are averaged across the cohort, and topics falling below
            3.5 become the priority list for the next remediation cycle.
          </p>
        </div>

        <div className="mt-7 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#E2EAE9]" />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#5C6B6F]">
            The daily flow
          </span>
          <div className="h-px flex-1 bg-[#E2EAE9]" />
        </div>

        <div className="mt-3 flex flex-col gap-3">
          {HOWTO_STEPS.map((s, i) => (
            <div key={s.title} className="flex gap-3.5 rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[10px] bg-[#DCEFEB] text-[13px] font-extrabold text-[#064B45]">
                {i + 1}
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-[#0E1A1C]">{s.title}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-[#2E3A3D]">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-2xl bg-[#FAEBD4] px-3.5 py-3 text-[12.5px] font-semibold leading-relaxed text-[#8F5205]">
          The app records topics, never instructors. Nothing you log identifies who taught the
          session.
        </div>

        <button
          onClick={onDone}
          className="mt-5 w-full rounded-2xl bg-[#0E7C72] py-4 font-bold text-white shadow-lg shadow-[#0E7C72]/25"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
