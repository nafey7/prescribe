interface Props {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export default function DocumentPagination({
  page,
  pageSize,
  total,
  onPageChange,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  if (total === 0) return null;

  return (
    <div className="flex items-center justify-center gap-4 py-4 text-sm text-gray-600">
      <button
        type="button"
        disabled={!canPrev}
        onClick={() => onPageChange(page - 1)}
        className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
      >
        Previous
      </button>
      <span>
        Page {page} of {totalPages}
        <span className="text-gray-400"> · {total} total</span>
      </span>
      <button
        type="button"
        disabled={!canNext}
        onClick={() => onPageChange(page + 1)}
        className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
      >
        Next
      </button>
    </div>
  );
}
