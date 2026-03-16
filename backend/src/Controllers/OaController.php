<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\OaService;
use App\Middleware\AuthMiddleware;
use App\Helpers\Response;

class OaController
{
    private OaService $service;

    public function __construct()
    {
        $this->service = new OaService();
    }

    // GET /api/oa
    public function index(array $params): void
    {
        $page    = (int) ($_GET['page'] ?? 1);
        $limit   = (int) ($_GET['limit'] ?? 50);
        $filters = array_intersect_key($_GET, array_flip(['asignatura_id', 'nivel_trabajo_id', 'tipo_oa', 'eje', 'ambito', 'nucleo', 'base_de_habilidades', 'fuente']));
        Response::success($this->service->getAll($filters, $page, $limit));
    }

    // GET /api/oa/ejes?asignatura_id={id}
    public function ejes(array $params): void
    {
        $asignaturaId = $_GET['asignatura_id'] ?? '';
        if (!$asignaturaId) {
            Response::error('asignatura_id es requerido', 400);
            return;
        }
        Response::success($this->service->getEjes($asignaturaId));
    }

    // GET /api/oa/{id}
    public function show(array $params): void
    {
        $result = $this->service->getById($params['id']);
        if (!$result) Response::notFound('OA no encontrado');
        Response::success($result);
    }

    // POST /api/oa
    public function store(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $data   = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = AuthMiddleware::getUserId();
        Response::created($this->service->create($data, $userId));
    }

    // PUT /api/oa/{id}
    public function update(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $data   = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = AuthMiddleware::getUserId();
        $result = $this->service->update($params['id'], $data, $userId);
        if (!$result) Response::notFound('OA no encontrado');
        Response::success($result);
    }

    // PATCH /api/oa/{id}
    public function toggleVigencia(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $userId  = AuthMiddleware::getUserId();
        $deleted = $this->service->softDelete($params['id'], $userId);
        if (!$deleted) Response::notFound('OA no encontrado');
        Response::success(['message' => 'Vigencia actualizada']);
    }
}
