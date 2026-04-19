import {
  useGetConnectedPatientHistoryQuery,
  useGetConnectedPatientProfileQuery,
} from "../api/doctorsApi";
import { rtkErrorMessage } from "../lib/rtkErrorMessage";

export function usePatientDetail(
  doctorId: string | null,
  patientId: string | undefined
) {
  const skip = !doctorId || !patientId;
  const arg = {
    doctorId: doctorId ?? "",
    patientId: patientId ?? "",
  };

  const profileQ = useGetConnectedPatientProfileQuery(arg, { skip });
  const historyQ = useGetConnectedPatientHistoryQuery(arg, { skip });

  const err = profileQ.error ?? historyQ.error;

  return {
    profile: profileQ.data ?? null,
    history: historyQ.data ?? null,
    isLoading: !skip && (profileQ.isLoading || historyQ.isLoading),
    error: err ? rtkErrorMessage(err) : null,
  };
}
