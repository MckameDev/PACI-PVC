<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\ProfesorService;
use App\Middleware\AuthMiddleware;
use App\Helpers\Response;

class ProfesorController
{
    private ProfesorService $service;

    public function __construct()
    {
        $this->service = new ProfesorService();
    }

    // GET /api/profesores
    public function index(array $params): void
    {
        $page    = (int) ($_GET['page'] ?? 1);
        $limit   = (int) ($_GET['limit'] ?? 20);
        $filters = array_intersect_key($_GET, array_flip(['establecimiento_id']));
        Response::success($this->service->getAll($filters, $page, $limit));
    }

    // GET /api/profesores/{id}
    public function show(array $params): void
    {
        $result = $this->service->getById($params['id']);
        if (!$result) Response::notFound('Profesor no encontrado');
        Response::success($result);
    }

    // POST /api/profesores
    public function store(array $params): void
    {
        $data   = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = AuthMiddleware::getUserId();
        Response::created($this->service->create($data, $userId));
    }

    // PUT /api/profesores/{id}
    public function update(array $params): void
    {
        $data   = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = AuthMiddleware::getUserId();
        $result = $this->service->update($params['id'], $data, $userId);
        if (!$result) Response::notFound('Profesor no encontrado');
        Response::success($result);
    }

    // PATCH /api/profesores/{id}
    public function toggleVigencia(array $params): void
    {
        $userId  = AuthMiddleware::getUserId();
        $deleted = $this->service->softDelete($params['id'], $userId);
        if (!$deleted) Response::notFound('Profesor no encontrado');
        Response::success(['message' => 'Vigencia actualizada']);
    }
}
