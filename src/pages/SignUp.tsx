import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { buildEmailRedirectUrl } from "../lib/pendingSignup";
import type { Pgy, ProgramPublic } from "../types";

const PGY_LEVELS: Pgy[] = ["PGY-2", "PGY-3", "PGY-4"];

export function SignUp({ onDone, onGoLogin }: { onDone: () => void; onGoLogin: () => void }) {
  const [programs, setPrograms] = useState<ProgramPublic[]>([]);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [pgy, setPgy] = useState<Pgy>("PGY-2");
  const [programId, setProgramId] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [precourse, setPrecourse] = useState(false);
  const [error, setError] = useState("");
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
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
    if (password.length < 6) return setError("Password needs at least 6 characters.");
    if (!email.trim()) return setError("Add your email.");
    if (!programId) return setError("Choose your dermatology program.");
    if (!accessCode.trim()) return setError("Add your program access code.");
    if (!precourse) return setError("Confirm you've completed the pre-course before joining.");

    setBusy(true);
    try {
      const pending = {
        p_program_id: programId,
        p_pgy: pgy,
        p_full_name: fullName.trim(),
        p_username: username.trim().toLowerCase(),
        p_access_code: accessCode.trim(),
        p_precourse: precourse,
      };

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          // Carries the profile fields through the confirmation link itself,
          // so completing the join works regardless of which device/browser
          // the resident opens the email on.
          emailRedirectTo: buildEmailRedirectUrl(pending),
        },
      });
      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      // Supabase won't say "email already registered" outright (that would
      // let anyone mass-check which emails exist) — instead it silently
      // no-ops and returns an empty identities array for an existing email,
      // versus one identity for a genuinely new signup. That's the only way
      // to tell the two cases apart on this end.
      if (signUpData.user && signUpData.user.identities?.length === 0) {
        setError("An account with that email already exists. Try logging in, or use \"Forgot your password?\" if you don't remember it.");
        return;
      }

      if (!signUpData.session) {
        setPendingConfirmation(true);
        return;
      }

      const { error: rpcError } = await supabase.rpc("complete_signup", pending);
      if (rpcError) {
        setError(rpcError.message);
        return;
      }

      onDone();
    } finally {
      setBusy(false);
    }
  }

  if (pendingConfirmation) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-bold text-[#0E1A1C]">Check your email</h1>
        <p className="text-sm text-[#414F52]">
          We sent a confirmation link to {email}. Confirm it, then log in to finish joining your
          program.
        </p>
        <button
          onClick={onGoLogin}
          className="mt-2 rounded-2xl bg-[#0E7C72] py-3 font-semibold text-white"
        >
          Go to log in
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh max-w-md px-5 py-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-[#0E1A1C]">Create your account</h1>
      <p className="mt-2 text-sm text-[#414F52]">You'll need your program's access code to join.</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <Field label="Full name">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Diala Kakish"
            className="input"
          />
        </Field>

        <Field label="Username">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Letters and numbers, no spaces"
            autoCapitalize="none"
            className="input"
          />
        </Field>

        <Field label="Password">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="input pr-16"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-[#DCEFEB] px-2.5 py-1.5 text-xs font-bold text-[#064B45]"
            >
              {showPassword ? "hide" : "show"}
            </button>
          </div>
          <div className="mt-1.5 text-xs text-[#8A999D]">Forgotten passwords are reset by email.</div>
        </Field>

        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@med.wayne.edu"
            className="input"
          />
        </Field>

        <Field label="PGY level">
          <select value={pgy} onChange={(e) => setPgy(e.target.value as Pgy)} className="input">
            {PGY_LEVELS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>

        <Field label="Dermatology program">
          <select
            value={programId}
            onChange={(e) => setProgramId(e.target.value)}
            className="input"
          >
            <option value="">Select your program…</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Program access code">
          <input
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            placeholder="··········"
            autoComplete="off"
            className="input text-center font-mono uppercase tracking-widest"
          />
        </Field>

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
          <div className="rounded-xl bg-[#F8E4E4] px-3.5 py-2.5 text-sm font-semibold text-[#93393E]">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-2 rounded-2xl bg-[#0E7C72] py-4 font-bold text-white shadow-lg shadow-[#0E7C72]/25 disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create account"}
        </button>

        <div className="text-xs text-[#8A999D]">
          Your name is visible to your cohort. It never appears next to a rating or in exported
          data.
        </div>

        <button type="button" onClick={onGoLogin} className="mt-1 text-sm font-semibold text-[#0E7C72]">
          Already registered? Log in
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-bold text-[#0E1A1C]">{label}</div>
      {children}
    </label>
  );
}
