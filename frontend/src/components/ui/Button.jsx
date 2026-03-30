import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'bg-gradient-to-r from-primary to-primary-light text-white hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 focus:ring-primary/50',
  secondary: 'bg-secondary text-white hover:bg-secondary/80 hover:shadow-md focus:ring-secondary/50',
  accent: 'bg-gradient-to-r from-accent to-accent-dark text-white hover:shadow-lg hover:shadow-accent/25 hover:-translate-y-0.5 focus:ring-accent/50',
  success: 'bg-gradient-to-r from-green to-green-dark text-white hover:shadow-lg hover:shadow-green/25 hover:-translate-y-0.5 focus:ring-green/50',
  warning: 'bg-gradient-to-r from-orange to-gold text-white hover:shadow-lg hover:shadow-orange/25 hover:-translate-y-0.5 focus:ring-orange/50',
  danger: 'bg-danger text-white hover:bg-danger/90 hover:shadow-md focus:ring-danger/50',
  outline: 'border-2 border-primary text-primary hover:bg-primary hover:text-white hover:shadow-md focus:ring-primary/50',
  ghost: 'text-secondary hover:bg-surface-dark focus:ring-secondary/50',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 rounded-xl font-semibold
        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none cursor-pointer
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
