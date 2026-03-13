import { useState, useEffect } from 'react';
import api from '../../../api/axios';
import Card from '../../../components/ui/Card';
import TextArea from '../../../components/ui/TextArea';
import Badge from '../../../components/ui/Badge';

// ─── CheckboxGroup con catálogo dinámico ─────────────────────

function CheckboxGroup({ label, hint, items, selectedIds, onChange, maxItems }) {
  const count = selectedIds.length;
  const limitReached = maxItems && count >= maxItems;

  const toggle = (id) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      if (limitReached) return;
      onChange([...selectedIds, id]);
    }
  };

  if (!items.length) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">{label}</label>
        <p className="text-xs text-slate-400">Cargando catálogo…</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-700">{label}</label>
        {maxItems && (
          <Badge color={limitReached ? 'warning' : 'accent'}>
            {count}/{maxItems}
          </Badge>
        )}
      </div>
      {hint && <p className="text-xs text-slate-400 -mt-1">{hint}</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => {
          const isSelected = selectedIds.includes(item.id);
          const isDisabled = !isSelected && limitReached;
          return (
            <label
              key={item.id}
              className={`flex items-start gap-2.5 rounded-lg border p-3 text-sm transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5 text-slate-900 shadow-sm'
                  : isDisabled
                    ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer'
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                disabled={isDisabled}
                onChange={() => toggle(item.id)}
                className="mt-0.5 rounded border-slate-300 text-primary focus:ring-primary/20 disabled:opacity-40"
              />
              <span>{item.nombre}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────

export default function StepPerfilDua({ data, onChange }) {
  const dua = data.perfil_dua || {};

  // Catálogos desde API
  const [catFortalezas, setCatFortalezas] = useState([]);
  const [catBarreras, setCatBarreras] = useState([]);
  const [catEstrategias, setCatEstrategias] = useState([]);
  const [catAcceso, setCatAcceso] = useState([]);
  const [catHabilidades, setCatHabilidades] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [f, b, e, a, h] = await Promise.all([
          api.get('/matrices/fortalezas?limit=100'),
          api.get('/matrices/barreras?limit=100'),
          api.get('/matrices/estrategias-dua?limit=100'),
          api.get('/matrices/acceso-curricular?limit=100'),
          api.get('/matrices/habilidades-base?limit=100'),
        ]);
        setCatFortalezas(f.data.data?.items || []);
        setCatBarreras(b.data.data?.items || []);
        setCatEstrategias(e.data.data?.items || []);
        setCatAcceso(a.data.data?.items || []);
        setCatHabilidades(h.data.data?.items || []);
      } catch {
        // silently fail — items stay empty, user sees "Cargando…"
      }
    };
    load();
  }, []);

  // Estrategias agrupadas por principio DUA
  const estratRepr = catEstrategias.filter((e) => e.principio_dua === 'Representacion');
  const estratExpr = catEstrategias.filter((e) => e.principio_dua === 'Expresion');
  const estratMoti = catEstrategias.filter((e) => e.principio_dua === 'Motivacion');

  // Helper: names lookup from selected IDs
  const idsToNames = (ids, catalog) =>
    ids.map((id) => catalog.find((c) => c.id === id)?.nombre).filter(Boolean).join('|');

  // Handle checkbox changes – updates both ID arrays and legacy perfil_dua strings
  const handleMatrix = (idField, duaField, catalog) => (selectedIds) => {
    onChange(idField, selectedIds);
    onChange('perfil_dua', { ...dua, [duaField]: idsToNames(selectedIds, catalog) });
  };

  // Special handler for estrategias DUA (3 subsections share one ID array)
  const allEstrategiaIds = data.estrategia_dua_ids || [];

  const handleEstrategia = (principio, duaField) => (selectedIds) => {
    // Remove old IDs for this principio, add new ones
    const otherIds = allEstrategiaIds.filter(
      (id) => !catEstrategias.find((e) => e.id === id && e.principio_dua === principio)
    );
    const merged = [...otherIds, ...selectedIds];
    onChange('estrategia_dua_ids', merged);

    // Update legacy perfil_dua field
    onChange('perfil_dua', { ...dua, [duaField]: idsToNames(selectedIds, catEstrategias) });
  };

  const handleDua = (field, value) => {
    onChange('perfil_dua', { ...dua, [field]: value });
  };

  // Extract current estrategia IDs per principio
  const selectedReprIds = allEstrategiaIds.filter((id) => estratRepr.some((e) => e.id === id));
  const selectedExprIds = allEstrategiaIds.filter((id) => estratExpr.some((e) => e.id === id));
  const selectedMotiIds = allEstrategiaIds.filter((id) => estratMoti.some((e) => e.id === id));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Paso 2: Perfil del Estudiante</h2>
        <p className="text-sm text-secondary mt-1">
          Registre las principales características de aprendizaje del estudiante basándose en el enfoque DUA.
          Idealmente complete este perfil en menos de 2 minutos.
        </p>
      </div>

      {/* 1. Fortalezas */}
      <Card className="space-y-5">
        <h3 className="text-base font-semibold text-slate-900 border-b border-slate-200 pb-2">
          1. Fortalezas del Estudiante
        </h3>
        <CheckboxGroup
          label="Seleccione las principales fortalezas"
          hint="Máximo 3. Orientarán las estrategias de enseñanza sugeridas."
          items={catFortalezas}
          selectedIds={data.fortaleza_ids || []}
          onChange={handleMatrix('fortaleza_ids', 'fortalezas', catFortalezas)}
          maxItems={3}
        />
      </Card>

      {/* 2. Barreras */}
      <Card className="space-y-5">
        <h3 className="text-base font-semibold text-slate-900 border-b border-slate-200 pb-2">
          2. Barreras de Aprendizaje
        </h3>
        <CheckboxGroup
          label="Seleccione las principales barreras"
          hint="Máximo 3. Identifican los obstáculos principales del proceso educativo."
          items={catBarreras}
          selectedIds={data.barrera_ids || []}
          onChange={handleMatrix('barrera_ids', 'barreras', catBarreras)}
          maxItems={3}
        />
      </Card>

      {/* 3. Acceso curricular */}
      <Card className="space-y-5">
        <h3 className="text-base font-semibold text-slate-900 border-b border-slate-200 pb-2">
          3. Acceso Curricular Clave
        </h3>
        <CheckboxGroup
          label="¿El estudiante requiere trabajar habilidades base?"
          hint="Máximo 2. Permite identificar si se necesitan OA de niveles anteriores."
          items={catAcceso}
          selectedIds={data.acceso_curricular_ids || []}
          onChange={handleMatrix('acceso_curricular_ids', 'acceso_curricular', catAcceso)}
          maxItems={2}
        />
      </Card>

      {/* 4. Preferencias DUA */}
      <Card className="space-y-6">
        <h3 className="text-base font-semibold text-slate-900 border-b border-slate-200 pb-2">
          4. Preferencias de Aprendizaje (DUA)
        </h3>

        <CheckboxGroup
          label="4.1 Representación — ¿Cómo comprende mejor?"
          items={estratRepr}
          selectedIds={selectedReprIds}
          onChange={handleEstrategia('Representacion', 'preferencias_representacion')}
        />

        <CheckboxGroup
          label="4.2 Acción y Expresión — ¿Cómo demuestra lo aprendido?"
          items={estratExpr}
          selectedIds={selectedExprIds}
          onChange={handleEstrategia('Expresion', 'preferencias_expresion')}
        />

        <CheckboxGroup
          label="4.3 Motivación — ¿Qué favorece su participación?"
          items={estratMoti}
          selectedIds={selectedMotiIds}
          onChange={handleEstrategia('Motivacion', 'preferencias_motivacion')}
        />
      </Card>

      {/* 5. Barreras personalizadas */}
      <Card className="space-y-4">
        <h3 className="text-base font-semibold text-slate-900 border-b border-slate-200 pb-2">
          5. Barreras Personalizadas
        </h3>
        <TextArea
          id="barreras_personalizadas"
          label="Describa barreras específicas no listadas"
          placeholder="Escriba aquí barreras particulares del estudiante que no aparecen en las opciones anteriores..."
          value={dua.barreras_personalizadas || ''}
          onChange={(e) => handleDua('barreras_personalizadas', e.target.value)}
          rows={3}
        />
        <p className="text-xs text-slate-400">
          Este espacio es para registrar barreras únicas del estudiante que requieran atención especial.
        </p>
      </Card>

      {/* 6. Habilidades base permanentes */}
      <Card className="space-y-5">
        <h3 className="text-base font-semibold text-slate-900 border-b border-slate-200 pb-2">
          6. Habilidades Base Permanentes
        </h3>
        <CheckboxGroup
          label="Habilidades que se trabajarán durante todo el año"
          hint="Seleccione las que correspondan. Se considerarán en el seguimiento del PACI."
          items={catHabilidades}
          selectedIds={data.habilidad_base_ids || []}
          onChange={handleMatrix('habilidad_base_ids', 'habilidades_base', catHabilidades)}
        />
      </Card>
    </div>
  );
}
