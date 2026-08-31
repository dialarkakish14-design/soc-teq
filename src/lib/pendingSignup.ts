// The signup form's data needs to survive from "submit" to "email confirmed,"
// which can happen in a different tab, browser, or even a different device
// than where the form was filled in. Browser storage doesn't reliably
// survive that gap, so instead the data travels *in the confirmation link
// itself* as query params — Supabase's own tokens land in the URL fragment
// (#access_token=...), which coexists fine with query params before the #.
export interface PendingSignup {
  p_program_id: string;
  p_pgy: string;
  p_full_name: string;
  p_username: string;
  p_access_code: string;
  p_precourse: boolean;
}

const KEYS: Record<keyof PendingSignup, string> = {
  p_program_id: "su_program",
  p_pgy: "su_pgy",
  p_full_name: "su_name",
  p_username: "su_user",
  p_access_code: "su_code",
  p_precourse: "su_pre",
};

export function buildEmailRedirectUrl(pending: PendingSignup): string {
  const params = new URLSearchParams({
    [KEYS.p_program_id]: pending.p_program_id,
    [KEYS.p_pgy]: pending.p_pgy,
    [KEYS.p_full_name]: pending.p_full_name,
    [KEYS.p_username]: pending.p_username,
    [KEYS.p_access_code]: pending.p_access_code,
    [KEYS.p_precourse]: pending.p_precourse ? "1" : "0",
  });
  return `${window.location.origin}/?${params.toString()}`;
}

export function readPendingSignupFromUrl(): PendingSignup | null {
  const params = new URLSearchParams(window.location.search);
  const program = params.get(KEYS.p_program_id);
  const pgy = params.get(KEYS.p_pgy);
  const name = params.get(KEYS.p_full_name);
  const user = params.get(KEYS.p_username);
  const code = params.get(KEYS.p_access_code);
  if (!program || !pgy || !name || !user || !code) return null;
  return {
    p_program_id: program,
    p_pgy: pgy,
    p_full_name: name,
    p_username: user,
    p_access_code: code,
    p_precourse: params.get(KEYS.p_precourse) === "1",
  };
}

export function clearPendingSignupFromUrl(): void {
  const url = new URL(window.location.href);
  Object.values(KEYS).forEach((k) => url.searchParams.delete(k));
  window.history.replaceState({}, "", url.pathname + url.search + url.hash);
}
