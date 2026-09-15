import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { ProgramDirector, Resident } from "../types";

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
  const [pd, setPd] = useState<ProgramDirector | null>(null);
  const [programTimezone, setProgramTimezone] = useState<string>("America/Detroit");
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(checkUrlForRecovery);

  // Tries residents first, then program_directors — an account is exactly
  // one or the other, never both, so at most one of these ever resolves.
  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from("residents").select("*").eq("id", userId).maybeSingle();
    setResident(data as Resident | null);
    if (data) {
      setPd(null);
      const { data: program } = await supabase.from("my_program").select("timezone").maybeSingle();
      if (program) setProgramTimezone((program as { timezone: string }).timezone);
      return;
    }

    const { data: pdData } = await supabase.from("program_directors").select("*").eq("id", userId).maybeSingle();
    setPd(pdData as ProgramDirector | null);
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === "PASSWORD_RECOVERY") setIsPasswordRecovery(true);
      setSession(newSession);
      if (newSession) await loadProfile(newSession.user.id);
      else {
        setResident(null);
        setPd(null);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshResident = useCallback(async () => {
    if (session) await loadProfile(session.user.id);
  }, [session, loadProfile]);

  const clearPasswordRecovery = useCallback(() => {
    setIsPasswordRecovery(false);
    window.history.replaceState({}, "", window.location.pathname + window.location.search);
  }, []);

  return { session, resident, pd, programTimezone, loading, refreshResident, isPasswordRecovery, clearPasswordRecovery };
}
