import { Menu } from "lucide-react";
import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { usePatientContext } from "../contexts/PatientContext";
import PatientSelector from "./PatientSelector";

const TITLES: { prefix: string; title: string }[] = [
  { prefix: "/documents", title: "Documents" },
  { prefix: "/profile", title: "My Profile" },
  { prefix: "/", title: "Dashboard" },
];

function pageTitle(pathname: string): string {
  if (pathname === "/") return "Dashboard";
  const hit = TITLES.find(
    (t) => t.prefix !== "/" && pathname.startsWith(t.prefix)
  );
  return hit?.title ?? "Portal";
}

export default function Header({
  onMenuClick,
}: {
  onMenuClick?: () => void;
}) {
  const location = useLocation();
  const { patients, currentPatientId, setCurrentPatientId } =
    usePatientContext();
  const title = useMemo(
    () => pageTitle(location.pathname),
    [location.pathname]
  );

  const patientName = useMemo(() => {
    const p = patients.find((x) => x.id === currentPatientId);
    return p?.name ?? "Patient";
  }, [patients, currentPatientId]);

  return (
    <header className="shrink-0 border-b border-gray-200 bg-white px-4 py-3">
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        <button
          type="button"
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
          aria-label="Open navigation menu"
          onClick={onMenuClick}
        >
          <Menu size={22} />
        </button>

        <div className="hidden min-w-0 max-w-[40%] items-center gap-2 md:flex">
          <span className="truncate text-sm font-semibold text-gray-900">
            {patientName}
          </span>
          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
            Patient
          </span>
        </div>

        <h2 className="min-w-0 flex-1 truncate text-center text-sm font-medium text-gray-800">
          {title}
        </h2>

        <div className="flex shrink-0 items-center gap-2">
          {!import.meta.env.DEV && (
            <PatientSelector
              selectedId={currentPatientId}
              onChange={setCurrentPatientId}
            />
          )}
          <button
            type="button"
            className="hidden rounded-full border border-gray-200 p-2 text-gray-400 sm:inline-flex"
            aria-label="Notifications (coming soon)"
            disabled
            title="Coming in a later phase"
          >
            <span className="sr-only">Notifications</span>
            <span className="text-xs">🔔</span>
          </button>
          <div
            className="hidden h-9 w-9 shrink-0 rounded-full border border-dashed border-gray-300 bg-gray-50 sm:flex sm:items-center sm:justify-center"
            title="Account (Phase E)"
            aria-hidden
          >
            <span className="text-xs text-gray-400">👤</span>
          </div>
        </div>
      </div>
    </header>
  );
}
