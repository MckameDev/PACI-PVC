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
            'plantilla_formulario' => [
                'estudiante_id' => '',
                'asignatura_id' => '',
                'fecha_emision' => date('Y-m-d'),
                'formato_generado' => 'Completo',
                'anio_escolar' => date('Y'),
                'profesor_jefe' => '',
                'profesor_asignatura' => '',
                'educador_diferencial' => '',
                'aplica_paec' => 0,
                'paec_activadores' => '',
                'paec_estrategias' => '',
                'paec_desregulacion' => '',
                'perfil_dua' => [
                    'fortalezas' => '',
                    'barreras' => '',
                    'barreras_personalizadas' => '',
                    'acceso_curricular' => '',
                    'preferencias_representacion' => '',
                    'preferencias_expresion' => '',
                    'preferencias_motivacion' => '',
                    'habilidades_base' => '',
                ],
                'trayectoria' => [],
                'horario_apoyo' => [],
            ],
            'contexto_curricular' => $parsed['normalized_context']['contexto_documental'] ?? '',
            'diagnostico' => $parsed['normalized_context']['diagnostico'] ?? '',
            'tipo_nee' => $parsed['normalized_context']['tipo_nee'] ?? '',
            'comorbilidad' => $parsed['normalized_context']['comorbilidad'] ?? '',
            'curso' => $parsed['normalized_context']['curso'] ?? '',
            'fortalezas' => $parsed['normalized_context']['fortalezas'] ?? '',
            'barreras' => $parsed['normalized_context']['barreras'] ?? '',
            'habilidades_base' => $parsed['normalized_context']['habilidades_base'] ?? '',
            'estrategias_dua' => $parsed['normalized_context']['estrategias_dua'] ?? '',
            'estrategias_oa' => $parsed['normalized_context']['estrategias_oa'] ?? '',
            'asignatura' => $parsed['normalized_context']['asignatura'] ?? '',
            'unidad' => $parsed['normalized_context']['unidad'] ?? '',
            'eje' => $parsed['normalized_context']['eje'] ?? '',
            'nivel_trabajo' => $parsed['normalized_context']['nivel_trabajo'] ?? '',
            'meta_integradora' => $parsed['normalized_context']['meta_integradora'] ?? '',
            'seguimiento' => $parsed['normalized_context']['seguimiento'] ?? '',
            'profesor_jefe' => $parsed['normalized_context']['profesor_jefe'] ?? '',
            'profesor_asignatura' => $parsed['normalized_context']['profesor_asignatura'] ?? '',
            'educador_diferencial' => $parsed['normalized_context']['educador_diferencial'] ?? '',
            'paec_activadores' => $parsed['normalized_context']['paec_activadores'] ?? '',
            'paec_estrategias' => $parsed['normalized_context']['paec_estrategias'] ?? '',
            'paec_desregulacion' => $parsed['normalized_context']['paec_desregulacion'] ?? '',
            'texto_oa' => $parsed['normalized_context']['texto_oa'] ?? '',
            'parametros' => [
                'modo' => 'autocompletar_formulario_paci_documento',
                'salida_esperada' => 'form_data_sugerida',
                'origen_documento_estructurado' => true,
                'flexibilizar_por_datos_parciales' => true,
                'usar_conocimiento_libros' => false,
                'seccion_10_min_filas_por_eje' => 4,
                'seccion_10_ejes_obligatorios' => ['Lectura', 'Escritura', 'Comunicacion Oral'],
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