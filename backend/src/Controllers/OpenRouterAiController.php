<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\OpenRouterAiService;
use App\Helpers\Response;

class OpenRouterAiController
{
    private OpenRouterAiService $service;

    public function __construct()
    {
        $this->service = new OpenRouterAiService();
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
}