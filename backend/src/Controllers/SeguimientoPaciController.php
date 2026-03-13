<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\SeguimientoPaciService;
use App\Middleware\AuthMiddleware;
use App\Helpers\Response;

class SeguimientoPaciController
{
    private SeguimientoPaciService $service;

    public function __construct()
    {
        $this->service = new SeguimientoPaciService();
    }

    // GET /api/seguimiento-paci?paci_id=xxx — Grilla completa de un PACI
    public function index(array $params): void
    {
        if (!empty($_GET['paci_id'])) {
            Response::success($this->service->getByPaci($_GET['paci_id']));
            return;
        }

        $page  = (int) ($_GET['page'] ?? 1);
        $limit = (int) ($_GET['limit'] ?? 50);
        Response::success($this->service->getAll([], $page, $limit));
    }

    // GET /api/seguimiento-paci/{id}
    public function show(array $params): void
    {
        $result = $this->service->getById($params['id']);
        if (!$result) Response::notFound('Registro de seguimiento no encontrado');
        Response::success($result);
    }

    // POST /api/seguimiento-paci — Upsert de un registro mensual
    public function store(array $params): void
    {
        $data   = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = AuthMiddleware::getUserId();
        Response::created($this->service->upsert($data, $userId));
    }

    // PATCH /api/seguimiento-paci/{id}
    public function toggleVigencia(array $params): void
    {
        $userId  = AuthMiddleware::getUserId();
        $deleted = $this->service->softDelete($params['id'], $userId);
        if (!$deleted) Response::notFound('Registro de seguimiento no encontrado');
        Response::success(['message' => 'Vigencia actualizada']);
    }
}
