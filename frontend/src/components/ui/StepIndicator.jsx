import { Check } from 'lucide-react';

export default function StepIndicator({ steps, currentStep }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, index) => {
        const stepNum = index + 1;
        const isCompleted = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;

        return (
          <div key={stepNum} className="flex items-center gap-2">
            {/* Step circle */}
            <div className="flex items-center gap-2">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition-all duration-300 ${
                  isCompleted
                    ? 'bg-gradient-to-br from-green to-green-dark text-white shadow-md shadow-green/20'
                    : isCurrent
                    ? 'bg-gradient-to-br from-primary to-primary-light text-white shadow-md shadow-primary/20'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : stepNum}
              </div>
              <span
                className={`hidden sm:block text-sm font-semibold ${
                  isCurrent ? 'text-slate-900' : isCompleted ? 'text-green-dark' : 'text-slate-400'
                }`}
              >
                {step}
              </span>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={`hidden sm:block h-0.5 w-10 rounded-full transition-colors duration-300 ${
                  isCompleted ? 'bg-green' : 'bg-slate-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
