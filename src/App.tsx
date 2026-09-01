import { useEffect, useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { Landing } from "./pages/Landing";
import { Mission } from "./pages/Mission";
import { HowToUse } from "./pages/HowToUse";
import { SignUp } from "./pages/SignUp";
import { Login } from "./pages/Login";
import { ResetPassword } from "./pages/ResetPassword";
import { Today } from "./pages/Today";
import { Summary } from "./pages/Summary";
import { FinishSignUp } from "./pages/FinishSignUp";
import { supabase } from "./lib/supabase";
import { readPendingSignupFromUrl, clearPendingSignupFromUrl } from "./lib/pendingSignup";
import { BottomNav, type NavScreen } from "./components/BottomNav";

type Screen = "landing" | "signup" | "login" | "mission" | "how";
type InfoOverlay = "mission" | "how" | null;

function App() {
  const { session, resident, loading, refreshResident, isPasswordRecovery, clearPasswordRecovery } = useAuth();
  const [screen, setScreen] = useState<Screen>("landing");
  const [navScreen, setNavScreen] = useState<NavScreen>("today");
  const [infoOverlay, setInfoOverlay] = useState<InfoOverlay>(null);
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

  // A recovery link's session takes priority over everything else — even a
  // signed-in resident should land on "choose a new password," not Today.
  if (isPasswordRecovery) {
    return <ResetPassword onDone={clearPasswordRecovery} />;
  }

  if (session && resident) {
    if (infoOverlay === "mission") {
      return <Mission onBack={() => setInfoOverlay(null)} onHow={() => setInfoOverlay("how")} />;
    }
    if (infoOverlay === "how") {
      return <HowToUse onDone={() => setInfoOverlay(null)} onBack={() => setInfoOverlay(null)} />;
    }
    return (
      <>
        {navScreen === "today" && (
          <Today
            resident={resident}
            onLogout={() => supabase.auth.signOut()}
            onAbout={() => setInfoOverlay("mission")}
          />
        )}
        {navScreen === "summary" && <Summary resident={resident} onAbout={() => setInfoOverlay("mission")} />}
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
