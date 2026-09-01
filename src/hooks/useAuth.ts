import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { Resident } from "../types";

// The recovery link's #type=recovery fragment gets processed by supabase-js
// as soon as the client is constructed, at module load — before React ever
// mounts. That means the "PASSWORD_RECOVERY" auth event can fire (and be
// missed) before onAuthStateChange's listener below is even attached, so
// this checks the raw URL directly as the reliable source of truth, with
// the event as a same-tick fallback for the rare case both listeners race.
function checkUrlForRecovery(): boolean {
  return new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery";
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [resident, setResident] = useState<Resident | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(checkUrlForRecovery);

  const loadResident = useCallback(async (userId: string) => {
    const { data } = await supabase.from("residents").select("*").eq("id", userId).maybeSingle();
    setResident(data as Resident | null);
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) await loadResident(data.session.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === "PASSWORD_RECOVERY") setIsPasswordRecovery(true);
      setSession(newSession);
      if (newSession) await loadResident(newSession.user.id);
      else setResident(null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadResident]);

  const refreshResident = useCallback(async () => {
    if (session) await loadResident(session.user.id);
  }, [session, loadResident]);

  const clearPasswordRecovery = useCallback(() => {
    setIsPasswordRecovery(false);
    window.history.replaceState({}, "", window.location.pathname + window.location.search);
  }, []);

  return { session, resident, loading, refreshResident, isPasswordRecovery, clearPasswordRecovery };
}
