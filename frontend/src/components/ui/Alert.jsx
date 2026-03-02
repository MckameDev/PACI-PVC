import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const icons = {
  error: AlertTriangle,
  success: CheckCircle,
  info: Info,
  warning: AlertTriangle,
};

const colors = {
  error: 'border-danger/20 bg-danger/5 text-danger',
  success: 'border-success/20 bg-success/5 text-success',
  info: 'border-accent/20 bg-accent/5 text-accent',
  warning: 'border-warning/20 bg-warning/5 text-warning',
};

export default function Alert({ type = 'info', message, onClose, className = '' }) {
  if (!message) return null;

  const Icon = icons[type];

  return (
    <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${colors[type]} ${className}`}>
      <Icon className="h-5 w-5 shrink-0 mt-0.5" />
      <p className="flex-1 text-sm">{message}</p>
      {onClose && (
        <button onClick={onClose} className="shrink-0 opacity-60 hover:opacity-100 cursor-pointer transition-opacity">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
