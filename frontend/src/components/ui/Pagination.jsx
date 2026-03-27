import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, page - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="rounded-xl p-2 text-slate-500 hover:bg-primary/10 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {start > 1 && (
        <>
          <button onClick={() => onPageChange(1)} className="rounded-xl px-3 py-1.5 text-sm text-slate-600 hover:bg-primary/10 cursor-pointer transition-all">1</button>
          {start > 2 && <span className="px-1 text-slate-400">...</span>}
        </>
      )}

      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`rounded-xl px-3 py-1.5 text-sm font-semibold cursor-pointer transition-all ${
            p === page
              ? 'bg-primary text-white shadow-md shadow-primary/20'
              : 'text-slate-600 hover:bg-primary/10'
          }`}
        >
          {p}
        </button>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="px-1 text-slate-400">...</span>}
          <button onClick={() => onPageChange(totalPages)} className="rounded-xl px-3 py-1.5 text-sm text-slate-600 hover:bg-primary/10 cursor-pointer transition-all">{totalPages}</button>
        </>
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="rounded-xl p-2 text-slate-500 hover:bg-primary/10 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
