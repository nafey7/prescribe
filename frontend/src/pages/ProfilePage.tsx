import { Loader2, Pencil, Save, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePatientContext } from "../contexts/PatientContext";
import { getPatient, updatePatient } from "../api/patients";
import AllergiesEditor from "../components/patient/AllergiesEditor";
import ConditionsEditor from "../components/patient/ConditionsEditor";
import EmergencyContactForm from "../components/patient/EmergencyContactForm";
import FamilyHistoryEditor from "../components/patient/FamilyHistoryEditor";
import LifestyleEditor from "../components/patient/LifestyleEditor";
import PatientDemographicsForm from "../components/patient/PatientDemographicsForm";
import type {
  Address,
  EmergencyContact,
  Lifestyle,
  PatientProfile,
  PatientUpdateRequest,
} from "../types/patient";

function emptyAddress(): Address {
  return { street: "", city: "", state: "", zip: "" };
}

function emptyEmergency(): EmergencyContact {
  return { name: "", relationship: "", phone: "" };
}

function emptyLifestyle(): Lifestyle {
  return {
    smoking_status: "unknown",
    smoking_notes: "",
    alcohol: "",
    exercise: "",
    diet_notes: "",
  };
}

function normalizeDob(iso: string | null): string {
  if (!iso) return "";
  return iso.length >= 10 ? iso.slice(0, 10) : iso;
}

function profileToDraft(p: PatientProfile) {
  const addr = p.address || emptyAddress();
  const ec = p.emergency_contact || emptyEmergency();
  const life = p.lifestyle || emptyLifestyle();
  return {
    first_name: p.first_name,
    last_name: p.last_name,
    email: p.email,
    date_of_birth: normalizeDob(p.date_of_birth),
    sex: p.sex || "",
    blood_type: p.blood_type || "",
    weight_kg: p.weight_kg ?? "",
    height_cm: p.height_cm ?? "",
    phone: p.phone || "",
    address: { ...addr },
    emergency_contact: { ...ec },
    allergies: p.allergies.map((a) => ({ ...a })),
    conditions: p.conditions.map((c) => ({ ...c })),
    family_history: p.family_history.map((f) => ({ ...f })),
    lifestyle: { ...life },
  };
}

type Draft = ReturnType<typeof profileToDraft>;

function draftToUpdate(d: Draft): PatientUpdateRequest {
  const weight =
    d.weight_kg === "" ? null : Number(d.weight_kg);
  const height =
    d.height_cm === "" ? null : Number(d.height_cm);
  const allergies = d.allergies.filter((a) => a.substance.trim() !== "");
  return {
    first_name: d.first_name.trim(),
    last_name: d.last_name.trim(),
    email: d.email.trim(),
    date_of_birth: d.date_of_birth || null,
    sex: d.sex || null,
    blood_type: d.blood_type || null,
    weight_kg: weight,
    height_cm: height,
    phone: d.phone || null,
    address: d.address,
    emergency_contact: d.emergency_contact,
    allergies,
    conditions: d.conditions.filter((c) => c.name.trim() !== ""),
    family_history: d.family_history.filter(
      (f) => f.relation.trim() !== "" || f.condition.trim() !== ""
    ),
    lifestyle: d.lifestyle,
  };
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function ProfilePage() {
  const { patients, currentPatientId } = usePatientContext();
  const userId = useMemo(() => {
    const p = patients.find((x) => x.id === currentPatientId);
    return p?.user_id || currentPatientId;
  }, [patients, currentPatientId]);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const p = await getPatient(userId);
      setProfile(p);
      setDraft(profileToDraft(p));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load profile");
      setProfile(null);
      setDraft(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchDraft = useCallback((patch: Partial<Draft>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
  }, []);

  const handleDemoChange = useCallback(
    (patch: Record<string, unknown>) => {
      setDraft((d) => {
        if (!d) return d;
        return { ...d, ...patch } as Draft;
      });
    },
    []
  );

  const cancelEdit = () => {
    if (profile) setDraft(profileToDraft(profile));
    setEditing(false);
    setError(null);
  };

  const save = async () => {
    if (!userId || !draft) return;
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email);
    if (!draft.first_name.trim() || !draft.last_name.trim() || !emailOk) {
      setError("Please enter first name, last name, and a valid email.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await updatePatient(userId, draftToUpdate(draft));
      setProfile(updated);
      setDraft(profileToDraft(updated));
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!userId) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Select a patient in the header (or dev identity banner) to view a profile.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!profile || !draft) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error || "Profile not found."}
      </div>
    );
  }

  const displayName = `${profile.first_name} ${profile.last_name}`.trim();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-end gap-2">
            {!editing ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                <Pencil size={16} />
                Edit profile
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <X size={16} />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  Save
                </button>
              </>
            )}
      </div>

      <div className="space-y-6">
        {error && editing && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900">{displayName}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {profile.patient_slug} · {profile.email}
          </p>
        </div>

        <Section title="Demographics">
          <PatientDemographicsForm
            first_name={draft.first_name}
            last_name={draft.last_name}
            email={draft.email}
            date_of_birth={draft.date_of_birth}
            sex={draft.sex}
            blood_type={draft.blood_type}
            weight_kg={draft.weight_kg === "" ? "" : String(draft.weight_kg)}
            height_cm={draft.height_cm === "" ? "" : String(draft.height_cm)}
            phone={draft.phone}
            address={draft.address}
            disabled={!editing}
            onChange={handleDemoChange}
          />
        </Section>

        <Section title="Allergies">
          <AllergiesEditor
            items={draft.allergies}
            disabled={!editing}
            onChange={(allergies) => patchDraft({ allergies })}
          />
        </Section>

        <Section title="Conditions">
          <ConditionsEditor
            items={draft.conditions}
            disabled={!editing}
            onChange={(conditions) => patchDraft({ conditions })}
          />
        </Section>

        <Section title="Family history">
          <FamilyHistoryEditor
            items={draft.family_history}
            disabled={!editing}
            onChange={(family_history) => patchDraft({ family_history })}
          />
        </Section>

        <Section title="Lifestyle">
          <LifestyleEditor
            value={draft.lifestyle}
            disabled={!editing}
            onChange={(lifestyle) => patchDraft({ lifestyle })}
          />
        </Section>

        <Section title="Emergency contact">
          <EmergencyContactForm
            value={draft.emergency_contact}
            disabled={!editing}
            onChange={(emergency_contact) => patchDraft({ emergency_contact })}
          />
        </Section>
      </div>
    </div>
  );
}
