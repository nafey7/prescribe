import { Menu } from "lucide-react";
import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useIdentity } from "../../contexts/IdentityContext";

function titleFromPath(pathname: string): string {
  if (pathname === "/doctor" || pathname === "/doctor/") return "Dashboard";
  if (pathname.startsWith("/doctor/profile")) return "My Profile";
  if (pathname.startsWith("/doctor/connections")) return "Connections";

  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 2 && parts[0] === "doctor" && parts[1] === "patients") {
    return "My Patients";
  }
  if (parts.length >= 3 && parts[0] === "doctor" && parts[1] === "patients") {
    const rest = parts.slice(2);
    if (rest.length === 1) return "Patient overview";
    if (rest[1] === "chat") return "AI chat";
    if (rest[1] === "prescriptions") return "Prescriptions";
    if (rest[1] === "documents") return "Documents";
  }
  return "Doctor portal";
}

export default function DoctorHeader({ onMenuClick }: { onMenuClick?: () => void }) {
  const location = useLocation();
  const { currentDoctor } = useIdentity();

  const displayName = useMemo(() => {
    if (!currentDoctor?.name?.trim()) return "Doctor";
    return currentDoctor.name.trim();
  }, [currentDoctor]);

  const title = useMemo(
    () => titleFromPath(location.pathname),
    [location.pathname]
  );

  const specialization = currentDoctor?.specialization?.trim() ?? "";

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

        <div className="hidden min-w-0 max-w-[45%] flex-col gap-0.5 md:flex">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-semibold text-gray-900">
              {displayName}
            </span>
            <span className="shrink-0 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-900">
              Doctor
            </span>
          </div>
          {specialization ? (
            <span className="truncate text-xs text-gray-500">{specialization}</span>
          ) : null}
        </div>

        <h2 className="min-w-0 flex-1 truncate text-center text-sm font-medium text-gray-800 md:text-base">
          {title}
        </h2>

        <div className="flex shrink-0 items-center gap-2">
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
