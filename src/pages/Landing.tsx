import { PAPER_URL } from "../lib/content";

export function Landing({
  onSignUp,
  onLogin,
  onMission,
  onHow,
  onWhy,
}: {
  onSignUp: () => void;
  onLogin: () => void;
  onMission: () => void;
  onHow: () => void;
  onWhy: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <div
        className="flex flex-1 flex-col px-6 pt-10 text-white"
        style={{ background: "linear-gradient(168deg,#12897E 0%,#0A5850 52%,#06322E 100%)" }}
      >
        <h1 className="text-[38px] font-extrabold leading-[1.04] tracking-tight">
          SoC-TEQ
          <br />
          framework
        </h1>
        <p className="mt-3.5 text-[15px] text-[#C4E4DE]">
          A resident-led framework to quantify and improve the quality of skin of color education
          through data-driven feedback loops.
        </p>
        <p className="mt-3.5 text-[13px] leading-relaxed text-[#9FCFC7]">
          Built on the published SoC-TEQ framework.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2.5 pb-8">
          <button
            onClick={onMission}
            className="flex items-center justify-center gap-1.5 rounded-full bg-white/15 px-3 py-2.5 text-center text-[13px] font-bold text-[#E4F5F1]"
          >
            What is SoC-TEQ? <i className="not-italic opacity-65">›</i>
          </button>
          <button
            onClick={onHow}
            className="flex items-center justify-center gap-1.5 rounded-full bg-white/15 px-3 py-2.5 text-center text-[13px] font-bold text-[#E4F5F1]"
          >
            How to use it <i className="not-italic opacity-65">›</i>
          </button>
          <button
            onClick={onWhy}
            className="flex items-center justify-center gap-1.5 rounded-full bg-white/15 px-3 py-2.5 text-center text-[13px] font-bold text-[#E4F5F1]"
          >
            Why this matters <i className="not-italic opacity-65">›</i>
          </button>
          <a
            href={PAPER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-full bg-white/15 px-3 py-2.5 text-center text-[13px] font-bold text-[#E4F5F1]"
          >
            Read the paper <i className="not-italic opacity-65">↗</i>
          </a>
        </div>
      </div>

      <div className="bg-[#06322E] px-6 pb-8 pt-5">
        <button onClick={onSignUp} className="w-full rounded-2xl bg-white py-4 font-bold text-[#06322E]">
          Create an account
        </button>
        <button onClick={onLogin} className="mt-1 w-full py-3.5 text-[13.5px] font-bold text-[#9CCFC7]">
          Already registered? Log in
        </button>
      </div>
    </div>
  );
}
