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
  const [forgotMode, setForgotMode] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      // Read straight from the form instead of the username/password state:
      // some browsers/password managers fill the visible input without
      // firing the input event React's onChange relies on, which would
      // otherwise submit a stale (often empty) value on the first attempt.
      const form = new FormData(e.currentTarget);
      const formUsername = String(form.get("username") ?? "").trim();
      const formPassword = String(form.get("password") ?? "");

      const { data: email, error: lookupError } = await supabase.rpc("get_email_for_username", {
        p_username: formUsername,
      });
      if (lookupError || !email) {
        setError("Username or password doesn't match.");
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: formPassword,
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

  if (forgotMode) {
    return <ForgotPassword onBack={() => setForgotMode(false)} />;
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-8">
      <button onClick={onBack} className="mb-2 self-start text-sm font-bold text-[#0E7C72]">
        ‹ Back
      </button>
      <h1 className="text-3xl font-extrabold tracking-tight text-[#0E1A1C]">Log in</h1>
      <p className="mt-2 text-sm text-[#2E3A3D]">Use the username and password you signed up with.</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="block">
          <div className="mb-1.5 text-xs font-bold text-[#0E1A1C]">Username</div>
          <input
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoCapitalize="none"
            autoComplete="username"
            className="input"
          />
        </label>

        <label className="block">
          <div className="mb-1.5 text-xs font-bold text-[#0E1A1C]">Password</div>
          <div className="relative">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
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
          onClick={() => setForgotMode(true)}
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

function ForgotPassword({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/`,
    });
    setBusy(false);
    // Always shows the same message regardless of whether the email is
    // actually registered — otherwise this becomes a way to check which
    // emails have accounts.
    setSent(true);
  }

  if (sent) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-bold text-[#0E1A1C]">Check your email</h1>
        <p className="text-sm text-[#2E3A3D]">
          If an account exists for {email}, a reset link has been sent to it.
        </p>
        <button onClick={onBack} className="mt-2 rounded-2xl bg-[#0E7C72] py-3 font-semibold text-white">
          Back to log in
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-8">
      <button onClick={onBack} className="mb-2 self-start text-sm font-bold text-[#0E7C72]">
        ‹ Back
      </button>
      <h1 className="text-3xl font-extrabold tracking-tight text-[#0E1A1C]">Reset your password</h1>
      <p className="mt-2 text-sm text-[#2E3A3D]">Enter the email you signed up with.</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="block">
          <div className="mb-1.5 text-xs font-bold text-[#0E1A1C]">Email</div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@med.wayne.edu"
            autoCapitalize="none"
            className="input"
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="mt-2 rounded-2xl bg-[#0E7C72] py-4 font-bold text-white shadow-lg shadow-[#0E7C72]/25 disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send reset link"}
        </button>
      </form>
    </div>
  );
}
