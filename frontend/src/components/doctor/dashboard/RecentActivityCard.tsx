import { Link } from "react-router-dom";
import { paths } from "../../../router/paths";
import type { RecentActivityItem } from "../../../types/doctor";
import ActivityItem from "./ActivityItem";

export default function RecentActivityCard({
  items,
}: {
  items: RecentActivityItem[];
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-900">Recent activity</h2>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          Chats and prescriptions will appear here as you use the platform.
        </p>
      ) : (
        <ul className="mt-2">
          {items.map((item) => (
            <ActivityItem
              key={`${item.type}-${item.timestamp}-${item.patient_id}`}
              item={item}
            />
          ))}
        </ul>
      )}
      <div className="mt-4">
        <Link
          to={paths.doctor.patients}
          className="text-sm font-medium text-teal-700 hover:text-teal-800"
        >
          View more →
        </Link>
      </div>
    </section>
  );
}
