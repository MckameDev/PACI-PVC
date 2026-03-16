import { useState } from 'react';
import { HelpCircle, BookOpen, Lightbulb } from 'lucide-react';
import Modal from './Modal';

/**
 * HelpButton — shows a ? button that opens a modal explaining the module.
 * Props:
 *   title       string  — module name shown in modal header
 *   description string  — what the module does (functional explanation)
 *   meaning     string  — what it means in simple everyday words
 */
export default function HelpButton({ title, description, meaning }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={`Ayuda: ${title}`}
        className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-slate-300 bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer shadow-sm"
      >
        <HelpCircle className="h-4 w-4" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={`¿Cómo funciona: ${title}?`} size="md">
        <div className="space-y-5">
          <div className="flex gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary mt-0.5">
              <BookOpen className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-800 mb-1">¿Qué hace este módulo?</p>
              <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent mt-0.5">
              <Lightbulb className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-800 mb-1">En palabras simples…</p>
              <p className="text-sm text-slate-600 leading-relaxed">{meaning}</p>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
