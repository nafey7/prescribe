import { useState } from "react";
import { Link } from "react-router-dom";
import { acceptConnection, rejectConnection } from "../../../api/connections";
import type { PendingRequestSummary } from "../../../types/doctor";
import { formatRelativeShort } from "./formatRelative";

export default function PendingRequestsCard({
  items,
  onAfterAction,
}: {
  items: PendingRequestSummary[];
  onAfterAction: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleAccept(id: string) {
    setLocalError(null);
    setBusyId(id);
    try {
      await acceptConnection(id);
      onAfterAction();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Could not accept");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string) {
    setLocalError(null);
    setBusyId(id);
    try {
      await rejectConnection(id);
      onAfterAction();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Could not reject");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-900">
        Pending connection requests
      </h2>
      {localError ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {localError}
        </p>
      ) : null}
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          No pending requests. Patients who want to connect will appear here.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {items.map((row) => (
            <li
              key={row.connection_id}
              className="flex flex-col gap-3 border-b border-gray-100 pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-gray-900">{row.patient_name}</p>
                <p className="text-sm text-gray-500">
                  Wants to connect
                  {row.initiated_at
                    ? ` · ${formatRelativeShort(row.initiated_at)}`
                    : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  disabled={busyId === row.connection_id}
                  onClick={() => void handleAccept(row.connection_id)}
                  className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  Accept
                </button>
                <button
                  type="button"
                  disabled={busyId === row.connection_id}
                  onClick={() => void handleReject(row.connection_id)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4">
        <Link
          to="/doctor/connections"
          className="text-sm font-medium text-teal-700 hover:text-teal-800"
        >
          View all requests →
        </Link>
      </div>
    </section>
  );
}
