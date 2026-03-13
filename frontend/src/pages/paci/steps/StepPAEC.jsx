import { Plus, Trash2 } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import TextArea from '../../../components/ui/TextArea';

const TIPOS_PAEC = [
  { key: 'Activador', label: 'Activadores / Gatillantes', color: 'danger', descPlaceholder: 'Describa la situación activadora...', stratPlaceholder: 'Estrategia de prevención o manejo...' },
  { key: 'Estrategia', label: 'Estrategias de Regulación', color: 'primary', descPlaceholder: 'Describa la estrategia de regulación...', stratPlaceholder: 'Forma de implementación...' },
  { key: 'Desregulacion', label: 'Protocolo ante Desregulación', color: 'warning', descPlaceholder: 'Describa la conducta o situación...', stratPlaceholder: 'Protocolo o pasos a seguir...' },
  { key: 'Protocolo', label: 'Protocolos Institucionales', color: 'accent', descPlaceholder: 'Describa el protocolo institucional...', stratPlaceholder: 'Acciones concretas del protocolo...' },
];

export default function StepPAEC({ data, onChange }) {
  const variables = data.paec_variables || [];

  const addVariable = (tipo) => {
    const maxOrden = variables.filter(v => v.tipo === tipo).reduce((max, v) => Math.max(max, v.orden || 0), 0);
    onChange('paec_variables', [...variables, { tipo, descripcion: '', estrategia: '', orden: maxOrden + 1 }]);
  };

  const updateVariable = (idx, field, value) => {
    const updated = [...variables];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange('paec_variables', updated);
  };

  const removeVariable = (idx) => {
    onChange('paec_variables', variables.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Paso 4: Plan de Acompañamiento Emocional y Conductual</h2>
        <p className="text-sm text-secondary mt-1">
          Si el estudiante requiere un PAEC, active la opción y agregue las variables estructuradas por categoría.
        </p>
      </div>

      <Card className="space-y-5">
        <h3 className="text-base font-semibold text-slate-900 border-b border-slate-200 pb-2">
          PAEC — Plan de Regulación Emocional y Conductual
        </h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={!!data.aplica_paec}
            onChange={(e) => onChange('aplica_paec', e.target.checked ? 1 : 0)}
            className="rounded border-slate-300 text-primary focus:ring-primary/20"
          />
          <span className="text-sm font-medium text-slate-700">
            El estudiante requiere Plan de Regulación Emocional y Conductual
          </span>
        </label>

        {data.aplica_paec ? (
          <div className="space-y-6 pl-2">
            {/* Legacy fields for backward compat */}
            <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
              <h4 className="text-sm font-semibold text-slate-700">Descripción General (opcional)</h4>
              <TextArea
                id="paec_activadores"
                label="Activadores"
                placeholder="Descripción general de activadores..."
                value={data.paec_activadores || ''}
                onChange={(e) => onChange('paec_activadores', e.target.value)}
                rows={2}
              />
              <TextArea
                id="paec_estrategias"
                label="Estrategias"
                placeholder="Descripción general de estrategias..."
                value={data.paec_estrategias || ''}
                onChange={(e) => onChange('paec_estrategias', e.target.value)}
                rows={2}
              />
              <TextArea
                id="paec_desregulacion"
                label="Protocolo"
                placeholder="Descripción general del protocolo..."
                value={data.paec_desregulacion || ''}
                onChange={(e) => onChange('paec_desregulacion', e.target.value)}
                rows={2}
              />
            </div>

            {/* Structured Variables */}
            <div className="space-y-5">
              <h4 className="text-sm font-semibold text-slate-900">Variables Estructuradas del PAEC</h4>
              <p className="text-xs text-secondary -mt-3">
                Agregue ítems específicos por categoría. Cada ítem tiene una descripción y una estrategia asociada.
              </p>

              {TIPOS_PAEC.map(({ key, label, color, descPlaceholder, stratPlaceholder }) => {
                const tipoVars = variables.map((v, i) => ({ ...v, _idx: i })).filter(v => v.tipo === key);
                return (
                  <div key={key} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className={`text-sm font-semibold text-${color}`}>
                        {label} ({tipoVars.length})
                      </h5>
                      <Button size="sm" variant="outline" onClick={() => addVariable(key)}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
                      </Button>
                    </div>

                    {tipoVars.length === 0 && (
                      <p className="text-xs text-slate-400 italic">Sin ítems. Haga clic en "Agregar" para añadir uno.</p>
                    )}

                    {tipoVars.map((v) => (
                      <div key={v._idx} className={`rounded-lg border border-${color}/20 bg-${color}/5 p-3 space-y-2`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 space-y-2">
                            <Input
                              id={`paec_desc_${v._idx}`}
                              label="Descripción"
                              placeholder={descPlaceholder}
                              value={v.descripcion || ''}
                              onChange={(e) => updateVariable(v._idx, 'descripcion', e.target.value)}
                            />
                            <TextArea
                              id={`paec_strat_${v._idx}`}
                              label="Estrategia / Protocolo"
                              placeholder={stratPlaceholder}
                              value={v.estrategia || ''}
                              onChange={(e) => updateVariable(v._idx, 'estrategia', e.target.value)}
                              rows={2}
                            />
                          </div>
                          <button
                            onClick={() => removeVariable(v._idx)}
                            className="mt-6 p-1.5 rounded-md text-danger hover:bg-danger/10 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
            Active la casilla si el estudiante necesita un plan de regulación emocional y conductual.
            De lo contrario, puede continuar al siguiente paso.
          </div>
        )}
      </Card>
    </div>
  );
}
