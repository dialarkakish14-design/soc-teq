import { useEffect, useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { Landing } from "./pages/Landing";
import { Mission } from "./pages/Mission";
import { HowToUse } from "./pages/HowToUse";
import { SignUp } from "./pages/SignUp";
import { Login } from "./pages/Login";
import { Today } from "./pages/Today";
import { Summary } from "./pages/Summary";
import { FinishSignUp } from "./pages/FinishSignUp";
import { supabase } from "./lib/supabase";
import { readPendingSignupFromUrl, clearPendingSignupFromUrl } from "./lib/pendingSignup";
import { BottomNav, type NavScreen } from "./components/BottomNav";

type Screen = "landing" | "signup" | "login" | "mission" | "how";

function App() {
  const { session, resident, loading, refreshResident } = useAuth();
  const [screen, setScreen] = useState<Screen>("landing");
  const [navScreen, setNavScreen] = useState<NavScreen>("today");
  const [finishingSignup, setFinishingSignup] = useState(false);
  const [autoAttempted, setAutoAttempted] = useState(false);

  // If "Confirm email" is on, signUp() returns no session and complete_signup
  // never ran. The profile fields travel in the confirmation link's query
  // params (see lib/pendingSignup.ts), so they're available here regardless
  // of which device/browser the link was opened on. Falls through to a
  // manual form below if that data isn't present for any reason.
  useEffect(() => {
    if (!session || resident || finishingSignup || autoAttempted) return;
    const pending = readPendingSignupFromUrl();
    if (!pending) {
      setAutoAttempted(true);
      return;
    }

    setFinishingSignup(true);
    supabase.rpc("complete_signup", pending).then(({ error }) => {
      if (!error) clearPendingSignupFromUrl();
      setFinishingSignup(false);
      setAutoAttempted(true);
      refreshResident();
    });
  }, [session, resident, finishingSignup, autoAttempted, refreshResident]);

  if (loading) {
    return <div className="p-8 text-center text-sm text-[#8A999D]">Loading…</div>;
  }

  if (session && resident) {
    return (
      <>
        {navScreen === "today" && <Today resident={resident} onLogout={() => supabase.auth.signOut()} />}
        {navScreen === "summary" && <Summary resident={resident} />}
        <BottomNav active={navScreen} onChange={setNavScreen} />
      </>
    );
  }

  if (session && !resident) {
    if (!autoAttempted || finishingSignup) {
      return <div className="p-8 text-center text-sm text-[#8A999D]">Finishing your sign-up…</div>;
    }
    return <FinishSignUp email={session.user.email ?? ""} onDone={refreshResident} />;
  }

  if (screen === "mission") return <Mission onBack={() => setScreen("landing")} />;
  if (screen === "how") return <HowToUse onDone={() => setScreen("landing")} onBack={() => setScreen("landing")} />;
  if (screen === "signup") {
    return (
      <SignUp
        onDone={refreshResident}
        onGoLogin={() => setScreen("login")}
        onBack={() => setScreen("landing")}
      />
    );
  }
  if (screen === "login") {
    return (
      <Login
        onDone={refreshResident}
        onGoSignUp={() => setScreen("signup")}
        onBack={() => setScreen("landing")}
      />
    );
  }
  return (
    <Landing
      onSignUp={() => setScreen("signup")}
      onLogin={() => setScreen("login")}
      onMission={() => setScreen("mission")}
      onHow={() => setScreen("how")}
    />
  );
}

export default App;
