export default function StatCard({ icon: Icon, label, value, subtitle, color = 'primary' }) {
  const iconStyles = {
    primary: 'bg-gradient-to-br from-primary to-primary-light text-white shadow-primary/20',
    accent: 'bg-gradient-to-br from-accent to-accent-dark text-white shadow-accent/20',
    success: 'bg-gradient-to-br from-green to-green-dark text-white shadow-green/20',
    warning: 'bg-gradient-to-br from-orange to-gold text-white shadow-orange/20',
    danger: 'bg-gradient-to-br from-danger to-red-600 text-white shadow-danger/20',
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-secondary">{label}</p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
          {subtitle && <p className="text-xs text-secondary mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`rounded-xl p-3 shadow-md ${iconStyles[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        )}
      </div>
    </div>
  );
}
