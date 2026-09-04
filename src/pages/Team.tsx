import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { formatDateShort } from "../lib/domain";
import type { MyProgram, Resident } from "../types";

interface CohortMember {
  id: string;
  full_name: string;
  email: string;
}

const PROFILE_FIELDS: { key: "setting" | "patient_mix" | "existing_curriculum" | "image_resources"; label: string; placeholder: string }[] = [
  { key: "setting", label: "Setting", placeholder: "e.g. Academic medical center, urban" },
  { key: "patient_mix", label: "Patient mix", placeholder: "e.g. Roughly 40% patients with skin of color" },
  { key: "existing_curriculum", label: "Existing curriculum", placeholder: "What skin-of-color teaching already exists" },
  { key: "image_resources", label: "Image resources", placeholder: "Atlases or resources used for skin-of-color images" },
];

type ProfileForm = Record<(typeof PROFILE_FIELDS)[number]["key"], string>;

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export function Team({ resident, active, onAbout }: { resident: Resident; active: boolean; onAbout: () => void }) {
  const [program, setProgram] = useState<MyProgram | null>(null);
  const [cohort, setCohort] = useState<CohortMember[]>([]);
  const [ratedCounts, setRatedCounts] = useState<Record<string, number>>({});
  const [loggedCounts, setLoggedCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [form, setForm] = useState<ProfileForm>({ setting: "", patient_mix: "", existing_curriculum: "", image_resources: "" });

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2400);
  }

  const load = useCallback(async () => {
    const [
      { data: programRow, error: programError },
      { data: cohortRows, error: cohortError },
      { data: dayRows, error: dayError },
      { data: ratingRows, error: ratingError },
    ] = await Promise.all([
      supabase.from("my_program").select("*").maybeSingle(),
      supabase
        .from("residents")
        .select("id, full_name, email")
        .eq("program_id", resident.program_id)
        .eq("pgy", resident.pgy)
        .order("full_name"),
      supabase.from("days").select("logger_id"),
      supabase.from("ratings").select("resident_id"),
    ]);

    const err = programError ?? cohortError ?? dayError ?? ratingError;
    if (err) {
      setLoadError(err.message);
      setLoading(false);
      return;
    }

    setProgram((programRow as MyProgram | null) ?? null);
    setCohort((cohortRows as CohortMember[] | null) ?? []);

    const logged: Record<string, number> = {};
    for (const d of (dayRows as { logger_id: string | null }[] | null) ?? []) {
      if (d.logger_id) logged[d.logger_id] = (logged[d.logger_id] ?? 0) + 1;
    }
    setLoggedCounts(logged);

    const rated: Record<string, number> = {};
    for (const r of (ratingRows as { resident_id: string }[] | null) ?? []) {
      rated[r.resident_id] = (rated[r.resident_id] ?? 0) + 1;
    }
    setRatedCounts(rated);

    setLoading(false);
  }, [resident.program_id, resident.pgy]);

  useEffect(() => {
    load();
  }, [load]);

  // See Today.tsx for why this exists — every screen preloads once at
  // login for instant tab switches, so it needs its own silent revalidate
  // whenever it becomes the active tab or it'll show stale data.
  useEffect(() => {
    if (active) load();
  }, [active, load]);

  useEffect(() => {
    if (!program) return;
    setForm({
      setting: program.setting ?? "",
      patient_mix: program.patient_mix ?? "",
      existing_curriculum: program.existing_curriculum ?? "",
      image_resources: program.image_resources ?? "",
    });
  }, [program]);

  if (loadError) {
    return (
      <div className="mx-auto min-h-dvh max-w-md p-5">
        <div className="rounded-3xl bg-[#F8E4E4] p-4 text-sm font-semibold text-[#93393E] shadow-sm">{loadError}</div>
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 text-center text-sm text-[#5C6B6F]">Loading…</div>;
  }

  if (!program) {
    return <div className="p-8 text-center text-sm text-[#5C6B6F]">Program not found.</div>;
  }

  const isLead = resident.role === "program_lead";
  const profileFilled = PROFILE_FIELDS.every((f) => program[f.key]);

  async function save() {
    if (PROFILE_FIELDS.some((f) => !form[f.key].trim())) return flash("Fill in all four fields.");
    setSaving(true);
    const { error } = await supabase.rpc("update_program_profile", {
      p_setting: form.setting,
      p_patient_mix: form.patient_mix,
      p_existing_curriculum: form.existing_curriculum,
      p_image_resources: form.image_resources,
    });
    setSaving(false);
    if (error) return flash(error.message);
    setEditing(false);
    flash("Profile saved.");
    await load();
  }

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-24">
      <div className="flex items-start justify-between px-5 pt-6">
        <div>
          <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#0E7C72]">Team</div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#0E1A1C]">{program.name}</h1>
          <p className="mt-1 text-[13px] text-[#2E3A3D]">
            Your {resident.pgy} cohort only. Other PGY years keep separate directories and separate data.
          </p>
        </div>
        <div className="mt-0.5 text-right">
          <div className="text-[8.5px] font-semibold uppercase tracking-wide text-[#5C6B6F]">Home page</div>
          <button onClick={onAbout} className="text-xs font-bold text-[#0E7C72]">
            SoC-TEQ
          </button>
        </div>
      </div>

      <div className="px-5">
        <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#0E1A1C]">Program profile</h3>
            {isLead && !editing && (
              <button onClick={() => setEditing(true)} className="text-xs font-bold text-[#0E7C72]">
                {profileFilled ? "Edit" : "Complete"}
              </button>
            )}
          </div>

          {editing ? (
            <div className="mt-3 flex flex-col gap-3">
              {PROFILE_FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-[#5C6B6F]">{f.label}</label>
                  <textarea
                    value={form[f.key]}
                    onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="input mt-1 min-h-[64px]"
                  />
                </div>
              ))}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditing(false);
                    setForm({
                      setting: program.setting ?? "",
                      patient_mix: program.patient_mix ?? "",
                      existing_curriculum: program.existing_curriculum ?? "",
                      image_resources: program.image_resources ?? "",
                    });
                  }}
                  className="flex-1 rounded-xl bg-[#EAEFEE] py-2.5 text-sm font-bold text-[#2E3A3D]"
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-[#0E7C72] py-2.5 text-sm font-bold text-white disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          ) : profileFilled ? (
            <>
              {PROFILE_FIELDS.map((f) => (
                <div key={f.key} className="border-t border-[#E2EAE9] py-2.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-[#5C6B6F]">{f.label}</div>
                  <div className="mt-0.5 text-[13.5px] text-[#0E1A1C]">{program[f.key]}</div>
                </div>
              ))}
              {program.profile_updated_at && (
                <div className="mt-2.5 text-[11px] text-[#5C6B6F]">Last updated {formatDateShort(program.profile_updated_at)}</div>
              )}
            </>
          ) : (
            <p className="mt-2 text-[13px] text-[#5C6B6F]">
              {isLead
                ? "Tap Complete to describe your program's setting, patient mix, existing curriculum and image resources."
                : "Your program lead hasn't filled this in yet."}
            </p>
          )}
          <div className="mt-3 text-[11px] text-[#5C6B6F]">Completed once by the program lead. Exports with your data.</div>
        </div>

        <div className="mt-6 font-mono text-[10px] font-semibold uppercase tracking-widest text-[#5C6B6F]">
          Cohort directory
        </div>
        <div className="mt-3 flex flex-col gap-3">
          {cohort.map((r) => (
            <div key={r.id} className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#DCEFEB] text-sm font-extrabold text-[#064B45]">
                  {initials(r.full_name)}
                </div>
                <div>
                  <h3 className="font-bold text-[#0E1A1C]">
                    {r.full_name}
                    {r.id === resident.id ? " (you)" : ""}
                  </h3>
                  <div className="text-xs text-[#5C6B6F]">{r.email}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-[#E2EAE9] pt-3">
                <span className="text-xs text-[#5C6B6F]">
                  {ratedCounts[r.id] ?? 0} topic{(ratedCounts[r.id] ?? 0) === 1 ? "" : "s"} rated
                </span>
                <span className="whitespace-nowrap rounded-lg bg-[#EAEFEE] px-2 py-1 font-mono text-[10px] font-semibold uppercase text-[#5C6B6F]">
                  {loggedCounts[r.id] ?? 0} day{(loggedCounts[r.id] ?? 0) === 1 ? "" : "s"} as logger
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-[11px] text-[#5C6B6F]">
          Names appear here so you know who's in your cohort. They never appear next to a rating or in exported data.
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-[#0E1A1C] px-4 py-3.5 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
