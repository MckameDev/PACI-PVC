<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\EstablecimientoService;
use App\Middleware\AuthMiddleware;
use App\Helpers\Response;

class EstablecimientoController
{
    private EstablecimientoService $service;

    public function __construct()
    {
        $this->service = new EstablecimientoService();
    }

    // GET /api/establecimientos
    public function index(array $params): void
    {
        $page    = (int) ($_GET['page'] ?? 1);
        $limit   = (int) ($_GET['limit'] ?? 20);
        $filters = array_intersect_key($_GET, array_flip(['comuna', 'region']));
        Response::success($this->service->getAll($filters, $page, $limit));
    }

    // GET /api/establecimientos/{id}
    public function show(array $params): void
    {
        $result = $this->service->getById($params['id']);
        if (!$result) Response::notFound('Establecimiento no encontrado');
        Response::success($result);
    }

    // POST /api/establecimientos
    public function store(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $data   = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = AuthMiddleware::getUserId();
        Response::created($this->service->create($data, $userId));
    }

    // PUT /api/establecimientos/{id}
    public function update(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $data   = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = AuthMiddleware::getUserId();
        $result = $this->service->update($params['id'], $data, $userId);
        if (!$result) Response::notFound('Establecimiento no encontrado');
        Response::success($result);
    }

    // PATCH /api/establecimientos/{id}
    public function toggleVigencia(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $userId  = AuthMiddleware::getUserId();
        $deleted = $this->service->softDelete($params['id'], $userId);
        if (!$deleted) Response::notFound('Establecimiento no encontrado');
        Response::success(['message' => 'Vigencia actualizada']);
    }
}
