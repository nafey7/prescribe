export default function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-28 rounded-xl bg-gray-200" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-40 rounded-xl bg-gray-200" />
        <div className="h-40 rounded-xl bg-gray-200" />
      </div>
      <div className="h-48 rounded-xl bg-gray-200" />
      <div className="h-40 rounded-xl bg-gray-200" />
      <div className="h-56 rounded-xl bg-gray-200" />
    </div>
  );
}
