import { useState } from "react";

// A small "i" that expands an inline definition — same tap-for-definition
// pattern the build spec calls for on the coverage questions and rating
// items, applied here to jargon like "RM" that otherwise appears with no
// explanation anywhere in the app.
export function InfoTag({ label, definition, dark }: { label: string; definition: string; dark?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 font-mono text-[9.5px] uppercase tracking-widest ${dark ? "opacity-85" : "text-[#5C6B6F]"}`}
      >
        {label}
        <span
          className={`flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] font-bold not-italic ${
            dark ? "bg-white/25" : open ? "bg-[#0E7C72] text-white" : "bg-[#DCEFEB] text-[#064B45]"
          }`}
        >
          i
        </span>
      </button>
      {open && (
        <div
          className={`mt-1.5 max-w-[240px] rounded-xl px-3 py-2.5 text-[11.5px] font-normal normal-case leading-relaxed ${
            dark ? "bg-black/20 text-white" : "bg-[#F0F5F4] text-[#2E3A3D]"
          }`}
        >
          {definition}
        </div>
      )}
    </div>
  );
}
