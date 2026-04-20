import { Pencil, Save, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import DoctorContactForm from "../../components/doctor/profile/DoctorContactForm";
import DoctorCredentialsForm from "../../components/doctor/profile/DoctorCredentialsForm";
import DoctorEducationEditor from "../../components/doctor/profile/DoctorEducationEditor";
import DoctorInstitutionForm from "../../components/doctor/profile/DoctorInstitutionForm";
import DoctorProfessionalForm from "../../components/doctor/profile/DoctorProfessionalForm";
import {
  useGetDoctorQuery,
  useUpdateDoctorMutation,
} from "../../api/doctorsApi";
import { useIdentity } from "../../contexts/IdentityContext";
import { rtkErrorMessage } from "../../lib/rtkErrorMessage";
import type { DoctorProfile, DoctorUpdateRequest, Education, OfficeAddress } from "../../types/doctor";

function emptyOffice(): OfficeAddress {
  return { street: "", city: "", state: "", zip: "" };
}

type Draft = {
  email: string;
  first_name: string;
  last_name: string;
  title: string;
  specialization: string;
  sub_specializations: string;
  license_number: string;
  license_state: string;
  npi_number: string;
  institution: string;
  department: string;
  years_of_experience: string;
  education: Education[];
  phone: string;
  office_address: OfficeAddress;
  accepting_new_patients: boolean;
  bio: string;
};

function profileToDraft(p: DoctorProfile): Draft {
  return {
    email: p.email,
    first_name: p.first_name,
    last_name: p.last_name,
    title: p.title,
    specialization: p.specialization,
    sub_specializations: p.sub_specializations.join(", "),
    license_number: p.license_number ?? "",
    license_state: p.license_state ?? "",
    npi_number: p.npi_number ?? "",
    institution: p.institution ?? "",
    department: p.department ?? "",
    years_of_experience:
      p.years_of_experience == null ? "" : String(p.years_of_experience),
    education: p.education.map((e) => ({
      degree: e.degree,
      institution: e.institution,
      year: e.year,
    })),
    phone: p.phone ?? "",
    office_address: p.office_address
      ? { ...p.office_address }
      : emptyOffice(),
    accepting_new_patients: p.accepting_new_patients,
    bio: p.bio,
  };
}

function draftToUpdate(d: Draft): DoctorUpdateRequest {
  const yearsStr = d.years_of_experience.trim();
  let years: number | null = null;
  if (yearsStr !== "") {
    const n = Number(yearsStr);
    years = Number.isFinite(n) ? n : null;
  }
  const subs = d.sub_specializations
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const edu = d.education.filter(
    (e) => e.degree.trim() !== "" && e.institution.trim() !== ""
  );
  return {
    email: d.email.trim(),
    first_name: d.first_name.trim(),
    last_name: d.last_name.trim(),
    title: d.title.trim(),
    specialization: d.specialization.trim(),
    sub_specializations: subs,
    license_number: d.license_number.trim() || null,
    license_state: d.license_state.trim() || null,
    npi_number: d.npi_number.trim() || null,
    institution: d.institution.trim() || null,
    department: d.department.trim() || null,
    years_of_experience: years,
    education: edu,
    phone: d.phone.trim() || null,
    office_address: d.office_address,
    accepting_new_patients: d.accepting_new_patients,
    bio: d.bio,
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
        color="text.secondary"
        sx={{ display: "block", mb: 2, letterSpacing: 1 }}
      >
        {title}
      </Typography>
      {children}
    </Paper>
  );
}

export default function DoctorProfilePage() {
  const { currentDoctorId, refreshDoctors } = useIdentity();

  const {
    data: profile,
    isLoading: loading,
    error: loadError,
    isError: loadFailed,
  } = useGetDoctorQuery(currentDoctorId ?? "", { skip: !currentDoctorId });

  const [updateDoctorMut, { isLoading: saving }] = useUpdateDoctorMutation();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEditing(false);
    setError(null);
  }, [currentDoctorId]);

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
    if (!currentDoctorId || !draft) return;
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email);
    if (
      !draft.first_name.trim() ||
      !draft.last_name.trim() ||
      !draft.specialization.trim() ||
      !emailOk
    ) {
      setError("Please enter first name, last name, specialization, and a valid email.");
      return;
    }
    setError(null);
    try {
      await updateDoctorMut({
        doctorId: currentDoctorId,
        body: draftToUpdate(draft),
      }).unwrap();
      setEditing(false);
      await refreshDoctors();
    } catch (e) {
      setError(rtkErrorMessage(e));
    }
  };

  const loadErrorMessage =
    loadFailed && loadError ? rtkErrorMessage(loadError) : null;

  const displayName = useMemo(() => {
    if (!profile) return "";
    const t = profile.title ? `${profile.title} ` : "";
    return `${t}${profile.first_name} ${profile.last_name}`.trim();
  }, [profile]);

  if (!currentDoctorId) {
    return (
      <Alert severity="warning">
        Select a doctor in the dev identity banner (doctor role) to view a profile.
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
      <Alert severity="error">
        {loadErrorMessage ||
          "Profile not found. Seed doctors or create one via the API."}
      </Alert>
    );
  }

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
            {profile.specialization}
            {profile.institution ? ` · ${profile.institution}` : ""}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {profile.email}
          </Typography>
        </Paper>

        <Section title="Professional">
          <DoctorProfessionalForm
            first_name={draft.first_name}
            last_name={draft.last_name}
            title={draft.title}
            specialization={draft.specialization}
            sub_specializations={draft.sub_specializations}
            bio={draft.bio}
            disabled={!editing}
            onChange={handleDemoChange}
          />
        </Section>

        <Section title="Credentials">
          <DoctorCredentialsForm
            license_number={draft.license_number}
            license_state={draft.license_state}
            npi_number={draft.npi_number}
            disabled={!editing}
            onChange={handleDemoChange}
          />
        </Section>

        <Section title="Institution">
          <DoctorInstitutionForm
            institution={draft.institution}
            department={draft.department}
            years_of_experience={draft.years_of_experience}
            accepting_new_patients={draft.accepting_new_patients}
            disabled={!editing}
            onChange={handleDemoChange}
          />
        </Section>

        <Section title="Education">
          <DoctorEducationEditor
            items={draft.education}
            disabled={!editing}
            onChange={(education) => patchDraft({ education })}
          />
        </Section>

        <Section title="Contact">
          <DoctorContactForm
            email={draft.email}
            phone={draft.phone}
            office_address={draft.office_address}
            disabled={!editing}
            onChange={handleDemoChange}
          />
        </Section>
      </Stack>
    </>
  );
}
