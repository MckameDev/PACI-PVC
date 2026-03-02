import Card from '../../../components/ui/Card';
import TextArea from '../../../components/ui/TextArea';

const DUA_FORTALEZAS = [
  'Buena memoria visual',
  'Interés por actividades prácticas',
  'Capacidad de seguir rutinas',
  'Buena motricidad fina',
  'Interés por la tecnología',
  'Creatividad artística',
  'Buena comprensión oral',
  'Habilidades sociales positivas',
  'Perseverancia en tareas de interés',
  'Responde bien a refuerzo positivo',
];

const DUA_BARRERAS = [
  'Dificultad para mantener la atención sostenida',
  'Problemas de comprensión lectora',
  'Dificultad en el procesamiento del lenguaje',
  'Ritmo de trabajo más lento',
  'Dificultad para seguir instrucciones complejas',
  'Problemas de memoria de trabajo',
  'Baja tolerancia a la frustración',
  'Dificultad en habilidades de escritura',
  'Problemas de organización y planificación',
  'Dificultad en el cálculo matemático',
];

const PREF_REPRESENTACION = [
  'Material visual (imágenes, esquemas, videos)',
  'Material auditivo (explicación oral, audiolibros)',
  'Material concreto/manipulativo',
  'Texto simplificado con apoyos gráficos',
  'Organizadores gráficos (mapas conceptuales)',
];

const PREF_EXPRESION = [
  'Expresión oral',
  'Expresión escrita con apoyo',
  'Dibujos y representaciones gráficas',
  'Uso de tecnología (tablet, computador)',
  'Trabajo práctico/manipulativo',
];

const PREF_MOTIVACION = [
  'Refuerzo positivo verbal',
  'Actividades con componente lúdico',
  'Trabajo en grupos pequeños',
  'Temas conectados con sus intereses',
  'Metas cortas y alcanzables',
  'Uso de temporizadores visuales',
];

function CheckboxGroup({ label, items, selected, onChange }) {
  const selectedArr = selected ? selected.split('|').filter(Boolean) : [];

  const toggle = (item) => {
    const newArr = selectedArr.includes(item)
      ? selectedArr.filter((i) => i !== item)
      : [...selectedArr, item];
    onChange(newArr.join('|'));
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <label
            key={item}
            className={`flex items-start gap-2 rounded-lg border p-3 text-sm cursor-pointer transition-colors ${
              selectedArr.includes(item)
                ? 'border-primary bg-primary/5 text-slate-900'
                : 'border-slate-200 hover:bg-slate-50 text-slate-600'
            }`}
          >
            <input
              type="checkbox"
              checked={selectedArr.includes(item)}
              onChange={() => toggle(item)}
              className="mt-0.5 rounded border-slate-300 text-primary focus:ring-primary/20"
            />
            <span>{item}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function StepPerfilDua({ data, onChange }) {
  const dua = data.perfil_dua || {};

  const handleDua = (field, value) => {
    onChange('perfil_dua', { ...dua, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Paso 2: Perfil DUA y PAEC</h2>
        <p className="text-sm text-secondary mt-1">
          Configure el perfil del Diseño Universal de Aprendizaje y, si aplica, el Plan de Acompañamiento Emocional y Conductual.
        </p>
      </div>

      {/* DUA */}
      <Card className="space-y-6">
        <h3 className="text-base font-semibold text-slate-900 border-b border-slate-200 pb-2">
          Perfil DUA
        </h3>
        <CheckboxGroup
          label="Fortalezas del Estudiante"
          items={DUA_FORTALEZAS}
          selected={dua.fortalezas || ''}
          onChange={(v) => handleDua('fortalezas', v)}
        />
        <CheckboxGroup
          label="Barreras de Aprendizaje"
          items={DUA_BARRERAS}
          selected={dua.barreras || ''}
          onChange={(v) => handleDua('barreras', v)}
        />
        <CheckboxGroup
          label="Preferencias de Representación"
          items={PREF_REPRESENTACION}
          selected={dua.preferencias_representacion || ''}
          onChange={(v) => handleDua('preferencias_representacion', v)}
        />
        <CheckboxGroup
          label="Preferencias de Acción y Expresión"
          items={PREF_EXPRESION}
          selected={dua.preferencias_expresion || ''}
          onChange={(v) => handleDua('preferencias_expresion', v)}
        />
        <CheckboxGroup
          label="Preferencias de Motivación e Implicación"
          items={PREF_MOTIVACION}
          selected={dua.preferencias_motivacion || ''}
          onChange={(v) => handleDua('preferencias_motivacion', v)}
        />
      </Card>

      {/* PAEC */}
      <Card className="space-y-5">
        <h3 className="text-base font-semibold text-slate-900 border-b border-slate-200 pb-2">
          Plan de Acompañamiento Emocional y Conductual (PAEC)
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
          <div className="space-y-4 pl-7">
            <TextArea
              id="paec_activadores"
              label="Activadores / Gatillantes"
              placeholder="Describa las situaciones que activan conductas desreguladas..."
              value={data.paec_activadores || ''}
              onChange={(e) => onChange('paec_activadores', e.target.value)}
              rows={3}
            />
            <TextArea
              id="paec_estrategias"
              label="Estrategias de Regulación"
              placeholder="Describa las estrategias de intervención y apoyo..."
              value={data.paec_estrategias || ''}
              onChange={(e) => onChange('paec_estrategias', e.target.value)}
              rows={3}
            />
            <TextArea
              id="paec_desregulacion"
              label="Protocolo ante Desregulación"
              placeholder="Describa el protocolo a seguir en caso de crisis o desregulación..."
              value={data.paec_desregulacion || ''}
              onChange={(e) => onChange('paec_desregulacion', e.target.value)}
              rows={3}
            />
          </div>
        ) : null}
      </Card>
    </div>
  );
}
