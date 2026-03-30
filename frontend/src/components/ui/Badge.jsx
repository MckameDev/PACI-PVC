const colorMap = {
  primary: 'bg-primary/10 text-primary',
  accent: 'bg-accent/10 text-accent-dark',
  success: 'bg-green/10 text-green-dark',
  warning: 'bg-orange/10 text-orange-dark',
  danger: 'bg-danger/10 text-danger',
  secondary: 'bg-slate-100 text-slate-600',
  gold: 'bg-gold/10 text-orange-dark',
};

export default function Badge({ children, color = 'secondary', className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colorMap[color] || colorMap.secondary} ${className}`}
    >
      {children}
    </span>
  );
}
