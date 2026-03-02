<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\UserService;
use App\Middleware\AuthMiddleware;
use App\Helpers\Response;

class UserController
{
    private UserService $service;

    public function __construct()
    {
        $this->service = new UserService();
    }

    // GET /api/users - Lista usuarios con paginacion y filtros
    public function index(array $params): void
    {
        $page    = (int) ($_GET['page'] ?? 1);
        $limit   = (int) ($_GET['limit'] ?? 20);
        $filters = array_intersect_key($_GET, array_flip(['rol']));

        $result = $this->service->getAll($filters, $page, $limit);
        Response::success($result);
    }

    // GET /api/users/{id} - Detalle de usuario
    public function show(array $params): void
    {
        $user = $this->service->getById($params['id']);
        if (!$user) {
            Response::notFound('Usuario no encontrado');
        }
        Response::success($user);
    }

    // POST /api/users - Crea un usuario
    public function store(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $data   = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = AuthMiddleware::getUserId();
        $result = $this->service->create($data, $userId);
        Response::created($result);
    }

    // PUT /api/users/{id} - Actualiza un usuario
    public function update(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $data   = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = AuthMiddleware::getUserId();
        $result = $this->service->update($params['id'], $data, $userId);

        if (!$result) {
            Response::notFound('Usuario no encontrado');
        }
        Response::success($result);
    }

    // PATCH /api/users/{id} - Soft delete de usuario
    public function toggleVigencia(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $userId  = AuthMiddleware::getUserId();
        $deleted = $this->service->softDelete($params['id'], $userId);

        if (!$deleted) {
            Response::notFound('Usuario no encontrado');
        }
        Response::success(['message' => 'Vigencia actualizada']);
    }
}
