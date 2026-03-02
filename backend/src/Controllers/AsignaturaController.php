<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\AsignaturaService;
use App\Middleware\AuthMiddleware;
use App\Helpers\Response;

class AsignaturaController
{
    private AsignaturaService $service;

    public function __construct()
    {
        $this->service = new AsignaturaService();
    }

    // GET /api/asignaturas
    public function index(array $params): void
    {
        $page  = (int) ($_GET['page'] ?? 1);
        $limit = (int) ($_GET['limit'] ?? 20);
        Response::success($this->service->getAll([], $page, $limit));
    }

    // GET /api/asignaturas/{id}
    public function show(array $params): void
    {
        $result = $this->service->getById($params['id']);
        if (!$result) Response::notFound('Asignatura no encontrada');
        Response::success($result);
    }

    // POST /api/asignaturas
    public function store(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $data   = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = AuthMiddleware::getUserId();
        Response::created($this->service->create($data, $userId));
    }

    // PUT /api/asignaturas/{id}
    public function update(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $data   = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = AuthMiddleware::getUserId();
        $result = $this->service->update($params['id'], $data, $userId);
        if (!$result) Response::notFound('Asignatura no encontrada');
        Response::success($result);
    }

    // PATCH /api/asignaturas/{id}
    public function toggleVigencia(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $userId  = AuthMiddleware::getUserId();
        $deleted = $this->service->softDelete($params['id'], $userId);
        if (!$deleted) Response::notFound('Asignatura no encontrada');
        Response::success(['message' => 'Vigencia actualizada']);
    }
}
