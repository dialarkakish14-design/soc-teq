import { useState } from "react";
import { supabase } from "../lib/supabase";

export function Login({
  onDone,
  onGoSignUp,
  onBack,
}: {
  onDone: () => void;
  onGoSignUp: () => void;
  onBack: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { data: email, error: lookupError } = await supabase.rpc("get_email_for_username", {
        p_username: username.trim(),
      });
      if (lookupError || !email) {
        setError("Username or password doesn't match.");
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError("Username or password doesn't match.");
        return;
      }
      onDone();
    } finally {
      setBusy(false);
    }
  }

  async function handleForgot() {
    if (!username.trim()) {
      setError("Enter your username first, then tap forgot password.");
      return;
    }
    const { data: email } = await supabase.rpc("get_email_for_username", {
      p_username: username.trim(),
    });
    if (email) {
      await supabase.auth.resetPasswordForEmail(email);
    }
    setError("If that account exists, a reset link has been emailed to it.");
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-8">
      <button onClick={onBack} className="mb-2 self-start text-sm font-bold text-[#0E7C72]">
        ‹ Back
      </button>
      <h1 className="text-3xl font-extrabold tracking-tight text-[#0E1A1C]">Log in</h1>
      <p className="mt-2 text-sm text-[#414F52]">Use the username and password you signed up with.</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="block">
          <div className="mb-1.5 text-xs font-bold text-[#0E1A1C]">Username</div>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoCapitalize="none"
            className="input"
          />
        </label>

        <label className="block">
          <div className="mb-1.5 text-xs font-bold text-[#0E1A1C]">Password</div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
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
        </label>

        <button
          type="button"
          onClick={handleForgot}
          className="-mt-1 self-start text-sm font-semibold text-[#0E7C72] underline underline-offset-2"
        >
          Forgot your password?
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
          {busy ? "Logging in…" : "Log in"}
        </button>

        <button
          type="button"
          onClick={onGoSignUp}
          className="mt-1 text-sm font-semibold text-[#0E7C72]"
        >
          Need an account? Sign up
        </button>
      </form>
    </div>
  );
}
