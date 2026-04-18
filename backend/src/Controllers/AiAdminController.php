<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\Response;
use App\Middleware\AuthMiddleware;
use App\Services\AiAdminService;

class AiAdminController
{
    private AiAdminService $service;

    public function __construct()
    {
        $this->service = new AiAdminService();
    }

    /**
     * GET /api/admin/ia/config
     */
    public function getConfig(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        Response::success($this->service->getConfig());
    }

    /**
     * PUT /api/admin/ia/config
     */
    public function saveConfig(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = AuthMiddleware::getUserId();
        Response::success($this->service->saveConfig($data, $userId));
    }

    /**
     * POST /api/admin/ia/parametros
     */
    public function storeParametro(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = AuthMiddleware::getUserId();
        Response::created($this->service->createParametro($data, $userId));
    }

    /**
     * PUT /api/admin/ia/parametros/{id}
     */
    public function updateParametro(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = AuthMiddleware::getUserId();

        $result = $this->service->updateParametro($params['id'], $data, $userId);
        if (!$result) {
            Response::notFound('Parámetro no encontrado');
        }

        Response::success($result);
    }

    /**
     * PATCH /api/admin/ia/parametros/{id}
     */
    public function toggleParametro(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $userId = AuthMiddleware::getUserId();
        $ok = $this->service->toggleParametro($params['id'], $userId);
        if (!$ok) {
            Response::notFound('Parámetro no encontrado');
        }

        Response::success(['message' => 'Vigencia del parámetro actualizada']);
    }
}
