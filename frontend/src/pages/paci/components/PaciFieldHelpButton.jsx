import { HelpCircle } from 'lucide-react';

export default function PaciFieldHelpButton({ title, onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition-all duration-200 hover:border-primary/30 hover:bg-primary/10 hover:text-primary ${className}`}
      title={`Ayuda: ${title}`}
      aria-label={`Ayuda sobre ${title}`}
    >
      <HelpCircle className="h-4 w-4" />
    </button>
  );
}