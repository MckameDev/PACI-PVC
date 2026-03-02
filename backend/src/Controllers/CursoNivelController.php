<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\CursoNivelService;
use App\Middleware\AuthMiddleware;
use App\Helpers\Response;

class CursoNivelController
{
    private CursoNivelService $service;

    public function __construct()
    {
        $this->service = new CursoNivelService();
    }

    // GET /api/cursos-niveles
    public function index(array $params): void
    {
        $page  = (int) ($_GET['page'] ?? 1);
        $limit = (int) ($_GET['limit'] ?? 20);
        Response::success($this->service->getAll([], $page, $limit));
    }

    // GET /api/cursos-niveles/{id}
    public function show(array $params): void
    {
        $result = $this->service->getById($params['id']);
        if (!$result) Response::notFound('Curso/Nivel no encontrado');
        Response::success($result);
    }

    // POST /api/cursos-niveles
    public function store(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $data   = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = AuthMiddleware::getUserId();
        Response::created($this->service->create($data, $userId));
    }

    // PUT /api/cursos-niveles/{id}
    public function update(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $data   = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = AuthMiddleware::getUserId();
        $result = $this->service->update($params['id'], $data, $userId);
        if (!$result) Response::notFound('Curso/Nivel no encontrado');
        Response::success($result);
    }

    // PATCH /api/cursos-niveles/{id}
    public function toggleVigencia(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $userId  = AuthMiddleware::getUserId();
        $deleted = $this->service->softDelete($params['id'], $userId);
        if (!$deleted) Response::notFound('Curso/Nivel no encontrado');
        Response::success(['message' => 'Vigencia actualizada']);
    }
}
