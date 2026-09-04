import { useEffect, useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { Landing } from "./pages/Landing";
import { Mission } from "./pages/Mission";
import { HowToUse } from "./pages/HowToUse";
import { WhyThisMatters } from "./pages/WhyThisMatters";
import { SignUp } from "./pages/SignUp";
import { Login } from "./pages/Login";
import { ResetPassword } from "./pages/ResetPassword";
import { Today } from "./pages/Today";
import { Summary } from "./pages/Summary";
import { Cases } from "./pages/Cases";
import { TrackMyInfo } from "./pages/TrackMyInfo";
import { Team } from "./pages/Team";
import { FAQ } from "./pages/FAQ";
import { FinishSignUp } from "./pages/FinishSignUp";
import { supabase } from "./lib/supabase";
import { readPendingSignupFromUrl, clearPendingSignupFromUrl } from "./lib/pendingSignup";
import { BottomNav, type NavScreen } from "./components/BottomNav";

type Screen = "landing" | "signup" | "login" | "mission" | "how" | "why";
type InfoOverlay = "mission" | "how" | "why" | null;

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
    return <div className="p-8 text-center text-sm text-[#5C6B6F]">Loading…</div>;
  }

  // A recovery link's session takes priority over everything else — even a
  // signed-in resident should land on "choose a new password," not Today.
  if (isPasswordRecovery) {
    return <ResetPassword onDone={clearPasswordRecovery} />;
  }

  if (session && resident) {
    // Today and Summary stay mounted permanently once logged in — switching
    // tabs just toggles visibility instead of unmounting/remounting, so it
    // doesn't retrigger each screen's full loading state on every tap.
    return (
      <>
        <div style={{ display: navScreen === "today" ? "contents" : "none" }}>
          <Today
            resident={resident}
            active={navScreen === "today"}
            onLogout={() => supabase.auth.signOut()}
            onAbout={() => setInfoOverlay("mission")}
          />
        </div>
        <div style={{ display: navScreen === "summary" ? "contents" : "none" }}>
          <Summary resident={resident} active={navScreen === "summary"} onAbout={() => setInfoOverlay("mission")} />
        </div>
        <div style={{ display: navScreen === "cases" ? "contents" : "none" }}>
          <Cases resident={resident} active={navScreen === "cases"} onAbout={() => setInfoOverlay("mission")} />
        </div>
        <div style={{ display: navScreen === "me" ? "contents" : "none" }}>
          <TrackMyInfo
            resident={resident}
            active={navScreen === "me"}
            onAbout={() => setInfoOverlay("mission")}
            onLogout={() => supabase.auth.signOut()}
          />
        </div>
        <div style={{ display: navScreen === "team" ? "contents" : "none" }}>
          <Team resident={resident} active={navScreen === "team"} onAbout={() => setInfoOverlay("mission")} />
        </div>
        <div style={{ display: navScreen === "faq" ? "contents" : "none" }}>
          <FAQ resident={resident} onAbout={() => setInfoOverlay("mission")} />
        </div>
        <BottomNav active={navScreen} onChange={setNavScreen} />
        {infoOverlay && (
          <div className="fixed inset-0 z-40 overflow-y-auto bg-[#F2F6F5]">
            {infoOverlay === "mission" ? (
              <Mission
                onBack={() => setInfoOverlay(null)}
                onHow={() => setInfoOverlay("how")}
                onWhy={() => setInfoOverlay("why")}
              />
            ) : infoOverlay === "how" ? (
              <HowToUse onDone={() => setInfoOverlay(null)} onBack={() => setInfoOverlay(null)} />
            ) : (
              <WhyThisMatters onBack={() => setInfoOverlay("mission")} onHow={() => setInfoOverlay("how")} />
            )}
          </div>
        )}
      </>
    );
  }

  if (session && !resident) {
    if (!autoAttempted || finishingSignup) {
      return <div className="p-8 text-center text-sm text-[#5C6B6F]">Finishing your sign-up…</div>;
    }
    return <FinishSignUp email={session.user.email ?? ""} onDone={refreshResident} />;
  }

  if (screen === "mission") {
    return <Mission onBack={() => setScreen("landing")} onWhy={() => setScreen("why")} />;
  }
  if (screen === "how") return <HowToUse onDone={() => setScreen("landing")} onBack={() => setScreen("landing")} />;
  if (screen === "why") {
    return <WhyThisMatters onBack={() => setScreen("mission")} onHow={() => setScreen("how")} />;
  }
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
      onWhy={() => setScreen("why")}
    />
  );
}

export default App;
