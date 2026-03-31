import { Plus, Trash2 } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';

const DEFAULT_COLUMNS = [
  { key: 'hora', titulo: 'Hora', orden: 1, es_fija: 1 },
  { key: 'lunes', titulo: 'Lunes', orden: 2, es_fija: 1 },
  { key: 'martes', titulo: 'Martes', orden: 3, es_fija: 1 },
  { key: 'miercoles', titulo: 'Miércoles', orden: 4, es_fija: 1 },
  { key: 'jueves', titulo: 'Jueves', orden: 5, es_fija: 1 },
  { key: 'viernes', titulo: 'Viernes', orden: 6, es_fija: 1 },
];

const makeId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const buildEmptyRow = (orden, columns) => {
  const celdas = {};
  columns.forEach((col) => {
    if (col.key !== 'hora') celdas[col.key] = '';
  });

  return {
    id: makeId(),
    orden,
    hora: '',
    celdas,
  };
};

const buildDefaultHorario = () => ({
  columnas: DEFAULT_COLUMNS,
  filas: Array.from({ length: 3 }, (_, i) => buildEmptyRow(i + 1, DEFAULT_COLUMNS)),
});

const sanitizeHorarioInput = (value) => {
  const raw = (value || '').replace(/[^0-9]/g, '').slice(0, 8);
  const p1 = raw.slice(0, 2);
  const p2 = raw.slice(2, 4);
  const p3 = raw.slice(4, 6);
  const p4 = raw.slice(6, 8);

  let formatted = '';
  if (p1) formatted += p1;
  if (p2) formatted += `:${p2}`;
  if (p3) formatted += ` - ${p3}`;
  if (p4) formatted += `:${p4}`;
  return formatted;
};

const isValidHorarioRange = (value) => {
  const match = /^(\d{2}):(\d{2})\s-\s(\d{2}):(\d{2})$/.exec((value || '').trim());
  if (!match) return false;

  const h1 = Number(match[1]);
  const m1 = Number(match[2]);
  const h2 = Number(match[3]);
  const m2 = Number(match[4]);

  if (h1 > 23 || h2 > 23 || m1 > 59 || m2 > 59) return false;
  const start = h1 * 60 + m1;
  const end = h2 * 60 + m2;
  return end > start;
};

export default function StepHorarioApoyo({ data, onChange }) {
  const horario = data.horario_apoyo || buildDefaultHorario();
  const columnas = (horario.columnas || []).slice().sort((a, b) => (a.orden || 0) - (b.orden || 0));
  const filas = (horario.filas || []).slice().sort((a, b) => (a.orden || 0) - (b.orden || 0));

  const updateHorario = (next) => {
    onChange('horario_apoyo', {
      ...horario,
      ...next,
    });
  };

  const addFila = () => {
    const nextOrden = filas.length + 1;
    updateHorario({ filas: [...filas, buildEmptyRow(nextOrden, columnas)] });
  };

  const removeFila = (rowId) => {
    const nextRows = filas
      .filter((row) => row.id !== rowId)
      .map((row, index) => ({ ...row, orden: index + 1 }));
    updateHorario({ filas: nextRows });
  };

  const updateHora = (rowId, value) => {
    const nextRows = filas.map((row) => (
      row.id === rowId ? { ...row, hora: sanitizeHorarioInput(value) } : row
    ));
    updateHorario({ filas: nextRows });
  };

  const normalizeHora = (rowId) => {
    const row = filas.find((r) => r.id === rowId);
    if (!row) return;
    const value = (row.hora || '').trim();
    if (!value || isValidHorarioRange(value)) return;
    const nextRows = filas.map((r) => (r.id === rowId ? { ...r, hora: '' } : r));
    updateHorario({ filas: nextRows });
  };

  const updateCelda = (rowId, colKey, value) => {
    const nextRows = filas.map((row) => {
      if (row.id !== rowId) return row;
      return {
        ...row,
        celdas: {
          ...(row.celdas || {}),
          [colKey]: value,
        },
      };
    });

    updateHorario({ filas: nextRows });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Paso 5: Horario de Apoyo</h2>
        <p className="text-sm text-secondary mt-1">
          Defina la grilla semanal del apoyo pedagógico. Puede agregar filas según lo que requiera el formato completo.
        </p>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-slate-900 border-b border-slate-200 pb-2 w-full sm:w-auto">
            12. Horario de Apoyo
          </h3>
          <p className="text-xs text-slate-500">Formato obligatorio de hora: 08:00 - 08:45</p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <div className="max-h-[260px] overflow-y-auto">
            <table className="w-full min-w-[980px] table-fixed text-sm">
            <colgroup>
              <col className="w-[170px]" />
              <col />
              <col />
              <col />
              <col />
              <col />
              <col className="w-[44px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {columnas.map((col) => (
                  <th key={col.key} className="px-3 py-2 text-left font-semibold text-slate-700 align-top">
                    <span>{col.titulo}</span>
                  </th>
                ))}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filas.map((row) => (
                <tr key={row.id}>
                  {columnas.map((col) => {
                    if (col.key === 'hora') {
                      return (
                        <td key={col.key} className="px-2 py-2">
                          <input
                            type="text"
                            value={row.hora || ''}
                            onChange={(e) => updateHora(row.id, e.target.value)}
                            onBlur={() => normalizeHora(row.id)}
                            placeholder="08:00 - 08:45"
                            inputMode="numeric"
                            maxLength={13}
                            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
                          />
                        </td>
                      );
                    }

                    return (
                      <td key={col.key} className="px-2 py-2">
                        <input
                          type="text"
                          value={(row.celdas || {})[col.key] || ''}
                          onChange={(e) => updateCelda(row.id, col.key, e.target.value)}
                          maxLength={30}
                          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
                          placeholder="Escriba el apoyo para este bloque"
                        />
                      </td>
                    );
                  })}
                  <td className="px-1 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeFila(row.id)}
                      className="rounded p-1.5 text-slate-400 hover:bg-danger/10 hover:text-danger"
                      title="Eliminar fila"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={addFila}>
            <Plus className="h-3.5 w-3.5" /> Anadir fila
          </Button>
        </div>
      </Card>
    </div>
  );
}
