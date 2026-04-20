import {
  LayoutDashboard,
  Link2,
  LogOut,
  UserCircle,
  Users,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { paths } from "../../router/paths";

export type DoctorNavItem = {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  badge?: number;
};

const defaultDoctorNavItems: DoctorNavItem[] = [
  {
    path: paths.doctor.root,
    label: "Dashboard",
    icon: LayoutDashboard,
    end: true,
  },
  { path: paths.doctor.patients, label: "My Patients", icon: Users },
  {
    path: paths.doctor.connections,
    label: "Connections",
    icon: Link2,
  },
  { path: paths.doctor.profile, label: "My Profile", icon: UserCircle },
];

function linkClass(active: boolean): string {
  return [
    "doctor-sidebar-nav-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-200",
    active
      ? "bg-teal-50 font-medium text-teal-800"
      : "text-gray-700 hover:bg-gray-100",
  ].join(" ");
}

export default function DoctorSidebar({
  mobileOpen,
  onClose,
  items = defaultDoctorNavItems,
}: {
  mobileOpen: boolean;
  onClose: () => void;
  items?: DoctorNavItem[];
}) {
  const { logout, status } = useAuth();

  const nav = items.map((item) => {
    const Icon = item.icon;
    const badge =
      item.badge != null && item.badge > 0 ? (
        <span className="ml-auto shrink-0 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-900">
          {item.badge > 99 ? "99+" : item.badge}
        </span>
      ) : null;

    return (
      <NavLink
        key={item.path}
        to={item.path}
        end={item.end}
        className={({ isActive }) => linkClass(isActive)}
        onClick={onClose}
      >
        <Icon size={20} className="shrink-0" aria-hidden />
        <span className="doctor-sidebar-label min-w-0 truncate">{item.label}</span>
        {badge}
      </NavLink>
    );
  });

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity md:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!mobileOpen}
        onClick={onClose}
      />

      <aside
        className={[
          "doctor-sidebar-shell flex shrink-0 flex-col border-r border-gray-200 bg-white",
          "transition-all duration-200 ease-out",
          "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:w-[240px]",
          mobileOpen
            ? "max-md:translate-x-0"
            : "max-md:-translate-x-full",
          "md:static md:z-0 md:translate-x-0",
          "md:w-16 md:max-lg:overflow-x-hidden md:max-lg:hover:w-[240px] md:max-lg:hover:shadow-lg",
          "lg:w-[240px]",
        ].join(" ")}
      >
        <div className="flex h-14 shrink-0 items-center justify-end border-b border-gray-200 px-2 md:hidden">
          <button
            type="button"
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
            aria-label="Close menu"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <div className="doctor-sidebar-brand-row flex h-14 shrink-0 items-center border-b border-gray-200 px-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-lg leading-none text-white">
              🩺
            </div>
            <div className="doctor-sidebar-brand min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">
                Doctor portal
              </p>
              <p className="truncate text-xs text-gray-500">Clinical workspace</p>
            </div>
          </div>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
          {nav}
        </nav>

        {status === "authenticated" ? (
          <div className="shrink-0 border-t border-gray-200 p-3">
            <button
              type="button"
              onClick={() => void logout()}
              className={[
                "doctor-sidebar-nav-link flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
                "text-gray-700 transition-colors duration-200 hover:bg-gray-100",
              ].join(" ")}
            >
              <LogOut size={20} className="shrink-0" aria-hidden />
              <span className="doctor-sidebar-label min-w-0 truncate">Log out</span>
            </button>
          </div>
        ) : null}
      </aside>
    </>
  );
}
