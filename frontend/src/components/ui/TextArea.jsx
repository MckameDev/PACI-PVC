export default function TextArea({ label, id, error, className = '', rows = 3, labelAction = null, ...props }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={id} className="block text-sm font-medium text-slate-700">
            {label}
          </label>
          {labelAction && <div className="shrink-0">{labelAction}</div>}
        </div>
      )}
      <textarea
        id={id}
        rows={rows}
        className={`
          block w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900
          placeholder:text-slate-400 transition-all duration-200 resize-y
          focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:shadow-sm
          ${error ? 'border-danger focus:border-danger focus:ring-danger/20' : 'border-slate-300 hover:border-slate-400'}
        `}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
