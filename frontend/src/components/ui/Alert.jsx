import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const icons = {
  error: AlertTriangle,
  success: CheckCircle,
  info: Info,
  warning: AlertTriangle,
};

const colors = {
  error: 'border-danger/20 bg-danger/5 text-danger',
  success: 'border-green/20 bg-green/5 text-green-dark',
  info: 'border-accent/20 bg-accent/5 text-accent-dark',
  warning: 'border-orange/20 bg-orange/5 text-orange-dark',
};

export default function Alert({ type = 'info', message, onClose, className = '' }) {
  if (!message) return null;

  const Icon = icons[type];

  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 animate-fade-in-up ${colors[type]} ${className}`}>
      <Icon className="h-5 w-5 shrink-0 mt-0.5" />
      <p className="flex-1 text-sm font-medium">{message}</p>
      {onClose && (
        <button onClick={onClose} className="shrink-0 rounded-lg p-1 opacity-60 hover:opacity-100 hover:bg-white/50 cursor-pointer transition-all">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
