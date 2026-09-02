import { isBelowThreshold, scoreTopic } from "../lib/domain";
import type { Absence, Rating } from "../types";
import { Pill } from "./Pill";

export interface RowTopic {
  title: string;
  incomplete: boolean;
  soc_covered: boolean;
  image_soc: boolean | null;
  discussed_soc: boolean | null;
  ratings: Rating[];
  absences: Absence[];
}

export function TopicRow({
  topic,
  residentId,
  onOpen,
}: {
  topic: RowTopic;
  residentId: string;
  onOpen: () => void;
}) {
  const mine = topic.ratings.find((r) => r.resident_id === residentId);
  const mineAbsent = topic.absences.find((a) => a.resident_id === residentId);
  const sc = scoreTopic(topic.ratings);
  const hasNotes = topic.ratings.some((r) => r.note?.trim());

  let meta: string;
  let badge: React.ReactNode;
  if (topic.incomplete) {
    meta = "captured — coverage questions still needed";
    badge = <Pill tone="violet">Finish</Pill>;
  } else if (!topic.soc_covered) {
    meta = `image ${topic.image_soc ? "yes" : "no"} · discussed ${topic.discussed_soc ? "yes" : "no"}`;
    badge = <Pill tone="off">No SoC</Pill>;
  } else {
    meta = `${sc ? sc.n : 0} rated`;
    if (mine && sc) badge = <Pill tone={isBelowThreshold(sc.overall) ? "flag" : "default"}>{sc.overall.toFixed(2)}</Pill>;
    else if (mineAbsent) badge = <Pill tone="off">Absent</Pill>;
    else badge = <Pill tone="violet">Rate now</Pill>;
  }

  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center justify-between gap-3 border-t border-[#E2EAE9] px-4 py-3.5 text-left active:bg-[#F7FAFA]"
    >
      <div>
        <div className="flex items-center gap-1.5">
          <div className="text-[14.5px] font-bold text-[#0E1A1C]">{topic.title}</div>
          {hasNotes && <NoteIcon />}
        </div>
        <div className="mt-0.5 text-[11.5px] text-[#5C6B6F]">{meta}</div>
      </div>
      {badge}
    </button>
  );
}

// Marks a topic that has at least one resident's note attached, so it's
// visible from the list without opening every topic to check.
function NoteIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0" aria-label="Has a note">
      <path
        d="M3 2.5h7.5L13 5v8.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1Z"
        stroke="#0E7C72"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M10 2.5V5a1 1 0 0 0 1 1h2" stroke="#0E7C72" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M4.5 8.5h6M4.5 11h4" stroke="#0E7C72" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
