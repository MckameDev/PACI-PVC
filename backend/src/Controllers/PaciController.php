<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\PaciService;
use App\Middleware\AuthMiddleware;
use App\Helpers\Response;

class PaciController
{
    private PaciService $service;

    public function __construct()
    {
        $this->service = new PaciService();
    }

    // GET /api/paci - Lista PACIs con datos de estudiante
    public function index(array $params): void
    {
        $page    = (int) ($_GET['page'] ?? 1);
        $limit   = (int) ($_GET['limit'] ?? 20);
        $filters = array_intersect_key($_GET, array_flip(['estudiante_id']));
        Response::success($this->service->getAll($filters, $page, $limit));
    }

    // GET /api/paci/{id} - Detalle completo con trayectoria y perfil DUA
    public function show(array $params): void
    {
        $result = $this->service->getById($params['id']);
        if (!$result) Response::notFound('PACI no encontrado');
        Response::success($result);
    }

    // POST /api/paci - Crea PACI completo transaccionalmente
    public function store(array $params): void
    {
        $data   = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = AuthMiddleware::getUserId();
        $result = $this->service->crearPaciCompleto($data, $userId);
        Response::created($result);
    }

    // PUT /api/paci/{id} - Actualiza cabecera del PACI
    public function update(array $params): void
    {
        $data   = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = AuthMiddleware::getUserId();
        $result = $this->service->update($params['id'], $data, $userId);
        if (!$result) Response::notFound('PACI no encontrado');
        Response::success($result);
    }

    // PATCH /api/paci/{id} - Soft delete
    public function toggleVigencia(array $params): void
    {
        $userId  = AuthMiddleware::getUserId();
        $deleted = $this->service->softDelete($params['id'], $userId);
        if (!$deleted) Response::notFound('PACI no encontrado');
        Response::success(['message' => 'Vigencia actualizada']);
    }
}
