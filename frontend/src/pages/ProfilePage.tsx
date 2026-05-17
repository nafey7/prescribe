import { Pencil, Save, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  useGetPatientQuery,
  useUpdatePatientMutation,
} from "../api/patientsApi";
import { usePatientContext } from "../contexts/PatientContext";
import { rtkErrorMessage } from "../lib/rtkErrorMessage";
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
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Typography
        variant="overline"
        component="h3"
        color="text.secondary"
        sx={{ display: "block", mb: 2, letterSpacing: 1 }}
      >
        {title}
      </Typography>
      {children}
    </Paper>
  );
}

export default function ProfilePage() {
  const { patients, currentPatientId } = usePatientContext();
  const userId = useMemo(() => {
    const p = patients.find((x) => x.id === currentPatientId);
    return p?.user_id || currentPatientId;
  }, [patients, currentPatientId]);

  const {
    data: profile,
    isLoading: loading,
    error: loadError,
    isError: loadFailed,
  } = useGetPatientQuery(userId, { skip: !userId });

  const [updatePatientMut, { isLoading: saving }] = useUpdatePatientMutation();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEditing(false);
    setError(null);
  }, [userId]);

  useEffect(() => {
    if (profile && !editing) {
      setDraft(profileToDraft(profile));
    }
  }, [profile, editing]);

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
    setError(null);
    try {
      await updatePatientMut({
        patientId: userId,
        body: draftToUpdate(draft),
      }).unwrap();
      setEditing(false);
    } catch (e) {
      setError(rtkErrorMessage(e));
    }
  };

  const loadErrorMessage =
    loadFailed && loadError ? rtkErrorMessage(loadError) : null;

  if (!userId) {
    return (
      <Alert severity="warning" sx={{ borderRadius: 1 }}>
        Select a patient in the header (or dev identity banner) to view a profile.
      </Alert>
    );
  }

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "40vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!profile || !draft) {
    return (
      <Alert severity="error" sx={{ borderRadius: 1 }}>
        {loadErrorMessage || "Profile not found."}
      </Alert>
    );
  }

  const displayName = `${profile.first_name} ${profile.last_name}`.trim();

  return (
    <>
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{ mb: 3, justifyContent: "flex-end", flexWrap: "wrap" }}
      >
        {!editing ? (
          <Button
            type="button"
            variant="contained"
            startIcon={<Pencil size={16} />}
            onClick={() => setEditing(true)}
          >
            Edit profile
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="outlined"
              startIcon={<X size={16} />}
              onClick={cancelEdit}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="contained"
              startIcon={saving ? undefined : <Save size={16} />}
              onClick={() => void save()}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        )}
      </Stack>

      <Stack spacing={3}>
        {error && editing && <Alert severity="error">{error}</Alert>}

        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="h5" component="h1">
            {displayName}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {profile.patient_slug} · {profile.email}
          </Typography>
        </Paper>

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
      </Stack>
    </>
  );
}
