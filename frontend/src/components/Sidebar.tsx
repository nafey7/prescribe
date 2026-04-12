import {
  FileText,
  LayoutDashboard,
  MessageSquare,
  User,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";

export type SidebarNavItem = {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  publicRoute?: boolean;
  end?: boolean;
};

export const patientNavItems: SidebarNavItem[] = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { path: "/profile", label: "My Profile", icon: User },
  { path: "/documents", label: "Documents", icon: FileText },
  {
    path: "/public/chat",
    label: "AI Chat",
    icon: MessageSquare,
    publicRoute: true,
  },
];

function linkClass(active: boolean): string {
  return [
    "sidebar-nav-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-200",
    active
      ? "bg-blue-50 font-medium text-blue-700"
      : "text-gray-700 hover:bg-gray-100",
  ].join(" ");
}

export default function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const items = patientNavItems.map((item) => {
    const Icon = item.icon;

    if (item.publicRoute) {
      return (
        <NavLink
          key={item.path}
          to={item.path}
          end
          className={({ isActive }) => linkClass(isActive)}
          onClick={onClose}
        >
          <Icon size={20} className="shrink-0" aria-hidden />
          <span className="sidebar-label min-w-0 truncate">{item.label}</span>
        </NavLink>
      );
    }

    return (
      <NavLink
        key={item.path}
        to={item.path}
        end={item.end}
        className={({ isActive }) => linkClass(isActive)}
        onClick={onClose}
      >
        <Icon size={20} className="shrink-0" aria-hidden />
        <span className="sidebar-label min-w-0 truncate">{item.label}</span>
      </NavLink>
    );
  });

  return (
    <>
      {/* Mobile (max-md): dim background when drawer open */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity md:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!mobileOpen}
        onClick={onClose}
      />

      <aside
        className={[
          "sidebar-shell flex shrink-0 flex-col border-r border-gray-200 bg-white",
          "transition-all duration-200 ease-out",
          /* Mobile: slide-over drawer */
          "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:w-[240px]",
          mobileOpen
            ? "max-md:translate-x-0"
            : "max-md:-translate-x-full",
          /* Tablet & desktop: in layout */
          "md:static md:z-0 md:translate-x-0",
          /* Tablet 768–1023: narrow rail, expand width on hover */
          "md:w-16 md:max-lg:overflow-x-hidden md:max-lg:hover:w-[240px] md:max-lg:hover:shadow-lg",
          /* Desktop ≥1024: full width rail */
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

        <div className="sidebar-brand-row flex h-14 shrink-0 items-center border-b border-gray-200 px-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-lg leading-none text-white">
              🩺
            </div>
            <div className="sidebar-brand min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">
                Patient portal
              </p>
              <p className="truncate text-xs text-gray-500">Health overview</p>
            </div>
          </div>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
          {items}
        </nav>
      </aside>
    </>
  );
}
