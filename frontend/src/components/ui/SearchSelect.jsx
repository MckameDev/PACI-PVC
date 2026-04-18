import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

/**
 * SearchSelect — Select2-like component with search/filter.
 *
 * Props:
 *  - label        : string (optional label above)
 *  - id           : string (for htmlFor/label)
 *  - options      : [{ value, label }]
 *  - value        : string (selected value)
 *  - onChange      : (value) => void — NOTE: receives value directly, not event
 *  - placeholder  : string
 *  - error        : string
 *  - disabled     : boolean
 *  - className    : string
 *  - required     : boolean
 */
export default function SearchSelect({
  label,
  id,
  options = [],
  value,
  onChange,
  placeholder = 'Seleccione...',
  error,
  disabled = false,
  className = '',
  required = false,
  labelAction = null,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selectedOption = options.find((o) => String(o.value) === String(value));

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const filtered = search
    ? options.filter((o) => String(o.label || '').toLowerCase().includes(search.toLowerCase()))
    : options;

  const handleSelect = (val) => {
    onChange(val);
    setOpen(false);
    setSearch('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setSearch('');
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`} ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={id} className="block text-sm font-medium text-slate-700">
            {label}
          </label>
          {labelAction && <div className="shrink-0">{labelAction}</div>}
        </div>
      )}

      <div className="relative">
        {/* Trigger button */}
        <button
          type="button"
          id={id}
          disabled={disabled}
          onClick={() => !disabled && setOpen(!open)}
          className={`
            flex w-full items-center justify-between rounded-xl border bg-white px-3.5 py-2.5 text-sm text-left
            transition-all duration-200 cursor-pointer
            ${disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : ''}
            ${open ? 'border-primary ring-2 ring-primary/20 shadow-sm' : ''}
            ${error ? 'border-danger focus:border-danger focus:ring-danger/20' : 'border-slate-300 hover:border-slate-400'}
          `}
        >
          <span className={selectedOption ? 'text-slate-900 truncate pr-6' : 'text-slate-400 truncate pr-6'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {value && !disabled && (
              <span
                role="button"
                tabIndex={-1}
                onClick={handleClear}
                className="rounded-full p-0.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-xl animate-scale-in">
            {/* Search input */}
            <div className="relative border-b border-slate-200 p-2">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full rounded-md border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                placeholder="Buscar..."
              />
            </div>

            {/* Options list */}
            <ul className="max-h-60 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-sm text-slate-400 text-center">Sin resultados</li>
              ) : (
                filtered.map((opt) => {
                  const isSelected = String(opt.value) === String(value);
                  return (
                    <li
                      key={opt.value}
                      onClick={() => handleSelect(opt.value)}
                      className={`cursor-pointer px-3 py-2 text-sm transition-all ${
                        isSelected
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-slate-700 hover:bg-primary/5'
                      }`}
                    >
                      {opt.label}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
