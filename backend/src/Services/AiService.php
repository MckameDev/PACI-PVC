<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\Env;
use App\Helpers\Response;

class AiService
{
    private string $apiKey;
    private string $model;
    private string $baseUrl;

    public function __construct()
    {
        Env::load();
        $this->apiKey  = Env::get('OPENAI_API_KEY', '');
        $this->model   = Env::get('OPENAI_MODEL', 'gpt-4o-mini');
        $this->baseUrl = Env::get('OPENAI_BASE_URL', 'https://api.openai.com/v1');
    }

    /**
     * Genera un OA adaptado a partir del OA original y el contexto del estudiante.
     */
    public function generarOaAdaptado(array $data): array
    {
        if (empty($this->apiKey)) {
            Response::error('API key de IA no configurada. Defina OPENAI_API_KEY en .env', 503);
            return [];
        }

        $textoOa           = $data['texto_oa'] ?? '';
        $tipoAdecuacion    = $data['tipo_adecuacion'] ?? 'Acceso';
        $nivelOriginal     = $data['nivel_original'] ?? '';
        $nivelTrabajo      = $data['nivel_trabajo'] ?? '';
        $diagnostico       = $data['diagnostico'] ?? '';
        $fortalezas        = $data['fortalezas'] ?? '';
        $barreras          = $data['barreras'] ?? '';
        $estrategiasDua    = $data['estrategias_dua'] ?? '';
        $habilidadesBase   = $data['habilidades_base'] ?? '';

        $systemPrompt = <<<PROMPT
Eres un especialista en educación inclusiva chilena, experto en el Decreto 83/2015 y el enfoque DUA (Diseño Universal para el Aprendizaje).
Tu tarea es adaptar Objetivos de Aprendizaje (OA) del currículum nacional chileno según las necesidades educativas del estudiante.

Reglas:
1. Mantén la estructura curricular del OA original.
2. Si la adecuación es de "Acceso", modifica la forma de acceder al contenido sin cambiar el nivel de exigencia.
3. Si la adecuación es "Significativa", puedes reducir la complejidad o profundidad del OA.
4. Considera las fortalezas del estudiante como punto de partida.
5. Las barreras deben ser mitigadas con las estrategias DUA proporcionadas.
6. Responde SOLO con un JSON válido con las siguientes claves:
   - "meta_integradora": string (el OA adaptado completo)
   - "estrategias": string (estrategias DUA específicas para este OA)
   - "adecuaciones": string (descripción de las adecuaciones realizadas)
   - "criterios_evaluacion": string (criterios de evaluación adaptados)
PROMPT;

        $userPrompt = <<<USER
**OA Original:** {$textoOa}
**Nivel original:** {$nivelOriginal}
**Nivel de trabajo:** {$nivelTrabajo}
**Tipo de adecuación:** {$tipoAdecuacion}
**Diagnóstico:** {$diagnostico}
**Fortalezas del estudiante:** {$fortalezas}
**Barreras identificadas:** {$barreras}
**Estrategias DUA sugeridas:** {$estrategiasDua}
**Habilidades base:** {$habilidadesBase}

Genera la adaptación del OA en formato JSON.
USER;

        $payload = [
            'model'    => $this->model,
            'messages' => [
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user',   'content' => $userPrompt],
            ],
            'temperature'   => 0.7,
            'max_tokens'    => 1500,
            'response_format' => ['type' => 'json_object'],
        ];

        $ch = curl_init($this->baseUrl . '/chat/completions');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $this->apiKey,
            ],
            CURLOPT_POSTFIELDS     => json_encode($payload),
            CURLOPT_TIMEOUT        => 60,
            CURLOPT_CONNECTTIMEOUT => 10,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($response === false) {
            Response::error('Error de conexión con servicio de IA: ' . $curlError, 502);
            return [];
        }

        if ($httpCode !== 200) {
            $errorBody = json_decode($response, true);
            $errorMsg = $errorBody['error']['message'] ?? 'Error desconocido del servicio de IA';
            Response::error('Error del servicio de IA: ' . $errorMsg, $httpCode >= 400 ? $httpCode : 502);
            return [];
        }

        $result = json_decode($response, true);
        $content = $result['choices'][0]['message']['content'] ?? '';

        $parsed = json_decode($content, true);
        if (!$parsed) {
            return [
                'meta_integradora'    => $content,
                'estrategias'         => '',
                'adecuaciones'        => '',
                'criterios_evaluacion'=> '',
            ];
        }

        return [
            'meta_integradora'    => $parsed['meta_integradora'] ?? '',
            'estrategias'         => $parsed['estrategias'] ?? '',
            'adecuaciones'        => $parsed['adecuaciones'] ?? '',
            'criterios_evaluacion'=> $parsed['criterios_evaluacion'] ?? '',
        ];
    }
}
