export default function AdminPanelSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" aria-label="Đang tải dữ liệu">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 rounded-2xl border border-slate-200 bg-white" />
        ))}
      </div>
      <div className="h-80 rounded-2xl border border-slate-200 bg-white" />
    </div>
  );
}
