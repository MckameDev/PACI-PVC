<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\PaciBorradorService;
use App\Middleware\AuthMiddleware;
use App\Helpers\Response;

class PaciBorradorController
{
    private PaciBorradorService $service;

    public function __construct()
    {
        $this->service = new PaciBorradorService();
    }

    // GET /api/paci-borrador — Devuelve el borrador del usuario autenticado
    public function show(array $params): void
    {
        $userId = AuthMiddleware::getUserId();
        $result = $this->service->getByUsuario($userId);

        if (!$result) {
            Response::notFound('No hay borrador guardado');
            return;
        }

        Response::success($result);
    }

    // PUT /api/paci-borrador — Crea o actualiza el borrador
    public function upsert(array $params): void
    {
        $data   = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = AuthMiddleware::getUserId();
        $result = $this->service->upsert($data, $userId);
        Response::success($result);
    }

    // PATCH /api/paci-borrador — Elimina el borrador
    public function destroy(array $params): void
    {
        $userId = AuthMiddleware::getUserId();
        $this->service->delete($userId);
        Response::success(['message' => 'Borrador eliminado']);
    }
}
