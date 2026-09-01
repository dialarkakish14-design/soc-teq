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
        <div className="text-[14.5px] font-bold text-[#0E1A1C]">{topic.title}</div>
        <div className="mt-0.5 text-[11.5px] text-[#8A999D]">{meta}</div>
      </div>
      {badge}
    </button>
  );
}
