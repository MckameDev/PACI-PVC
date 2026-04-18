<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\Database;
use App\Config\Env;
use App\Helpers\Response;
use PDO;
use Throwable;

class OpenRouterAiService
{
    private const DEFAULT_PROMPT = <<<'PROMPT'
MOTOR PEDAGOGICO PACI v4.0 - AULAINCLUSIVA.CL

ROL: Eres el Consultor Pedagogico Senior de AulaInclusiva.cl. Tu mision es co-crear un Plan de Adecuacion Curricular Individual (PACI) alineado con los Decretos 83, 67 y Ley TEA.

REGLAS DE FLUJO (ESTRICTAS):

1. No solicites datos de distintos bloques a la vez.
2. No avances al siguiente paso sin respuesta del docente.
3. Ciclo de interaccion: Organizar dato -> Confirmar -> Solicitar siguiente.

BLOQUE 1: CARACTERIZACION (PASOS 1-7)

Solicitar secuencialmente: 1. Establecimiento, 2. Estudiante (iniciales), 3. Apoderado, 4. Diagnostico/NEE, 5. Perfil, 6. Barreras, 7. Fortalezas.

BLOQUE 2: INTELIGENCIA CURRICULAR (CONEXION BD)

- Solicitar: Asignatura, Unidad y Eje.
- REGLA DE DESFASE: Si el perfil del estudiante muestra un rezago >= 2 niveles respecto a su curso, sugerir obligatoriamente bajar el nivel del OA (Adecuacion Significativa).
- SELECTOR DE OA: Mostrar los OA de la base de datos filtrados por Eje. Si hay mas de 10, usar paginacion ("ver mas").
- SELECTOR DE INDICADORES: Presentar 6 indicadores (2 Iniciales, 2 Intermedios, 2 Avanzados). El docente puede elegir indicadores de forma flexible según la necesidad pedagógica.

BLOQUE 3: DISENO PEDAGOGICO

- Generar OA ADAPTADO: Formula [Verbo + Contenido + Contexto DUA].
- Definir Tipo de Adecuacion: Acceso, No Significativa o Significativa.
- Generar Estrategias DUA y 3 actividades progresivas.

BLOQUE 4: GENERACION DE DOCUMENTO (FORMATO TABLA)

Al finalizar, el output debe ser una estructura organizada que mapee las 15 secciones del formulario fisico.

Especialmente la SECCION 10 (Planificacion), que debe entregarse en formato TABLA con estas columnas:

[EJE | OA ORIGINAL | OA ADAPTADO | INDICADORES (Nivelados) | HABILIDAD | META | ESTRATEGIAS | ACTIVIDADES | NIVEL DE LOGRO].

CIERRE OBLIGATORIO: "Generado por AulaInclusiva.cl | Motor Pedagogico PACI"

EXPORTACION Y SEGURIDAD:

- El documento generado debe incluir un ID unico con formato AI-CL-[ANO]-[ID_USER]-[CORRELATIVO].
- Debe incluir marca de agua con email del usuario, fecha y AulaInclusiva.cl.
- Debe dejar explicitado el cierre obligatorio.
- Si el rezago es >= 2 niveles, la salida debe priorizar la etiqueta de Adecuacion Significativa.

Devuelve solo JSON valido.
PROMPT;

    private string $apiKey;
    private string $model;
    private string $baseUrl;
    private string $referer;
    private string $appTitle;
    private ?AiKnowledgeService $knowledgeService;

    public function __construct()
    {
        Env::load();

        $this->apiKey   = Env::get('OPENROUTER_API_KEY', '');
        $this->model    = Env::get('OPENROUTER_MODEL', 'openai/gpt-4.1-mini');
        $this->baseUrl  = Env::get('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1');
        $this->referer  = Env::get('OPENROUTER_SITE_URL', '');
        $this->appTitle = Env::get('OPENROUTER_APP_NAME', 'PACI-PVC');

        try {
            $this->knowledgeService = new AiKnowledgeService();
        } catch (Throwable $e) {
            $this->knowledgeService = null;
        }
    }

    /**
     * Genera un PACI completo usando OpenRouter y permite ajustar prompt y parametros.
     */
    public function generarPaciCompleto(array $data): array
    {
        if (empty($this->apiKey)) {
            Response::error('API key de OpenRouter no configurada. Defina OPENROUTER_API_KEY en .env', 503);
            return [];
        }

        $runtime = $this->loadRuntimeConfig($data);
        $systemPrompt = $runtime['prompt'];
        $modo = (string) ($runtime['parametros']['modo'] ?? '');
        $knowledgeDigest = $this->resolveKnowledgeDigest();
        $knowledgeContext = $this->resolveKnowledgeContext($data, $runtime);

        $extraOutputRules = '';
                $structuredDocumentMode = ($modo === 'autocompletar_formulario_paci_documento');
                $formAutocompleteMode = in_array($modo, ['autocompletar_formulario_paci', 'autocompletar_formulario_paci_documento'], true);

                if ($formAutocompleteMode) {
            $extraOutputRules = <<<RULES
    - Debes responder con la clave principal "form_data_sugerida".
    - "form_data_sugerida" debe contener solo campos compatibles con el formulario PACI:
      estudiante_id, asignatura_id, fecha_emision, formato_generado, anio_escolar,
      profesor_jefe, profesor_asignatura, educador_diferencial, aplica_paec,
      paec_activadores, paec_estrategias, paec_desregulacion,
      perfil_dua, trayectoria, horario_apoyo.
        - Si el documento trae datos textuales pero no IDs exactos, deja el ID vacio y completa el texto asociado en el campo disponible mas cercano.
        - Prioriza el llenado de campos de identificacion, contexto y perfil antes de profundizar trayectoria.
        - Cada item de trayectoria debe incluir, cuando aplique, "adecuacion_oa" con:
            meta_integradora, estrategias, indicadores_nivelados, adecuaciones,
            actividades_graduales, lectura_complementaria, instrumento_evaluacion,
            justificacion, criterios_evaluacion, observaciones.
        - Si no conoces un valor exacto, deja string vacio en vez de inventar ids o nombres.
    - Incluye una clave adicional "recomendaciones_profundizacion" con sugerencias breves para mejorar la evaluacion del caso con datos mas precisos.
        - Si faltan datos, entrega una propuesta base viable y explicita en "recomendaciones_profundizacion" que informacion adicional mejoraria la personalizacion.
    RULES;
        }

        if ($structuredDocumentMode) {
            $extraOutputRules .= "\n    - En modo documento estructurado, la seccion trayectoria debe incluir minimo 12 filas: 4 para Lectura, 4 para Escritura y 4 para Comunicacion Oral.";
            $extraOutputRules .= "\n    - Si faltan OA exactos, usa descripciones textuales y completa oa_id en vacio en vez de inventar UUID.";
            $extraOutputRules .= "\n    - Para cada fila de trayectoria completa: _eje, oa_id u oa_original, meta_especifica, estrategias_dua, habilidades, seguimiento_registro y adecuacion_oa.criterios_evaluacion.";
        }

        $userPrompt = <<<USER
Construye el PACI completo a partir de este contexto.

CONTEXTO ESTRUCTURADO:
{$this->stringifyDocumentContext($data)}

PARAMETROS EDITABLES POR EL DOCENTE:
{$this->stringifyParametros($runtime['parametros'])}

MEMORIA CURRICULAR GLOBAL (RESUMEN DE LIBROS ACTIVOS):
{$knowledgeDigest}

BASE DE CONOCIMIENTO CURRICULAR (LIBROS Y MATERIAL CARGADO):
{$knowledgeContext}

REGLAS DE SALIDA:
- Responde SOLO con JSON valido.
- Debes mapear las 15 secciones del formulario fisico.
- La seccion 10 debe venir en formato tabla con las columnas:
  EJE, OA ORIGINAL, OA ADAPTADO, INDICADORES, HABILIDAD, META, ESTRATEGIAS, ACTIVIDADES, LOGRO.
    - Debes considerar todos los valores disponibles de cada OA (id, codigo, texto, eje, indicadores, habilidades, nivel de trabajo y tipo de adecuacion) antes de proponer lineamientos, actividades y estrategias.
    - Si el contexto del estudiante está incompleto, genera una planificacion base flexible y agrega recomendaciones concretas para profundizar la evaluacion con mas detalle.
- Si detectas rezago >= 2 niveles, la adecuacion sugerida debe ser Significativa.
- Incluye el cierre obligatorio exactamente como texto final en el campo correspondiente.
- Incluye un identificador unico del documento.
{$extraOutputRules}
USER;

    return $this->executeRequest($systemPrompt, $userPrompt, $runtime);
    }

    /**
     * Genera un OA adaptado usando OpenRouter y permite ajustar prompt y parametros.
     */
    public function generarOaAdaptado(array $data): array
    {
        if (empty($this->apiKey)) {
            Response::error('API key de OpenRouter no configurada. Defina OPENROUTER_API_KEY en .env', 503);
            return [];
        }

        $runtime = $this->loadRuntimeConfig($data);
        $systemPrompt = $runtime['prompt'];

        $textoOa         = $data['texto_oa'] ?? '';
        $tipoAdecuacion  = $data['tipo_adecuacion'] ?? 'Acceso';
        $nivelOriginal   = $data['nivel_original'] ?? '';
        $nivelTrabajo    = $data['nivel_trabajo'] ?? '';
        $diagnostico     = $data['diagnostico'] ?? '';
        $fortalezas      = $data['fortalezas'] ?? '';
        $barreras        = $data['barreras'] ?? '';
        $estrategiasDua  = $data['estrategias_dua'] ?? '';
        $habilidadesBase = $data['habilidades_base'] ?? '';
        $parametrosContexto = $this->stringifyParametros($runtime['parametros']);
        $knowledgeDigest = $this->resolveKnowledgeDigest();
        $knowledgeContext = $this->resolveKnowledgeContext($data, $runtime);
        

        $userPrompt = <<<USER
**OA Original:** {$textoOa}
**Nivel original:** {$nivelOriginal}
**Nivel de trabajo:** {$nivelTrabajo}
**Tipo de adecuacion:** {$tipoAdecuacion}
**Diagnostico:** {$diagnostico}
**Fortalezas del estudiante:** {$fortalezas}
**Barreras identificadas:** {$barreras}
**Estrategias DUA sugeridas:** {$estrategiasDua}
**Habilidades base:** {$habilidadesBase}

**Parametros de personalizacion para esta generacion:**
{$parametrosContexto}

**Memoria curricular global (libros activos):**
{$knowledgeDigest}

**Base de conocimiento curricular (libros cargados):**
{$knowledgeContext}

Considera todos los valores disponibles del OA y su planificación (id, codigo, texto, eje, indicadores, habilidades, nivel de trabajo, barreras, fortalezas y tipo de adecuacion) para personalizar la respuesta.
Si los datos vienen incompletos, devuelve una propuesta base junto a recomendaciones puntuales para completar la evaluacion del estudiante y mejorar la precision.

Genera la adaptacion del OA en formato JSON.
USER;

    return $this->executeRequest($systemPrompt, $userPrompt, $runtime);
    }

    private function executeRequest(string $systemPrompt, string $userPrompt, array $runtime): array
    {
        $payload = [
            'model' => $runtime['model'],
            'messages' => [
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user', 'content' => $userPrompt],
            ],
            'temperature' => $runtime['temperature'],
            'max_tokens' => $runtime['max_tokens'],
            'response_format' => ['type' => 'json_object'],
        ];

        $headers = [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $this->apiKey,
        ];

        if (!empty($this->referer)) {
            $headers[] = 'HTTP-Referer: ' . $this->referer;
        }

        if (!empty($this->appTitle)) {
            $headers[] = 'X-Title: ' . $this->appTitle;
        }

        $ch = curl_init(rtrim($this->baseUrl, '/') . '/chat/completions');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_TIMEOUT => 60,
            CURLOPT_CONNECTTIMEOUT => 10,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($response === false) {
            Response::error('Error de conexion con OpenRouter: ' . $curlError, 502);
            return [];
        }

        if ($httpCode !== 200) {
            $errorBody = json_decode($response, true);
            $errorMsg = $errorBody['error']['message'] ?? 'Error desconocido de OpenRouter';
            Response::error('Error de OpenRouter: ' . $errorMsg, $httpCode >= 400 ? $httpCode : 502);
            return [];
        }

        $result = json_decode($response, true);
        $content = $result['choices'][0]['message']['content'] ?? '';

        $parsed = json_decode($content, true);
        if ($parsed === null) {
            return [
                'raw_content' => $content,
            ];
        }

        $contractErrors = $this->validateGeneratedOutputContract($parsed, $runtime);
        if (!empty($contractErrors)) {
            return [
                'validation_error' => 'La salida IA no cumple el contrato pedagógico esperado.',
                'validation_errors' => $contractErrors,
                'raw_content' => $parsed,
            ];
        }

        return $parsed;
    }

    private function validateGeneratedOutputContract(array $parsed, array $runtime): array
    {
        $errors = [];
        $modo = strtolower((string) ($runtime['parametros']['modo'] ?? ''));
        $structuredDocumentMode = in_array($modo, ['autocompletar_formulario_paci_documento'], true);

        if (!$this->containsMandatoryClosure($parsed)) {
            $errors[] = 'Falta el cierre obligatorio: "Generado por AulaInclusiva.cl | Motor Pedagogico PACI".';
        }

        if ($structuredDocumentMode) {
            $sugerida = $parsed['form_data_sugerida'] ?? null;
            if (!is_array($sugerida)) {
                $errors[] = 'No se encontró la estructura "form_data_sugerida".';
            }

            return $errors;
        }

        if ($modo === 'autocompletar_formulario_paci') {
            $sugerida = $parsed['form_data_sugerida'] ?? null;
            if (!is_array($sugerida)) {
                $errors[] = 'No se encontró la estructura "form_data_sugerida".';
                return $errors;
            }

            $trayectoria = $sugerida['trayectoria'] ?? null;
            if (!is_array($trayectoria)) {
                $errors[] = 'La sección 10 no contiene trayectoria en formato de tabla estructurada.';
                return $errors;
            }

            if (count($trayectoria) < 12) {
                $errors[] = 'La sección 10 requiere al menos 12 filas por unidad (4 por cada eje clave).';
            }

            $counts = [
                'lectura' => 0,
                'escritura' => 0,
                'comunicacion_oral' => 0,
            ];

            $requiredColumns = [
                'EJE' => [],
                'OA ORIGINAL' => [],
                'OA ADAPTADO' => [],
                'INDICADORES' => [],
                'HABILIDAD' => [],
                'META' => [],
                'ESTRATEGIAS' => [],
                'ACTIVIDADES' => [],
                'LOGRO' => [],
            ];

            foreach ($trayectoria as $index => $item) {
                if (!is_array($item)) {
                    $rowLabel = '#' . ($index + 1);
                    foreach ($requiredColumns as $col => $missingRows) {
                        $requiredColumns[$col][] = $rowLabel;
                    }
                    continue;
                }

                $rowLabel = '#' . ($index + 1);

                $eje = (string) (
                    $item['_eje']
                    ?? $item['eje']
                    ?? ($item['adecuacion_oa']['eje'] ?? '')
                );
                $ejeNorm = $this->normalizeForValidation($eje);

                if ($this->containsText($ejeNorm, 'lectura')) {
                    $counts['lectura'] += 1;
                }
                if ($this->containsText($ejeNorm, 'escritura')) {
                    $counts['escritura'] += 1;
                }
                if ($this->containsText($ejeNorm, 'comunicacion') && $this->containsText($ejeNorm, 'oral')) {
                    $counts['comunicacion_oral'] += 1;
                }

                if (!$this->hasMeaningfulValue($eje)) {
                    $requiredColumns['EJE'][] = $rowLabel;
                }

                $oaOriginal = $item['oa_id'] ?? $item['oa_original'] ?? $item['codigo_oa'] ?? $item['id_oa'] ?? '';
                if (!$this->hasMeaningfulValue($oaOriginal)) {
                    $requiredColumns['OA ORIGINAL'][] = $rowLabel;
                }

                $oaAdaptado = $item['adecuacion_oa']['meta_integradora'] ?? $item['oa_adaptado'] ?? '';
                if (!$this->hasMeaningfulValue($oaAdaptado)) {
                    $requiredColumns['OA ADAPTADO'][] = $rowLabel;
                }

                $indicadoresRaw = $item['adecuacion_oa']['indicadores_nivelados']
                    ?? (is_array($item['indicadores_seleccionados'] ?? null) ? implode(',', $item['indicadores_seleccionados']) : '')
                    ?? '';
                if (!$this->hasMeaningfulValue($indicadoresRaw)) {
                    $requiredColumns['INDICADORES'][] = $rowLabel;
                }

                $habilidad = $item['habilidades'] ?? $item['habilidad'] ?? '';
                if (!$this->hasMeaningfulValue($habilidad)) {
                    $requiredColumns['HABILIDAD'][] = $rowLabel;
                }

                $meta = $item['meta_especifica'] ?? $item['adecuacion_oa']['meta_integradora'] ?? '';
                if (!$this->hasMeaningfulValue($meta)) {
                    $requiredColumns['META'][] = $rowLabel;
                }

                $estrategias = $item['estrategias_dua'] ?? $item['adecuacion_oa']['estrategias'] ?? '';
                if (!$this->hasMeaningfulValue($estrategias)) {
                    $requiredColumns['ESTRATEGIAS'][] = $rowLabel;
                }

                $actividades = $item['adecuacion_oa']['actividades_graduales'] ?? $item['actividades'] ?? '';
                if (!$this->hasMeaningfulValue($actividades)) {
                    $requiredColumns['ACTIVIDADES'][] = $rowLabel;
                }

                $logro = $item['eval_criterio'] ?? $item['adecuacion_oa']['criterios_evaluacion'] ?? $item['nivel_logro'] ?? '';
                if (!$this->hasMeaningfulValue($logro)) {
                    $requiredColumns['LOGRO'][] = $rowLabel;
                }
            }

            if ($counts['lectura'] < 4) {
                $errors[] = 'Sección 10 incompleta: faltan filas de eje Lectura (mínimo 4).';
            }
            if ($counts['escritura'] < 4) {
                $errors[] = 'Sección 10 incompleta: faltan filas de eje Escritura (mínimo 4).';
            }
            if ($counts['comunicacion_oral'] < 4) {
                $errors[] = 'Sección 10 incompleta: faltan filas de eje Comunicación Oral (mínimo 4).';
            }

            foreach ($requiredColumns as $columnName => $missingRows) {
                if (empty($missingRows)) {
                    continue;
                }

                $sample = implode(', ', array_slice($missingRows, 0, 3));
                $extra = count($missingRows) > 3 ? ' ...' : '';
                $errors[] = 'Sección 10 incompleta: la columna ' . $columnName . ' está vacía en filas ' . $sample . $extra . '.';
            }
        }

        return $errors;
    }

    private function containsMandatoryClosure(array $parsed): bool
    {
        $dump = json_encode($parsed, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($dump === false) {
            return false;
        }

        $normalizedDump = $this->normalizeForValidation($dump);
        $expected = $this->normalizeForValidation('Generado por AulaInclusiva.cl | Motor Pedagogico PACI');

        return $this->containsText($normalizedDump, $expected);
    }

    private function normalizeForValidation(string $value): string
    {
        $text = strtolower($value);
        $text = str_replace(
            ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ'],
            ['a', 'e', 'i', 'o', 'u', 'u', 'n'],
            $text
        );

        return trim($text);
    }

    private function hasMeaningfulValue($value): bool
    {
        if (is_array($value)) {
            return !empty($value);
        }

        if (is_bool($value)) {
            return true;
        }

        if ($value === null) {
            return false;
        }

        return trim((string) $value) !== '';
    }

    private function containsText(string $haystack, string $needle): bool
    {
        return strpos($haystack, $needle) !== false;
    }

    private function loadRuntimeConfig(array $data): array
    {
        $persisted = $this->getPersistedConfig();
        $persistedParams = [];

        if (!empty($persisted['id'])) {
            $persistedParams = $this->getPersistedParams((string) $persisted['id']);
        }

        $requestPrompt = trim((string) ($data['prompt_inicial'] ?? ''));
        $prompt = $requestPrompt !== ''
            ? $requestPrompt
            : (trim((string) ($persisted['prompt_inicial'] ?? '')) !== '' ? (string) $persisted['prompt_inicial'] : self::DEFAULT_PROMPT);

        $runtimeModel = trim((string) ($data['modelo'] ?? ''));
        if ($runtimeModel === '') {
            $runtimeModel = trim((string) ($persisted['modelo'] ?? ''));
        }
        if ($runtimeModel === '') {
            $runtimeModel = $this->model;
        }

        $runtimeTemperature = $this->toFloat($data['temperature'] ?? ($persisted['temperature'] ?? 0.7));
        $runtimeMaxTokens = $this->toInt($data['max_tokens'] ?? ($persisted['max_tokens'] ?? 1500));

        $parametrosRequest = is_array($data['parametros'] ?? null) ? $data['parametros'] : [];
        $parametros = array_merge($persistedParams, $parametrosRequest);

        return [
            'prompt' => $prompt,
            'model' => $runtimeModel,
            'temperature' => $runtimeTemperature,
            'max_tokens' => $runtimeMaxTokens,
            'parametros' => $parametros,
        ];
    }

    private function getPersistedConfig(): array
    {
        try {
            $db = Database::getInstance();
            $stmt = $db->prepare(
                'SELECT id, prompt_inicial, modelo, temperature, max_tokens
                 FROM ai_admin_configs
                 WHERE vigencia = 1
                 ORDER BY updated_at DESC
                 LIMIT 1'
            );
            $stmt->execute();
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            return $row ?: [];
        } catch (Throwable $e) {
            return [];
        }
    }

    private function getPersistedParams(string $configId): array
    {
        try {
            $db = Database::getInstance();
            $stmt = $db->prepare(
                'SELECT clave, valor, tipo
                 FROM ai_admin_parametros
                 WHERE config_id = :config_id AND vigencia = 1
                 ORDER BY orden ASC, created_at ASC'
            );
            $stmt->execute([':config_id' => $configId]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $map = [];
            foreach ($rows as $row) {
                $key = trim((string) ($row['clave'] ?? ''));
                if ($key === '') {
                    continue;
                }

                $type = (string) ($row['tipo'] ?? 'text');
                $value = $this->castParamValue((string) ($row['valor'] ?? ''), $type);
                $map[$key] = $value;
            }

            return $map;
        } catch (Throwable $e) {
            return [];
        }
    }

    private function castParamValue(string $value, string $type): mixed
    {
        return match ($type) {
            'number' => is_numeric($value) ? (float) $value : $value,
            'boolean' => in_array(strtolower($value), ['1', 'true', 'si', 'sí', 'yes'], true),
            'json' => json_decode($value, true) ?? $value,
            default => $value,
        };
    }

    private function stringifyParametros(mixed $parametros): string
    {
        if (!is_array($parametros) || empty($parametros)) {
            return '- Sin parametros adicionales.';
        }

        $lines = [];
        foreach ($parametros as $key => $value) {
            if (is_array($value)) {
                $value = implode(', ', array_map(static fn($v) => (string) $v, $value));
            } elseif (is_bool($value)) {
                $value = $value ? 'true' : 'false';
            } else {
                $value = (string) $value;
            }

            $label = is_string($key) ? $key : ('parametro_' . $key);
            $lines[] = '- ' . $label . ': ' . $value;
        }

        return implode("\n", $lines);
    }

    private function stringifyDocumentContext(array $data): string
    {
        $excludedKeys = [
            'prompt_inicial',
            'parametros',
            'temperature',
            'max_tokens',
        ];

        $filtered = array_diff_key($data, array_flip($excludedKeys));

        if (empty($filtered)) {
            return '- Sin contexto adicional entregado.';
        }

        $lines = [];
        foreach ($filtered as $key => $value) {
            $label = is_string($key) ? $key : ('campo_' . $key);

            if (is_array($value)) {
                $value = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            } elseif (is_bool($value)) {
                $value = $value ? 'true' : 'false';
            } else {
                $value = (string) $value;
            }

            $lines[] = '- ' . $label . ': ' . $value;
        }

        return implode("\n", $lines);
    }

    private function toFloat($value): float
    {
        if (is_numeric($value)) {
            return (float) $value;
        }

        return 0.7;
    }

    private function toInt($value): int
    {
        if (is_numeric($value)) {
            return (int) $value;
        }

        return 1500;
    }

    private function resolveKnowledgeContext(array $data, array $runtime): string
    {
        if ($this->knowledgeService === null) {
            return '- Base de conocimiento no disponible.';
        }

        $usarConocimiento = $runtime['parametros']['usar_conocimiento_libros'] ?? true;
        if ($usarConocimiento === false || $usarConocimiento === 'false' || $usarConocimiento === '0') {
            return '- Desactivada por parametro usar_conocimiento_libros.';
        }

        $query = $this->buildKnowledgeQuery($data);
        if ($query === '') {
            return '- Sin contexto suficiente para buscar en libros.';
        }

        $filters = [
            'materia' => $data['materia'] ?? $data['asignatura'] ?? null,
            'nivel' => $data['nivel_trabajo'] ?? $data['curso'] ?? null,
        ];

        try {
            $context = $this->knowledgeService->buildContextForPrompt($query, $filters, 4200, 6);
            if ($context === '') {
                return '- No se encontraron fragmentos relevantes en los libros cargados.';
            }

            return $context;
        } catch (Throwable $e) {
            return '- Error al consultar base de conocimiento: ' . $e->getMessage();
        }
    }

    private function resolveKnowledgeDigest(): string
    {
        if ($this->knowledgeService === null) {
            return '- Base de conocimiento no disponible.';
        }

        try {
            return $this->knowledgeService->buildKnowledgeDigest(12);
        } catch (Throwable $e) {
            return '- Error al construir memoria curricular: ' . $e->getMessage();
        }
    }

    private function buildKnowledgeQuery(array $data): string
    {
        $keys = [
            'texto_oa',
            'oa_original',
            'oa_id',
            'codigo_oa',
            'id_oa',
            'asignatura',
            'materia',
            'unidad',
            'eje',
            'tipo_oa',
            'tipo_adecuacion',
            'nivel_original',
            'nivel_trabajo',
            'indicadores_nivelados',
            'indicadores_seleccionados',
            'habilidades_base',
            'habilidades',
            'meta_especifica',
            'observaciones',
            'diagnostico',
            'barreras',
            'fortalezas',
            'estrategias_dua',
            'contexto_curricular',
            'necesidades_estudiante',
            'trayectoria',
        ];

        $parts = [];
        foreach ($keys as $key) {
            $value = $data[$key] ?? null;
            if ($value === null) {
                continue;
            }

            if (is_array($value)) {
                $value = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }

            $text = trim((string) $value);
            if ($text !== '') {
                $parts[] = $text;
            }
        }

        if (empty($parts)) {
            return '';
        }

        $query = implode(' | ', $parts);
        $trayectoriaSignals = $this->extractTrayectoriaSignals($data['trayectoria'] ?? null);
        if ($trayectoriaSignals !== '') {
            $query .= ' | ' . $trayectoriaSignals;
        }

        return $query;
    }

    private function extractTrayectoriaSignals(mixed $trayectoria): string
    {
        if (!is_array($trayectoria) || empty($trayectoria)) {
            return '';
        }

        $rows = [];
        foreach ($trayectoria as $item) {
            if (!is_array($item)) {
                continue;
            }

            $values = [];
            $fields = [
                'oa_id',
                'id_oa',
                'codigo_oa',
                'oa_original',
                'oa_texto',
                'texto_oa',
                '_eje',
                'eje',
                'tipo_adecuacion',
                'nivel_trabajo_id',
                'nivel_logro',
                'habilidades',
                'habilidad',
                'meta_especifica',
                'estrategias_dua',
                'observaciones',
            ];

            foreach ($fields as $field) {
                $value = $item[$field] ?? null;
                if ($value === null) {
                    continue;
                }

                if (is_array($value)) {
                    $value = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                }

                $text = trim((string) $value);
                if ($text !== '') {
                    $values[] = $text;
                }
            }

            if (isset($item['indicadores_seleccionados']) && is_array($item['indicadores_seleccionados'])) {
                $indicatorIds = array_filter(array_map(static fn($v) => trim((string) $v), $item['indicadores_seleccionados']));
                if (!empty($indicatorIds)) {
                    $values[] = 'indicadores:' . implode(',', $indicatorIds);
                }
            }

            if (isset($item['adecuacion_oa']) && is_array($item['adecuacion_oa'])) {
                $aoa = $item['adecuacion_oa'];
                $aoaFields = [
                    'meta_integradora',
                    'estrategias',
                    'indicadores_nivelados',
                    'adecuaciones',
                    'actividades_graduales',
                    'criterios_evaluacion',
                    'observaciones',
                ];

                foreach ($aoaFields as $field) {
                    $value = $aoa[$field] ?? null;
                    if ($value === null) {
                        continue;
                    }

                    if (is_array($value)) {
                        $value = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                    }

                    $text = trim((string) $value);
                    if ($text !== '') {
                        $values[] = $text;
                    }
                }
            }

            if (!empty($values)) {
                $rows[] = implode(' ; ', array_values(array_unique($values)));
            }
        }

        if (empty($rows)) {
            return '';
        }

        return implode(' | ', $rows);
    }
}