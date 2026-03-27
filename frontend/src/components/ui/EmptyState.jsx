import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title, description, children }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in-up">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 shadow-sm">
        <Icon className="h-10 w-10 text-slate-300" />
      </div>
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      {description && <p className="mt-2 text-sm text-secondary max-w-sm leading-relaxed">{description}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
