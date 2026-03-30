import { Loader2 } from 'lucide-react';

export default function Spinner({ className = '', size = 'md' }) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <Loader2 className={`animate-spin text-primary ${sizes[size]}`} />
      {size === 'lg' && <p className="text-sm text-secondary font-medium animate-pulse">Cargando...</p>}
    </div>
  );
}
