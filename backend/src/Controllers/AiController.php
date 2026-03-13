<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\AiService;
use App\Middleware\AuthMiddleware;
use App\Helpers\Response;

class AiController
{
    private AiService $service;

    public function __construct()
    {
        $this->service = new AiService();
    }

    /**
     * POST /api/ai/generar-oa-adaptado
     * Genera un OA adaptado usando IA a partir del contexto del estudiante.
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
