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

    public function __construct()
    {
        Env::load();

        $this->apiKey   = Env::get('OPENROUTER_API_KEY', '');
        $this->model    = Env::get('OPENROUTER_MODEL', 'openai/gpt-4.1-mini');
        $this->baseUrl  = Env::get('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1');
        $this->referer  = Env::get('OPENROUTER_SITE_URL', '');
        $this->appTitle = Env::get('OPENROUTER_APP_NAME', 'PACI-PVC');
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

        $extraOutputRules = '';
        if ($modo === 'autocompletar_formulario_paci') {
            $extraOutputRules = <<<RULES
    - Debes responder con la clave principal "form_data_sugerida".
    - "form_data_sugerida" debe contener solo campos compatibles con el formulario PACI:
      estudiante_id, asignatura_id, fecha_emision, formato_generado, anio_escolar,
      profesor_jefe, profesor_asignatura, educador_diferencial, aplica_paec,
      paec_activadores, paec_estrategias, paec_desregulacion,
      perfil_dua, trayectoria, horario_apoyo.
    - Si no conoces un valor exacto, deja string vacio en vez de inventar ids.
    RULES;
        }

        $userPrompt = <<<USER
Construye el PACI completo a partir de este contexto.

CONTEXTO ESTRUCTURADO:
{$this->stringifyDocumentContext($data)}

PARAMETROS EDITABLES POR EL DOCENTE:
{$this->stringifyParametros($runtime['parametros'])}

REGLAS DE SALIDA:
- Responde SOLO con JSON valido.
- Debes mapear las 15 secciones del formulario fisico.
- La seccion 10 debe venir en formato tabla con las columnas:
  EJE, OA ORIGINAL, OA ADAPTADO, INDICADORES, HABILIDAD, META, ESTRATEGIAS, ACTIVIDADES, LOGRO.
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

        return $parsed;
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
}