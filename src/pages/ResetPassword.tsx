import { useState } from "react";
import { supabase } from "../lib/supabase";

export function ResetPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) return setError("Password needs at least 6 characters.");
    if (password !== confirm) return setError("Passwords don't match.");

    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-bold text-[#0E1A1C]">Password updated</h1>
        <p className="text-sm text-[#2E3A3D]">You can now continue with your new password.</p>
        <button onClick={onDone} className="mt-2 rounded-2xl bg-[#0E7C72] py-3 font-semibold text-white">
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-[#0E1A1C]">Choose a new password</h1>
      <p className="mt-2 text-sm text-[#2E3A3D]">This replaces your old password immediately.</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="block">
          <div className="mb-1.5 text-xs font-bold text-[#0E1A1C]">New password</div>
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
        </label>

        <label className="block">
          <div className="mb-1.5 text-xs font-bold text-[#0E1A1C]">Confirm new password</div>
          <input
            type={showPassword ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Type it again"
            className="input"
          />
        </label>

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
          {busy ? "Saving…" : "Save new password"}
        </button>
      </form>
    </div>
  );
}
