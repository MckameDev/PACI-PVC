<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\IndicadorService;
use App\Middleware\AuthMiddleware;
use App\Helpers\Response;

class IndicadorController
{
    private IndicadorService $service;

    public function __construct()
    {
        $this->service = new IndicadorService();
    }

    // GET /api/indicadores
    public function index(array $params): void
    {
        $page    = (int) ($_GET['page'] ?? 1);
        $limit   = (int) ($_GET['limit'] ?? 50);
        $filters = array_intersect_key($_GET, array_flip(['oa_id']));
        Response::success($this->service->getAll($filters, $page, $limit));
    }

    // GET /api/indicadores/{id}
    public function show(array $params): void
    {
        $result = $this->service->getById($params['id']);
        if (!$result) Response::notFound('Indicador no encontrado');
        Response::success($result);
    }

    // POST /api/indicadores
    public function store(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $data   = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = AuthMiddleware::getUserId();
        Response::created($this->service->create($data, $userId));
    }

    // PUT /api/indicadores/{id}
    public function update(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $data   = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = AuthMiddleware::getUserId();
        $result = $this->service->update($params['id'], $data, $userId);
        if (!$result) Response::notFound('Indicador no encontrado');
        Response::success($result);
    }

    // PATCH /api/indicadores/{id}
    public function toggleVigencia(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $userId  = AuthMiddleware::getUserId();
        $deleted = $this->service->softDelete($params['id'], $userId);
        if (!$deleted) Response::notFound('Indicador no encontrado');
        Response::success(['message' => 'Vigencia actualizada']);
    }
}
