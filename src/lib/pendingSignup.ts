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

// Same trick, for a program director signing up instead — distinct query
// param names so the two never collide when read back from the same URL.
export interface PendingPdSignup {
  p_program_id: string;
  p_full_name: string;
  p_username: string;
  p_access_code: string;
}

const PD_KEYS: Record<keyof PendingPdSignup, string> = {
  p_program_id: "pdsu_program",
  p_full_name: "pdsu_name",
  p_username: "pdsu_user",
  p_access_code: "pdsu_code",
};

export function buildPdEmailRedirectUrl(pending: PendingPdSignup): string {
  const params = new URLSearchParams({
    [PD_KEYS.p_program_id]: pending.p_program_id,
    [PD_KEYS.p_full_name]: pending.p_full_name,
    [PD_KEYS.p_username]: pending.p_username,
    [PD_KEYS.p_access_code]: pending.p_access_code,
  });
  return `${window.location.origin}/?${params.toString()}`;
}

export function readPendingPdSignupFromUrl(): PendingPdSignup | null {
  const params = new URLSearchParams(window.location.search);
  const program = params.get(PD_KEYS.p_program_id);
  const name = params.get(PD_KEYS.p_full_name);
  const user = params.get(PD_KEYS.p_username);
  const code = params.get(PD_KEYS.p_access_code);
  if (!program || !name || !user || !code) return null;
  return { p_program_id: program, p_full_name: name, p_username: user, p_access_code: code };
}

export function clearPendingPdSignupFromUrl(): void {
  const url = new URL(window.location.href);
  Object.values(PD_KEYS).forEach((k) => url.searchParams.delete(k));
  window.history.replaceState({}, "", url.pathname + url.search + url.hash);
}
