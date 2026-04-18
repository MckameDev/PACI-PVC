import { useCallback, useEffect, useState } from 'react';
import { Brain, FileText, LibraryBig, Pencil, Plus, Power, Save, Upload } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import TextArea from '../../components/ui/TextArea';
import Alert from '../../components/ui/Alert';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import HelpButton from '../../components/ui/HelpButton';
import {
  createIaParametroAdmin,
  createIaKnowledgeBookFromFileAdmin,
  createIaKnowledgeBookFromTextAdmin,
  getIaConfigAdmin,
  listIaKnowledgeBooksAdmin,
  saveIaConfigAdmin,
  toggleIaKnowledgeBookAdmin,
  toggleIaParametroAdmin,
  updateIaParametroAdmin,
} from '../../services/aiAdminService';

const EMPTY_CONFIG = {
  nombre: 'Motor PACI v4.0',
  prompt_inicial: '',
  modelo: 'openai/gpt-4.1-mini',
  temperature: '0.7',
  max_tokens: '1500',
};

const EMPTY_PARAM = {
  clave: '',
  valor: '',
  tipo: 'text',
  descripcion: '',
  orden: 0,
};

const EMPTY_BOOK_FORM = {
  titulo: '',
  contenido: '',
};

export default function IaAdminPage() {
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingParam, setSavingParam] = useState(false);

  const [configId, setConfigId] = useState('');
  const [config, setConfig] = useState(EMPTY_CONFIG);
  const [parametros, setParametros] = useState([]);

  const [alert, setAlert] = useState({ type: '', message: '' });
  const [errors, setErrors] = useState({});

  const [paramModal, setParamModal] = useState(false);
  const [editingParam, setEditingParam] = useState(null);
  const [paramForm, setParamForm] = useState(EMPTY_PARAM);

  const [booksLoading, setBooksLoading] = useState(true);
  const [bookActionLoading, setBookActionLoading] = useState(false);
  const [books, setBooks] = useState([]);
  const [bookUploadMode, setBookUploadMode] = useState('archivo');
  const [bookForm, setBookForm] = useState(EMPTY_BOOK_FORM);
  const [bookFile, setBookFile] = useState(null);
  const [showOptionalBookFields, setShowOptionalBookFields] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getIaConfigAdmin();
      const payload = res.data.data || {};
      const cfg = payload.config || null;

      if (cfg) {
        setConfigId(cfg.id || '');
        setConfig({
          nombre: cfg.nombre || EMPTY_CONFIG.nombre,
          prompt_inicial: cfg.prompt_inicial || '',
          modelo: cfg.modelo || EMPTY_CONFIG.modelo,
          temperature: cfg.temperature?.toString() || EMPTY_CONFIG.temperature,
          max_tokens: cfg.max_tokens?.toString() || EMPTY_CONFIG.max_tokens,
        });
      } else {
        setConfigId('');
        setConfig(EMPTY_CONFIG);
      }

      setParametros(payload.parametros || []);
    } catch {
      setAlert({ type: 'error', message: 'No se pudo cargar la configuración de IA.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadBooks = useCallback(async () => {
    setBooksLoading(true);
    try {
      const res = await listIaKnowledgeBooksAdmin();
      setBooks(res.data.data || []);
    } catch {
      setAlert({ type: 'error', message: 'No se pudo cargar la biblioteca de libros para IA.' });
    } finally {
      setBooksLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const validateConfig = () => {
    const nextErrors = {};
    if (!config.prompt_inicial.trim()) {
      nextErrors.prompt_inicial = 'El prompt inicial es obligatorio.';
    } else if (config.prompt_inicial.trim().length < 20) {
      nextErrors.prompt_inicial = 'El prompt inicial debe tener al menos 20 caracteres.';
    }

    if (config.temperature && Number(config.temperature) < 0) {
      nextErrors.temperature = 'La temperatura debe ser mayor o igual a 0.';
    }

    if (config.max_tokens && Number(config.max_tokens) < 100) {
      nextErrors.max_tokens = 'Max tokens debe ser al menos 100.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSaveConfig = async () => {
    if (!validateConfig()) return;

    setSavingConfig(true);
    try {
      await saveIaConfigAdmin({
        nombre: config.nombre,
        prompt_inicial: config.prompt_inicial,
        modelo: config.modelo || null,
        temperature: config.temperature === '' ? null : Number(config.temperature),
        max_tokens: config.max_tokens === '' ? null : Number(config.max_tokens),
      });

      setAlert({ type: 'success', message: 'Configuración base de IA guardada.' });
      setErrors({});
      await loadData();
    } catch (err) {
      const message = err.response?.data?.message || 'No se pudo guardar la configuración.';
      setAlert({ type: 'error', message });
    } finally {
      setSavingConfig(false);
    }
  };

  const openCreateParam = () => {
    setEditingParam(null);
    setParamForm(EMPTY_PARAM);
    setParamModal(true);
  };

  const openEditParam = (item) => {
    setEditingParam(item);
    setParamForm({
      clave: item.clave || '',
      valor: item.valor || '',
      tipo: item.tipo || 'text',
      descripcion: item.descripcion || '',
      orden: item.orden || 0,
    });
    setParamModal(true);
  };

  const handleSaveParam = async () => {
    if (!paramForm.clave.trim() || !paramForm.valor.toString().trim()) {
      setAlert({ type: 'error', message: 'Clave y valor son obligatorios.' });
      return;
    }

    setSavingParam(true);
    try {
      if (editingParam) {
        await updateIaParametroAdmin(editingParam.id, {
          clave: paramForm.clave.trim(),
          valor: paramForm.valor,
          tipo: paramForm.tipo,
          descripcion: paramForm.descripcion || null,
          orden: Number(paramForm.orden || 0),
        });
        setAlert({ type: 'success', message: 'Parámetro actualizado.' });
      } else {
        await createIaParametroAdmin({
          config_id: configId || null,
          clave: paramForm.clave.trim(),
          valor: paramForm.valor,
          tipo: paramForm.tipo,
          descripcion: paramForm.descripcion || null,
          orden: Number(paramForm.orden || 0),
        });
        setAlert({ type: 'success', message: 'Parámetro creado.' });
      }

      setParamModal(false);
      await loadData();
    } catch (err) {
      const message = err.response?.data?.message || 'No se pudo guardar el parámetro.';
      setAlert({ type: 'error', message });
    } finally {
      setSavingParam(false);
    }
  };

  const handleToggleParametro = async (item) => {
    try {
      await toggleIaParametroAdmin(item.id);
      setAlert({ type: 'success', message: 'Vigencia del parámetro actualizada.' });
      await loadData();
    } catch {
      setAlert({ type: 'error', message: 'No se pudo actualizar la vigencia del parámetro.' });
    }
  };

  const handleUploadBook = async () => {
    setBookActionLoading(true);
    try {
      if (bookUploadMode === 'archivo') {
        if (!bookFile) {
          setAlert({ type: 'error', message: 'Debes seleccionar un archivo para subir.' });
          setBookActionLoading(false);
          return;
        }

        const formData = new FormData();
        formData.append('file', bookFile);
        formData.append('titulo', bookForm.titulo.trim() || bookFile.name.replace(/\.[^.]+$/, ''));
        if (bookForm.autor?.trim()) formData.append('autor', bookForm.autor.trim());
        if (bookForm.fuente?.trim()) formData.append('fuente', bookForm.fuente.trim());
        if (bookForm.materia?.trim()) formData.append('materia', bookForm.materia.trim());
        if (bookForm.nivel?.trim()) formData.append('nivel', bookForm.nivel.trim());
        if (bookForm.tags?.trim()) formData.append('tags', bookForm.tags.trim());

        await createIaKnowledgeBookFromFileAdmin(formData);
      } else {
        if (!bookForm.titulo.trim()) {
          setAlert({ type: 'error', message: 'El título del libro es obligatorio cuando pegas texto.' });
          setBookActionLoading(false);
          return;
        }

        if (!bookForm.contenido.trim()) {
          setAlert({ type: 'error', message: 'Debes pegar contenido cuando usas carga por texto.' });
          setBookActionLoading(false);
          return;
        }

        await createIaKnowledgeBookFromTextAdmin({
          titulo: bookForm.titulo.trim(),
          autor: bookForm.autor?.trim() || null,
          fuente: bookForm.fuente?.trim() || null,
          materia: bookForm.materia?.trim() || null,
          nivel: bookForm.nivel?.trim() || null,
          tags: bookForm.tags?.trim() || '',
          contenido: bookForm.contenido,
        });
      }

      setAlert({ type: 'success', message: 'Libro cargado e indexado para la IA.' });
      setBookForm(EMPTY_BOOK_FORM);
      setBookFile(null);
      setShowOptionalBookFields(false);
      await loadBooks();
    } catch (err) {
      const message = err.response?.data?.message || 'No se pudo cargar el libro.';
      setAlert({ type: 'error', message });
    } finally {
      setBookActionLoading(false);
    }
  };

  const handleToggleBook = async (book) => {
    try {
      await toggleIaKnowledgeBookAdmin(book.id);
      setAlert({ type: 'success', message: 'Vigencia del libro actualizada.' });
      await loadBooks();
    } catch {
      setAlert({ type: 'error', message: 'No se pudo actualizar la vigencia del libro.' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">IA Admin</h1>
          <p className="mt-1 text-sm text-secondary">
            Define el prompt base y parámetros reutilizables para nutrir el motor pedagógico de OpenRouter.
          </p>
        </div>
        <HelpButton
          title="IA Admin"
          description="Permite al rol Admin configurar el prompt inicial del motor PACI y mantener parámetros reutilizables para guiar la generación automática."
          meaning="Es la sala de control del asistente pedagógico: aquí defines cómo piensa y qué criterios aplica por defecto."
        />
      </div>

      {alert.message && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert({ type: '', message: '' })}
        />
      )}

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Configuración Base del Motor</h2>
          <Badge color="primary">OpenRouter</Badge>
        </div>

        {loading ? (
          <p className="text-sm text-secondary">Cargando configuración...</p>
        ) : (
          <>
            <Input
              id="ia_nombre"
              label="Nombre de Perfil"
              value={config.nombre}
              onChange={(e) => setConfig((prev) => ({ ...prev, nombre: e.target.value }))}
              placeholder="Motor PACI v4.0"
            />

            <TextArea
              id="ia_prompt_inicial"
              label="Prompt Inicial *"
              value={config.prompt_inicial}
              onChange={(e) => setConfig((prev) => ({ ...prev, prompt_inicial: e.target.value }))}
              placeholder="Define aquí el prompt rector de la IA..."
              rows={12}
              error={errors.prompt_inicial}
            />

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Input
                id="ia_modelo"
                label="Modelo"
                value={config.modelo}
                onChange={(e) => setConfig((prev) => ({ ...prev, modelo: e.target.value }))}
                placeholder="openai/gpt-4.1-mini"
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveConfig} loading={savingConfig}>
                <Save className="h-4 w-4" /> Guardar Configuración
              </Button>
            </div>
          </>
        )}
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Biblioteca de Libros para IA</h2>
            <p className="text-xs text-secondary">
              Sube material curricular para que el motor use evidencia concreta al sugerir estrategias y actividades.
            </p>
          </div>
          <Badge color="primary">Knowledge Base</Badge>
        </div>

        <div className="flex gap-2">
          <Button
            variant={bookUploadMode === 'archivo' ? 'primary' : 'outline'}
            onClick={() => setBookUploadMode('archivo')}
          >
            <Upload className="h-4 w-4" /> Subir Archivo
          </Button>
          <Button
            variant={bookUploadMode === 'texto' ? 'primary' : 'outline'}
            onClick={() => setBookUploadMode('texto')}
          >
            <FileText className="h-4 w-4" /> Pegar Texto
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input
            id="kb_titulo"
            label={bookUploadMode === 'archivo' ? 'Título del libro (opcional)' : 'Título *'}
            value={bookForm.titulo}
            onChange={(e) => setBookForm((prev) => ({ ...prev, titulo: e.target.value }))}
            placeholder={bookUploadMode === 'archivo' ? 'Se usará el nombre del archivo si lo dejas vacío' : 'Bases curriculares Lenguaje 4° básico'}
          />
        </div>

        <button
          type="button"
          onClick={() => setShowOptionalBookFields((prev) => !prev)}
          className="text-left text-sm font-medium text-primary hover:underline"
        >
          {showOptionalBookFields ? 'Ocultar campos opcionales' : 'Mostrar campos opcionales'}
        </button>

        {showOptionalBookFields && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              id="kb_autor"
              label="Autor"
              value={bookForm.autor || ''}
              onChange={(e) => setBookForm((prev) => ({ ...prev, autor: e.target.value }))}
            />
            <Input
              id="kb_fuente"
              label="Fuente"
              value={bookForm.fuente || ''}
              onChange={(e) => setBookForm((prev) => ({ ...prev, fuente: e.target.value }))}
              placeholder="Mineduc"
            />
            <Input
              id="kb_tags"
              label="Tags (separados por coma)"
              value={bookForm.tags || ''}
              onChange={(e) => setBookForm((prev) => ({ ...prev, tags: e.target.value }))}
              placeholder="lectura, dua, comprensión"
            />
            <Input
              id="kb_materia"
              label="Materia"
              value={bookForm.materia || ''}
              onChange={(e) => setBookForm((prev) => ({ ...prev, materia: e.target.value }))}
              placeholder="Lenguaje"
            />
            <Input
              id="kb_nivel"
              label="Nivel"
              value={bookForm.nivel || ''}
              onChange={(e) => setBookForm((prev) => ({ ...prev, nivel: e.target.value }))}
              placeholder="4° Básico"
            />
          </div>
        )}

        {bookUploadMode === 'archivo' ? (
          <div className="space-y-1.5">
            <label htmlFor="kb_file" className="block text-sm font-medium text-slate-700">
              Archivo
            </label>
            <input
              id="kb_file"
              type="file"
              accept=".pdf,.docx,.txt,.md,.csv,.json,.html,.htm"
              className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900"
              onChange={(e) => setBookFile(e.target.files?.[0] || null)}
            />
            <p className="text-xs text-secondary">Soporta PDF, DOCX, TXT, MD, CSV, JSON y HTML.</p>
          </div>
        ) : (
          <TextArea
            id="kb_texto"
            label="Contenido del Libro *"
            value={bookForm.contenido}
            onChange={(e) => setBookForm((prev) => ({ ...prev, contenido: e.target.value }))}
            rows={8}
            placeholder="Pega aquí el contenido a indexar para la IA..."
          />
        )}

        <div className="flex justify-end">
          <Button onClick={handleUploadBook} loading={bookActionLoading}>
            <Upload className="h-4 w-4" /> Cargar Libro
          </Button>
        </div>

        {booksLoading ? (
          <p className="text-sm text-secondary">Cargando libros indexados...</p>
        ) : books.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-secondary">
            Aún no hay libros cargados. Al subir material, la IA podrá fundamentar mejor las sugerencias.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Título</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Materia</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Nivel</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Chunks</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Estado</th>
                  <th className="px-4 py-2 text-center font-semibold text-slate-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {books.map((book) => (
                  <tr key={book.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-900">
                      <div className="line-clamp-2">{book.titulo}</div>
                    </td>
                    <td className="px-4 py-2 text-slate-600">{book.materia || '-'}</td>
                    <td className="px-4 py-2 text-slate-600">{book.nivel || '-'}</td>
                    <td className="px-4 py-2 text-slate-600">{book.total_chunks ?? 0}</td>
                    <td className="px-4 py-2">
                      <Badge color={book.vigencia ? 'success' : 'secondary'}>
                        {book.vigencia ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleToggleBook(book)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-primary/10 hover:text-primary"
                          title="Activar o desactivar"
                        >
                          <Power className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Parámetros Reutilizables</h2>
            <p className="text-xs text-secondary">
              Estos parámetros se inyectan automáticamente en el contexto de generación.
            </p>
          </div>
          <Button onClick={openCreateParam} disabled={!configId && !config.prompt_inicial.trim()}>
            <Plus className="h-4 w-4" /> Nuevo Parámetro
          </Button>
        </div>

        {parametros.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-secondary">
            No hay parámetros creados. Agrega el primero para nutrir la IA con reglas de trabajo del establecimiento.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Clave</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Valor</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Tipo</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Estado</th>
                  <th className="px-4 py-2 text-center font-semibold text-slate-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parametros.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-900">{item.clave}</td>
                    <td className="px-4 py-2 text-slate-600">
                      <span className="line-clamp-2">{item.valor}</span>
                    </td>
                    <td className="px-4 py-2 text-slate-600">{item.tipo}</td>
                    <td className="px-4 py-2">
                      <Badge color={item.vigencia ? 'success' : 'secondary'}>
                        {item.vigencia ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditParam(item)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-accent/10 hover:text-accent"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleParametro(item)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-primary/10 hover:text-primary"
                          title="Activar o desactivar"
                        >
                          <Power className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={paramModal}
        onClose={() => setParamModal(false)}
        title={editingParam ? 'Editar Parámetro IA' : 'Nuevo Parámetro IA'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              id="param_clave"
              label="Clave *"
              value={paramForm.clave}
              onChange={(e) => setParamForm((prev) => ({ ...prev, clave: e.target.value }))}
              placeholder="ej: tono_docente"
            />
            <div className="space-y-1.5">
              <label htmlFor="param_tipo" className="block text-sm font-medium text-slate-700">
                Tipo
              </label>
              <select
                id="param_tipo"
                className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900"
                value={paramForm.tipo}
                onChange={(e) => setParamForm((prev) => ({ ...prev, tipo: e.target.value }))}
              >
                <option value="text">text</option>
                <option value="number">number</option>
                <option value="boolean">boolean</option>
                <option value="json">json</option>
              </select>
            </div>
          </div>

          <TextArea
            id="param_valor"
            label="Valor *"
            value={paramForm.valor}
            onChange={(e) => setParamForm((prev) => ({ ...prev, valor: e.target.value }))}
            rows={4}
          />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              id="param_descripcion"
              label="Descripción"
              value={paramForm.descripcion}
              onChange={(e) => setParamForm((prev) => ({ ...prev, descripcion: e.target.value }))}
            />
            <Input
              id="param_orden"
              label="Orden"
              type="number"
              min="0"
              value={paramForm.orden}
              onChange={(e) => setParamForm((prev) => ({ ...prev, orden: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setParamModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" loading={savingParam} onClick={handleSaveParam}>
              {editingParam ? 'Guardar cambios' : 'Crear parámetro'}
            </Button>
          </div>
        </div>
      </Modal>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary">
        <div className="flex items-start gap-2">
          <LibraryBig className="mt-0.5 h-4 w-4" />
          <p>
            El motor de OpenRouter ya consume automáticamente esta configuración y la biblioteca de libros para responder
            con sugerencias más alineadas a la planeación curricular del establecimiento.
          </p>
        </div>
      </div>
    </div>
  );
}
