import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { Resident } from "../types";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [resident, setResident] = useState<Resident | null>(null);
  const [loading, setLoading] = useState(true);

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

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
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

  return { session, resident, loading, refreshResident };
}
