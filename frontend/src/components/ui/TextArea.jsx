export default function TextArea({ label, id, error, className = '', rows = 3, ...props }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <textarea
        id={id}
        rows={rows}
        className={`
          block w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900
          placeholder:text-slate-400 transition-colors duration-200 resize-y
          focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
          ${error ? 'border-danger focus:border-danger focus:ring-danger/20' : 'border-slate-300'}
        `}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
