import { useEffect, useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { SignUp } from "./pages/SignUp";
import { Login } from "./pages/Login";
import { Today } from "./pages/Today";
import { FinishSignUp } from "./pages/FinishSignUp";
import { supabase } from "./lib/supabase";

type Screen = "signup" | "login";

function App() {
  const { session, resident, loading, refreshResident } = useAuth();
  const [screen, setScreen] = useState<Screen>("login");
  const [finishingSignup, setFinishingSignup] = useState(false);
  const [autoAttempted, setAutoAttempted] = useState(false);

  // If "Confirm email" is on, signUp() returns no session and complete_signup
  // never ran. Try to finish it automatically using the form data stashed
  // before signup — but a confirmation link can open in a different
  // browser/tab than the one that stashed it, so this can't be relied on.
  // Either way, once attempted, fall through to a manual form below instead
  // of ever dead-ending.
  useEffect(() => {
    if (!session || resident || finishingSignup || autoAttempted) return;
    const raw = localStorage.getItem("socteq_pending_signup");
    if (!raw) {
      setAutoAttempted(true);
      return;
    }
    const pending = JSON.parse(raw);
    if (pending.email !== session.user.email) {
      setAutoAttempted(true);
      return;
    }

    setFinishingSignup(true);
    supabase
      .rpc("complete_signup", {
        p_program_id: pending.p_program_id,
        p_pgy: pending.p_pgy,
        p_full_name: pending.p_full_name,
        p_username: pending.p_username,
        p_access_code: pending.p_access_code,
        p_precourse: pending.p_precourse,
      })
      .then(({ error }) => {
        if (!error) localStorage.removeItem("socteq_pending_signup");
        setFinishingSignup(false);
        setAutoAttempted(true);
        refreshResident();
      });
  }, [session, resident, finishingSignup, autoAttempted, refreshResident]);

  if (loading) {
    return <div className="p-8 text-center text-sm text-[#8A999D]">Loading…</div>;
  }

  if (session && resident) {
    return <Today resident={resident} onLogout={() => supabase.auth.signOut()} />;
  }

  if (session && !resident) {
    if (!autoAttempted || finishingSignup) {
      return <div className="p-8 text-center text-sm text-[#8A999D]">Finishing your sign-up…</div>;
    }
    return <FinishSignUp email={session.user.email ?? ""} onDone={refreshResident} />;
  }

  return screen === "signup" ? (
    <SignUp onDone={refreshResident} onGoLogin={() => setScreen("login")} />
  ) : (
    <Login onDone={refreshResident} onGoSignUp={() => setScreen("signup")} />
  );
}

export default App;
