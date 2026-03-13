import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Loader2, Download } from 'lucide-react';
import api from '../../api/axios';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';

const IMPORT_TYPES = [
  {
    key: 'oa',
    label: 'Objetivos de Aprendizaje',
    endpoint: '/import/oa',
    columns: ['id_oa', 'asignatura_codigo', 'asignatura_nombre', 'nivel_nombre', 'eje', 'descripcion'],
    description: 'Columnas requeridas: id_oa, asignatura_codigo, asignatura_nombre, nivel_nombre, eje, descripcion',
  },
  {
    key: 'indicadores',
    label: 'Indicadores de Evaluación',
    endpoint: '/import/indicadores',
    columns: ['id_oa', 'texto_indicador', 'nivel_logro'],
    description: 'Columnas requeridas: id_oa, texto_indicador, nivel_logro (L / ED / NL)',
  },
  {
    key: 'barreras',
    label: 'Barreras de Aprendizaje',
    endpoint: '/import/barreras',
    columns: ['codigo', 'categoria', 'nombre', 'definicion', 'dimension'],
    description: 'Ej: B01, Cognitiva, Dificultad de comprensión lectora, Definición..., Curricular',
  },
  {
    key: 'fortalezas',
    label: 'Fortalezas del Estudiante',
    endpoint: '/import/fortalezas',
    columns: ['codigo', 'categoria', 'nombre', 'descripcion_ia', 'valor_dua'],
    description: 'Ej: F01, Cognitiva, Buena memoria visual, Descripción para IA..., Representación',
  },
  {
    key: 'estrategias_lectura',
    label: 'Estrategias de Lectura',
    endpoint: '/import/estrategias-lectura',
    columns: ['codigo', 'nombre', 'momento_lectura', 'descripcion_pedagogica', 'objetivo_metacognitivo'],
    description: 'Ej: L01, Activación de conocimientos previos, Antes, Descripción..., Objetivo...',
  },
  {
    key: 'estrategias_escritura',
    label: 'Estrategias de Escritura',
    endpoint: '/import/estrategias-escritura',
    columns: ['codigo', 'nombre', 'problema_ataca', 'descripcion', 'tipo_apoyo'],
    description: 'Ej: E11, Planificación con esquema previo, Desorganización..., Descripción..., Estructural',
  },
  {
    key: 'estrategias_comunicacion',
    label: 'Estrategias de Comunicación',
    endpoint: '/import/estrategias-comunicacion',
    columns: ['codigo', 'nombre', 'nivel_sugerido', 'descripcion_pedagogica', 'foco_intervencion'],
    description: 'Ej: C01, Tablero de comunicación, NT1–2° Básico, Descripción..., Comunicación Aumentativa',
  },
  {
    key: 'herramientas_apoyo',
    label: 'Herramientas de Apoyo',
    endpoint: '/import/herramientas-apoyo',
    columns: ['codigo', 'nombre', 'proposito_acceso', 'descripcion', 'barrera_mitiga'],
    description: 'Ej: V01, Texto a voz (TTS), Acceso a textos escritos, Descripción..., Dificultad lectora',
  },
];

export default function ImportPage() {
  const [selectedType, setSelectedType] = useState(IMPORT_TYPES[0]);
  const [parsedRows, setParsedRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [alert, setAlert] = useState({ type: '', message: '' });
  const fileRef = useRef();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setAlert({ type: '', message: '' });
    setResult(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (json.length === 0) {
          setAlert({ type: 'error', message: 'El archivo está vacío o no tiene datos.' });
          setParsedRows([]);
          return;
        }

        // Validate columns
        const headers = Object.keys(json[0]).map(h => h.trim().toLowerCase());
        const missing = selectedType.columns.filter(c => !headers.includes(c.toLowerCase()));
        if (missing.length > 0) {
          setAlert({ type: 'error', message: `Columnas faltantes: ${missing.join(', ')}` });
          setParsedRows([]);
          return;
        }

        // Normalize keys to lowercase
        const normalized = json.map(row => {
          const obj = {};
          for (const [key, val] of Object.entries(row)) {
            obj[key.trim().toLowerCase()] = typeof val === 'string' ? val.trim() : val;
          }
          return obj;
        });

        setParsedRows(normalized);
        setAlert({ type: 'success', message: `${normalized.length} filas detectadas. Revise la vista previa y presione "Importar".` });
      } catch (err) {
        setAlert({ type: 'error', message: `Error al leer el archivo: ${err.message}` });
        setParsedRows([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) return;
    setImporting(true);
    setAlert({ type: '', message: '' });
    setResult(null);

    try {
      const res = await api.post(selectedType.endpoint, { rows: parsedRows });
      setResult(res.data.data || res.data);
      setAlert({ type: 'success', message: res.data.message || 'Importación completada exitosamente.' });
      setParsedRows([]);
      setFileName('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al importar datos.';
      setAlert({ type: 'error', message: msg });
    } finally {
      setImporting(false);
    }
  };

  const resetFile = () => {
    setParsedRows([]);
    setFileName('');
    setResult(null);
    setAlert({ type: '', message: '' });
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([selectedType.columns]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
    XLSX.writeFile(wb, `plantilla_${selectedType.key}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Importar Datos desde Excel</h1>
        <p className="text-sm text-secondary mt-1">
          Cargue archivos Excel (.xlsx) para importar OA, Indicadores y las 6 Matrices Pedagógicas de forma masiva.
        </p>
      </div>

      {alert.message && <Alert type={alert.type}>{alert.message}</Alert>}

      {/* Type Selector */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h3 className="text-base font-semibold text-slate-900">
            Tipo de Importación
          </h3>
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <Download className="h-4 w-4 mr-1" /> Descargar plantilla_{selectedType.key}.xlsx
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {IMPORT_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => { setSelectedType(t); resetFile(); }}
              className={`rounded-lg border-2 p-3 text-left transition-all ${
                selectedType.key === t.key
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <FileSpreadsheet className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs font-semibold text-slate-900 leading-tight">{t.label}</span>
              </div>
              <p className="text-[10px] text-secondary line-clamp-2">{t.description}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* File Upload */}
      <Card className="space-y-4">
        <h3 className="text-base font-semibold text-slate-900 border-b border-slate-200 pb-2">
          Cargar Archivo
        </h3>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-6 py-4 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all">
            <Upload className="h-5 w-5 text-secondary" />
            <span className="text-sm font-medium text-slate-700">
              {fileName || 'Seleccionar archivo .xlsx'}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {fileName && (
            <Button variant="outline" size="sm" onClick={resetFile}>
              Limpiar
            </Button>
          )}
        </div>
      </Card>

      {/* Preview */}
      {parsedRows.length > 0 && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="text-base font-semibold text-slate-900">
              Vista Previa <Badge color="accent">{parsedRows.length} filas</Badge>
            </h3>
            <Button onClick={handleImport} disabled={importing}>
              {importing ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Importando...</>
              ) : (
                <><Upload className="h-4 w-4 mr-2" /> Importar {parsedRows.length} filas</>
              )}
            </Button>
          </div>

          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600">#</th>
                  {selectedType.columns.map((col) => (
                    <th key={col} className="px-3 py-2 text-left font-semibold text-slate-600">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parsedRows.slice(0, 50).map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-3 py-1.5 text-slate-400">{i + 1}</td>
                    {selectedType.columns.map((col) => (
                      <td key={col} className="px-3 py-1.5 text-slate-700 max-w-xs truncate">
                        {row[col] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
                {parsedRows.length > 50 && (
                  <tr>
                    <td colSpan={selectedType.columns.length + 1} className="px-3 py-2 text-center text-slate-400">
                      ... y {parsedRows.length - 50} filas más
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Result */}
      {result && (
        <Card className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            <h3 className="text-base font-semibold text-slate-900">Resultado de Importación</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            {result.insertados != null && (
              <div className="rounded-lg bg-success/10 p-3 text-center">
                <p className="text-2xl font-bold text-success">{result.insertados}</p>
                <p className="text-xs text-secondary">Insertados</p>
              </div>
            )}
            {result.actualizados != null && (
              <div className="rounded-lg bg-accent/10 p-3 text-center">
                <p className="text-2xl font-bold text-accent">{result.actualizados}</p>
                <p className="text-xs text-secondary">Actualizados</p>
              </div>
            )}
            {result.errores != null && (
              <div className="rounded-lg bg-danger/10 p-3 text-center">
                <p className="text-2xl font-bold text-danger">{result.errores}</p>
                <p className="text-xs text-secondary">Errores</p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
