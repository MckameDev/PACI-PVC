<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\MatrizHerramientaApoyoService;
use App\Middleware\AuthMiddleware;
use App\Helpers\Response;

class MatrizHerramientaApoyoController
{
    private MatrizHerramientaApoyoService $service;

    public function __construct()
    {
        $this->service = new MatrizHerramientaApoyoService();
    }

    public function index(array $params): void
    {
        $page  = (int) ($_GET['page'] ?? 1);
        $limit = (int) ($_GET['limit'] ?? 100);
        Response::success($this->service->getAll([], $page, $limit));
    }

    public function show(array $params): void
    {
        $result = $this->service->getById($params['id']);
        if (!$result) Response::notFound('Herramienta de apoyo no encontrada');
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
        if (!$result) Response::notFound('Herramienta de apoyo no encontrada');
        Response::success($result);
    }

    public function toggleVigencia(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $userId  = AuthMiddleware::getUserId();
        $deleted = $this->service->softDelete($params['id'], $userId);
        if (!$deleted) Response::notFound('Herramienta de apoyo no encontrada');
        Response::success(['message' => 'Vigencia actualizada']);
    }
}
