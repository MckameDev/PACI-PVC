<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\EjeService;
use App\Middleware\AuthMiddleware;
use App\Helpers\Response;

class EjeController
{
    private EjeService $service;

    public function __construct()
    {
        $this->service = new EjeService();
    }

    // GET /api/ejes
    public function index(array $params): void
    {
        $filters = [
            'asignatura_id' => $_GET['asignatura_id'] ?? null,
        ];
        $page  = max(1, (int) ($_GET['page'] ?? 1));
        $limit = min(200, max(1, (int) ($_GET['limit'] ?? 20)));

        $result = $this->service->getAll($filters, $page, $limit);
        Response::success($result);
    }

    // GET /api/ejes/{id}
    public function show(array $params): void
    {
        $item = $this->service->getById($params['id']);
        if (!$item) {
            Response::error('Eje no encontrado', 404);
            return;
        }
        Response::success($item);
    }

    // POST /api/ejes
    public function store(array $params): void
    {
        AuthMiddleware::requireRole('Admin');
        $data   = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = AuthMiddleware::getUserId();
        $item   = $this->service->create($data, $userId);
        Response::success($item, 201);
    }

    // PUT /api/ejes/{id}
    public function update(array $params): void
    {
        AuthMiddleware::requireRole('Admin');
        $data   = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = AuthMiddleware::getUserId();
        $item   = $this->service->update($params['id'], $data, $userId);
        if (!$item) {
            Response::error('Eje no encontrado', 404);
            return;
        }
        Response::success($item);
    }

    // PATCH /api/ejes/{id}
    public function toggleVigencia(array $params): void
    {
        AuthMiddleware::requireRole('Admin');
        $userId = AuthMiddleware::getUserId();
        $ok     = $this->service->softDelete($params['id'], $userId);
        if (!$ok) {
            Response::error('Eje no encontrado', 404);
            return;
        }
        Response::success(['message' => 'Vigencia actualizada']);
    }
}
