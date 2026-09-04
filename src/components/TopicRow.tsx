import { isBelowThreshold, scoreTopic } from "../lib/domain";
import type { Absence, Rating, SkinType } from "../types";
import { Pill } from "./Pill";

export interface RowTopic {
  title: string;
  incomplete: boolean;
  soc_covered: boolean;
  image_soc: boolean | null;
  discussed_soc: boolean | null;
  skin_type?: SkinType | null;
  ratings: Rating[];
  absences: Absence[];
}

export function TopicRow({
  topic,
  residentId,
  onOpen,
  showSkinType,
  onEdit,
  onDelete,
}: {
  topic: RowTopic;
  residentId: string;
  onOpen: () => void;
  showSkinType?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
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
    <div className="flex w-full items-center gap-1 border-t border-[#E2EAE9] pr-2">
      <button
        onClick={onOpen}
        className="flex flex-1 items-center justify-between gap-3 px-4 py-3.5 text-left active:bg-[#F7FAFA]"
      >
        <div>
          <div className="flex items-center gap-1.5">
            <div className="text-[14.5px] font-bold text-[#0E1A1C]">{topic.title}</div>
            {hasNotes && <NoteIcon />}
            {showSkinType && topic.soc_covered && topic.skin_type && (
              <span className="whitespace-nowrap rounded-md bg-[#DCEFEB] px-1.5 py-0.5 font-mono text-[9.5px] font-bold text-[#064B45]">
                {topic.skin_type === "Mixed across IV–VI" ? "IV–VI" : topic.skin_type.replace("Fitzpatrick ", "")}
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[11.5px] text-[#5C6B6F]">{meta}</div>
        </div>
        {badge}
      </button>
      {onEdit && (
        <button onClick={onEdit} aria-label="Edit topic" className="shrink-0 rounded-lg p-2 text-[#5C6B6F] active:bg-[#F7FAFA]">
          <EditIcon />
        </button>
      )}
      {onDelete && (
        <button onClick={onDelete} aria-label="Delete topic" className="shrink-0 rounded-lg p-2 text-[#93393E] active:bg-[#F8E4E4]">
          <DeleteIcon />
        </button>
      )}
    </div>
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

function EditIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M11 2.5 13.5 5 5.5 13H3v-2.5L11 2.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3.5 4.5h9M6.5 4.5V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1.5M6.5 7.5v4M9.5 7.5v4M4.5 4.5l.6 8.4a1 1 0 0 0 1 .93h3.8a1 1 0 0 0 1-.93l.6-8.4"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
