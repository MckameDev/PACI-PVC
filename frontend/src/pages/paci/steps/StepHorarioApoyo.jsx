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
  filas: Array.from({ length: 8 }, (_, i) => buildEmptyRow(i + 1, DEFAULT_COLUMNS)),
});

const slugify = (value) =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

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

  const addColumna = () => {
    const titulo = window.prompt('Nombre de la nueva columna:');
    if (!titulo || !titulo.trim()) return;

    let keyBase = slugify(titulo);
    if (!keyBase) keyBase = 'columna';

    let key = keyBase;
    let seq = 2;
    const keysExistentes = new Set(columnas.map((c) => c.key));
    while (keysExistentes.has(key)) {
      key = `${keyBase}_${seq}`;
      seq += 1;
    }

    const newCol = {
      key,
      titulo: titulo.trim(),
      orden: columnas.length + 1,
      es_fija: 0,
    };

    const nextRows = filas.map((row) => ({
      ...row,
      celdas: {
        ...(row.celdas || {}),
        [key]: '',
      },
    }));

    updateHorario({
      columnas: [...columnas, newCol],
      filas: nextRows,
    });
  };

  const removeColumna = (colKey) => {
    const target = columnas.find((col) => col.key === colKey);
    if (!target || target.es_fija) return;

    const nextColumns = columnas
      .filter((col) => col.key !== colKey)
      .map((col, index) => ({ ...col, orden: index + 1 }));

    const nextRows = filas.map((row) => {
      const nextCells = { ...(row.celdas || {}) };
      delete nextCells[colKey];
      return { ...row, celdas: nextCells };
    });

    updateHorario({
      columnas: nextColumns,
      filas: nextRows,
    });
  };

  const updateHora = (rowId, value) => {
    const nextRows = filas.map((row) => (row.id === rowId ? { ...row, hora: value } : row));
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
          Defina la grilla semanal del apoyo pedagógico. Puede agregar filas y columnas según lo que requiera el formato completo.
        </p>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-slate-900 border-b border-slate-200 pb-2 w-full sm:w-auto">
            12. Horario de Apoyo
          </h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={addColumna}>
              <Plus className="h-3.5 w-3.5" /> Columna
            </Button>
            <Button size="sm" variant="outline" onClick={addFila}>
              <Plus className="h-3.5 w-3.5" /> Fila
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {columnas.map((col) => (
                  <th key={col.key} className="px-3 py-2 text-left font-semibold text-slate-700 align-top">
                    <div className="flex items-start justify-between gap-2">
                      <span>{col.titulo}</span>
                      {!col.es_fija && (
                        <button
                          type="button"
                          onClick={() => removeColumna(col.key)}
                          className="rounded p-1 text-slate-400 hover:bg-danger/10 hover:text-danger"
                          title="Eliminar columna"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
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
                            placeholder="08:00 - 08:45"
                            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
                          />
                        </td>
                      );
                    }

                    return (
                      <td key={col.key} className="px-2 py-2">
                        <textarea
                          value={(row.celdas || {})[col.key] || ''}
                          onChange={(e) => updateCelda(row.id, col.key, e.target.value)}
                          rows={2}
                          className="w-full resize-y rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
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
      </Card>
    </div>
  );
}
