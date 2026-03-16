<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\MatrizAdecuacionService;
use App\Middleware\AuthMiddleware;
use App\Helpers\Response;

class MatrizAdecuacionController
{
    private MatrizAdecuacionService $service;

    public function __construct()
    {
        $this->service = new MatrizAdecuacionService();
    }

    public function index(array $params): void
    {
        $page    = (int) ($_GET['page'] ?? 1);
        $limit   = (int) ($_GET['limit'] ?? 100);
        $filters = array_intersect_key($_GET, array_flip(['asignatura', 'eje', 'core_nivel']));
        Response::success($this->service->getAll($filters, $page, $limit));
    }

    public function show(array $params): void
    {
        $result = $this->service->getById($params['id']);
        if (!$result) Response::notFound('Registro no encontrado');
        Response::success($result);
    }

    public function store(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $data   = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = AuthMiddleware::getUserId();
        Response::created($this->service->create($data, $userId));
    }

    public function update(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $data   = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = AuthMiddleware::getUserId();
        $result = $this->service->update($params['id'], $data, $userId);
        if (!$result) Response::notFound('Registro no encontrado');
        Response::success($result);
    }

    public function toggleVigencia(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $userId  = AuthMiddleware::getUserId();
        $deleted = $this->service->softDelete($params['id'], $userId);
        if (!$deleted) Response::notFound('Registro no encontrado');
        Response::success(['message' => 'Vigencia actualizada']);
    }
}
