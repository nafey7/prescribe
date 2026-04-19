import { FileText, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { paths } from "../../router/paths";
import type { DocumentSummary } from "../../types/patient";

interface Props {
  documents: DocumentSummary[];
  /** Router path for “View all” (default: patient `/documents`). */
  viewAllTo?: string;
}

export default function RecentDocumentsCard({
  documents,
  viewAllTo = paths.patient.documents,
}: Props) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText className="text-emerald-600" size={18} />
          <h2 className="text-base font-semibold text-gray-900">
            Recent documents
          </h2>
        </div>
        <Link
          to={viewAllTo}
          className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800"
        >
          View all
          <ExternalLink size={14} />
        </Link>
      </div>
      {documents.length === 0 ? (
        <p className="text-sm text-gray-500">
          No uploaded documents yet. Uploads will appear here when available.
        </p>
      ) : (
        <ul className="space-y-2">
          {documents.map((d) => (
            <li key={d.document_id}>
              <Link
                to={
                  viewAllTo.includes("?")
                    ? `${viewAllTo}&doc=${encodeURIComponent(d.document_id)}`
                    : `${viewAllTo}?doc=${encodeURIComponent(d.document_id)}`
                }
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50"
              >
                <span className="font-medium text-gray-900">{d.filename}</span>
                {d.uploaded_at && (
                  <span className="text-xs text-gray-500">{d.uploaded_at}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
