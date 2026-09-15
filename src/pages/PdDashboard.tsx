import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { ProgramDirector } from "../types";

// Stage 1 of the PD dashboard: accounts and login work end to end, but the
// actual cross-PGY content (case coverage, cycle results, exports,
// materials browsing) is a separate build. This just confirms who's
// signed in and where they landed.
export function PdDashboard({ pd, onLogout }: { pd: ProgramDirector; onLogout: () => void }) {
  const [programName, setProgramName] = useState("");

  useEffect(() => {
    supabase
      .from("programs_public")
      .select("name")
      .eq("id", pd.program_id)
      .maybeSingle()
      .then(({ data }) => setProgramName((data as { name: string } | null)?.name ?? ""));
  }, [pd.program_id]);

  return (
    <div className="mx-auto min-h-dvh max-w-md px-5 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0E1A1C]">Program Director</h1>
          <p className="mt-1 text-sm text-[#343E42]">{programName || "…"}</p>
        </div>
        <button onClick={onLogout} className="text-sm font-semibold text-[#343E42]">
          Log out
        </button>
      </div>

      <div className="mt-8 rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="font-bold text-[#0E1A1C]">Welcome, {pd.full_name.split(" ")[0]}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#232D30]">
          Your account is set up. The dashboard itself is coming next: case coverage across every
          PGY year, baseline/follow-up results, claimed-topic status, and shared prep materials.
        </p>
        <p className="mt-3 text-[12.5px] leading-relaxed text-[#343E42]">
          You'll see results across every PGY year in {programName || "your program"}, without
          individual resident names attached to anything.
        </p>
      </div>
    </div>
  );
}
