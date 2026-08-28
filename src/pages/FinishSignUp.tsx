import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Pgy, ProgramPublic } from "../types";

const PGY_LEVELS: Pgy[] = ["PGY-2", "PGY-3", "PGY-4"];

// Shown whenever a signed-in auth user has no residents row yet — most often
// right after clicking an email confirmation link, since that can open in a
// different browser/tab than the one signup happened in, so there's no
// guarantee the in-progress form data survived to auto-finish the join.
export function FinishSignUp({ email, onDone }: { email: string; onDone: () => void }) {
  const [programs, setPrograms] = useState<ProgramPublic[]>([]);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [pgy, setPgy] = useState<Pgy>("PGY-2");
  const [programId, setProgramId] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [precourse, setPrecourse] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase
      .from("programs_public")
      .select("*")
      .then(({ data }) => setPrograms((data as ProgramPublic[]) ?? []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!fullName.trim()) return setError("Add your full name.");
    if (!/^[a-z0-9._-]{3,}$/.test(username.trim().toLowerCase())) {
      return setError("Pick a username of at least 3 characters, letters and numbers only.");
    }
    if (!programId) return setError("Choose your dermatology program.");
    if (!accessCode.trim()) return setError("Add your program access code.");
    if (!precourse) return setError("Confirm you've completed the pre-course before joining.");

    setBusy(true);
    const { error: rpcError } = await supabase.rpc("complete_signup", {
      p_program_id: programId,
      p_pgy: pgy,
      p_full_name: fullName.trim(),
      p_username: username.trim().toLowerCase(),
      p_access_code: accessCode.trim(),
      p_precourse: precourse,
    });
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    localStorage.removeItem("socteq_pending_signup");
    onDone();
  }

  return (
    <div className="mx-auto min-h-dvh max-w-md px-5 py-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-[#0E1A1C]">Finish joining</h1>
      <p className="mt-2 text-sm text-[#414F52]">
        Your email ({email}) is confirmed. Finish setting up your resident profile to continue.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="block">
          <div className="mb-1.5 text-xs font-bold text-[#0E1A1C]">Full name</div>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Diala Kakish" className="input" />
        </label>

        <label className="block">
          <div className="mb-1.5 text-xs font-bold text-[#0E1A1C]">Username</div>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Letters and numbers, no spaces"
            autoCapitalize="none"
            className="input"
          />
        </label>

        <label className="block">
          <div className="mb-1.5 text-xs font-bold text-[#0E1A1C]">PGY level</div>
          <select value={pgy} onChange={(e) => setPgy(e.target.value as Pgy)} className="input">
            {PGY_LEVELS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <div className="mb-1.5 text-xs font-bold text-[#0E1A1C]">Dermatology program</div>
          <select value={programId} onChange={(e) => setProgramId(e.target.value)} className="input">
            <option value="">Select your program…</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <div className="mb-1.5 text-xs font-bold text-[#0E1A1C]">Program access code</div>
          <input
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            placeholder="··········"
            autoComplete="off"
            className="input text-center font-mono uppercase tracking-widest"
          />
        </label>

        <button
          type="button"
          onClick={() => setPrecourse((v) => !v)}
          className="mt-2 flex items-start gap-3 rounded-2xl bg-white p-4 text-left text-xs font-semibold leading-relaxed text-[#414F52] shadow-sm"
        >
          <span
            className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 ${
              precourse ? "border-[#0E7C72] bg-[#0E7C72] text-white" : "border-[#E2EAE9]"
            }`}
          >
            {precourse ? "✓" : ""}
          </span>
          I've completed the SoC-TEQ pre-course and understand the coverage criteria.
        </button>

        {error && (
          <div className="rounded-xl bg-[#F8E4E4] px-3.5 py-2.5 text-sm font-semibold text-[#93393E]">{error}</div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-2 rounded-2xl bg-[#0E7C72] py-4 font-bold text-white shadow-lg shadow-[#0E7C72]/25 disabled:opacity-60"
        >
          {busy ? "Joining…" : "Finish joining"}
        </button>

        <button type="button" onClick={() => supabase.auth.signOut()} className="mt-1 text-sm font-semibold text-[#8A999D]">
          Log out
        </button>
      </form>
    </div>
  );
}
