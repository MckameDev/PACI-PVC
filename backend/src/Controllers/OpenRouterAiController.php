<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\OpenRouterAiService;
use App\Services\PaciStructuredDocumentParserService;
use App\Helpers\Response;

class OpenRouterAiController
{
    private OpenRouterAiService $service;
    private PaciStructuredDocumentParserService $documentParser;

    public function __construct()
    {
        $this->service = new OpenRouterAiService();
        $this->documentParser = new PaciStructuredDocumentParserService();
    }

    /**
     * POST /api/ai-openrouter/generar-paci-completo
     * Endpoint de prueba aislado para generar el PACI completo.
     */
    public function generarPaciCompleto(array $params): void
    {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        if (empty($data)) {
            Response::validationError([
                'payload' => 'Se requiere contexto para generar el PACI completo.',
            ]);
        }

        $result = $this->service->generarPaciCompleto($data);
        Response::success($result);
    }

    /**
     * POST /api/ai-openrouter/generar-oa-adaptado
     * Endpoint de prueba aislado para OpenRouter.
     */
    public function generarOaAdaptado(array $params): void
    {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        if (empty($data['texto_oa'])) {
            Response::validationError(['texto_oa' => 'El texto del OA es obligatorio']);
        }

        $result = $this->service->generarOaAdaptado($data);
        Response::success($result);
    }

    /**
     * POST /api/ai-openrouter/autocompletar-paci-desde-documento
     * Recibe un archivo estructurado (PDF/DOCX/TXT/CSV/MD), extrae titulo-valor y genera sugerencia PACI completa.
     */
    public function autocompletarPaciDesdeDocumento(array $params): void
    {
        if (!isset($_FILES['file'])) {
            Response::validationError(['file' => ['Debes enviar el archivo en el campo file']]);
        }

        $parsed = $this->documentParser->parseUploadedDocument($_FILES['file']);

        $payload = [
            'documento_estructurado' => $parsed['pairs'] ?? [],
            'contexto_documental' => $parsed['normalized_context'] ?? [],
            'texto_documento' => $parsed['raw_text'] ?? '',
            'contexto_curricular' => $parsed['normalized_context']['contexto_documental'] ?? '',
            'diagnostico' => $parsed['normalized_context']['diagnostico'] ?? '',
            'fortalezas' => $parsed['normalized_context']['fortalezas'] ?? '',
            'barreras' => $parsed['normalized_context']['barreras'] ?? '',
            'habilidades_base' => $parsed['normalized_context']['habilidades_base'] ?? '',
            'estrategias_dua' => $parsed['normalized_context']['estrategias_dua'] ?? '',
            'asignatura' => $parsed['normalized_context']['asignatura'] ?? '',
            'unidad' => $parsed['normalized_context']['unidad'] ?? '',
            'eje' => $parsed['normalized_context']['eje'] ?? '',
            'texto_oa' => $parsed['normalized_context']['texto_oa'] ?? '',
            'parametros' => [
                'modo' => 'autocompletar_formulario_paci',
                'salida_esperada' => 'form_data_sugerida',
                'origen_documento_estructurado' => true,
                'flexibilizar_por_datos_parciales' => true,
            ],
        ];

        if (!empty($_POST['contexto_json'])) {
            $extra = json_decode((string) $_POST['contexto_json'], true);
            if (is_array($extra)) {
                $payload = array_merge($payload, $extra);
            }
        }

        $result = $this->service->generarPaciCompleto($payload);

        Response::success([
            'analisis_documento' => [
                'archivo' => $parsed['file_name'] ?? '',
                'pares_detectados' => count($parsed['pairs'] ?? []),
                'advertencias' => $parsed['warnings'] ?? [],
            ],
            'resultado_ia' => $result,
            'mensaje' => 'Si deseas una evaluacion mas completa, puedes aportar mas detalle por seccion (diagnostico, barreras, fortalezas, indicadores y habilidades) y volver a generar.',
        ]);
    }
}