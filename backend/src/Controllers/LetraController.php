<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\LetraService;
use App\Middleware\AuthMiddleware;
use App\Helpers\Response;

class LetraController
{
    private LetraService $service;

    public function __construct()
    {
        $this->service = new LetraService();
    }

    // GET /api/letras
    public function index(array $params): void
    {
        $page  = (int) ($_GET['page'] ?? 1);
        $limit = (int) ($_GET['limit'] ?? 20);
        Response::success($this->service->getAll([], $page, $limit));
    }

    // GET /api/letras/{id}
    public function show(array $params): void
    {
        $result = $this->service->getById($params['id']);
        if (!$result) Response::notFound('Letra no encontrada');
        Response::success($result);
    }

    // POST /api/letras
    public function store(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $data   = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = AuthMiddleware::getUserId();
        Response::created($this->service->create($data, $userId));
    }

    // PUT /api/letras/{id}
    public function update(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $data   = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = AuthMiddleware::getUserId();
        $result = $this->service->update($params['id'], $data, $userId);
        if (!$result) Response::notFound('Letra no encontrada');
        Response::success($result);
    }

    // PATCH /api/letras/{id}
    public function toggleVigencia(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $userId  = AuthMiddleware::getUserId();
        $deleted = $this->service->softDelete($params['id'], $userId);
        if (!$deleted) Response::notFound('Letra no encontrada');
        Response::success(['message' => 'Vigencia actualizada']);
    }
}
