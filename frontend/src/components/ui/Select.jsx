export default function Select({ label, id, error, options = [], placeholder, className = '', ...props }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <select
        id={id}
        className={`
          block w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900
          transition-colors duration-200
          focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
          ${error ? 'border-danger focus:border-danger focus:ring-danger/20' : 'border-slate-300'}
        `}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
