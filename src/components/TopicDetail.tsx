import { isBelowThreshold, scoreTopic } from "../lib/domain";
import type { Rating } from "../types";

export interface DetailTopic {
  title: string;
  incomplete: boolean;
  soc_covered: boolean;
  image_soc: boolean | null;
  discussed_soc: boolean | null;
  ratings: Rating[];
}

export function TopicDetail({ topic, onClose }: { topic: DetailTopic; onClose: () => void }) {
  const sc = scoreTopic(topic.ratings);
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-[#F2F6F5] p-5 sm:rounded-3xl">
        <button onClick={onClose} className="text-sm font-bold text-[#0E7C72]">
          ‹ Back
        </button>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#0E1A1C]">{topic.title}</h1>
        {topic.incomplete ? (
          <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
            <h3 className="font-bold text-[#0E1A1C]">Not finished</h3>
            <p className="mt-1 text-[13.5px] text-[#2E3A3D]">
              Captured, but the coverage questions were never answered.
            </p>
          </div>
        ) : !topic.soc_covered ? (
          <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
            <h3 className="font-bold text-[#0E1A1C]">Not covered</h3>
            <p className="mt-1 text-[13.5px] text-[#2E3A3D]">
              Image of Fitzpatrick IV–VI: {topic.image_soc ? "yes" : "no"} · Explicitly discussed:{" "}
              {topic.discussed_soc ? "yes" : "no"}
            </p>
          </div>
        ) : !sc ? (
          <div className="mt-4 rounded-2xl bg-white p-6 text-center text-sm text-[#8A999D] shadow-sm">
            No one has rated this yet.
          </div>
        ) : (
          <>
            <div
              className={`mt-4 flex items-center justify-between rounded-2xl px-4 py-3.5 ${
                isBelowThreshold(sc.overall) ? "bg-[#8F5205] text-[#FBF1E1]" : "bg-[#064B45] text-[#DCEEEB]"
              }`}
            >
              <div>
                <div className="font-mono text-[9.5px] uppercase tracking-widest opacity-85">Team score</div>
                <div className="mt-0.5 text-[11px] opacity-90">{sc.n} resident{sc.n === 1 ? "" : "s"} rated</div>
              </div>
              <div className="font-mono text-3xl font-semibold">{sc.overall.toFixed(2)}</div>
            </div>
            <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
              <h3 className="font-bold text-[#0E1A1C]">Item averages</h3>
              {Object.entries(sc.perItem).map(([k, v]) => (
                <div key={k} className="mt-2.5">
                  <div className="flex justify-between text-[12.5px] font-semibold">
                    <span className="capitalize">{k}</span>
                    <span className="font-mono">{v.toFixed(2)}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#EAEFEE]">
                    <div
                      className={`h-full rounded-full ${v < 3.5 ? "bg-[#8F5205]" : "bg-[#0E7C72]"}`}
                      style={{ width: `${(v / 5) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
