<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\AntecedenteEscolarService;
use App\Middleware\AuthMiddleware;
use App\Helpers\Response;

class AntecedenteEscolarController
{
    private AntecedenteEscolarService $service;

    public function __construct()
    {
        $this->service = new AntecedenteEscolarService();
    }

    public function index(array $params): void
    {
        $page    = (int) ($_GET['page'] ?? 1);
        $limit   = (int) ($_GET['limit'] ?? 20);
        $filters = [];
        if (!empty($_GET['estudiante_id'])) {
            $filters['estudiante_id'] = $_GET['estudiante_id'];
        }
        Response::success($this->service->getAll($filters, $page, $limit));
    }

    public function show(array $params): void
    {
        $result = $this->service->getById($params['id']);
        if (!$result) Response::notFound('Antecedente escolar no encontrado');
        Response::success($result);
    }

    public function store(array $params): void
    {
        $data   = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = AuthMiddleware::getUserId();
        Response::created($this->service->create($data, $userId));
    }

    public function update(array $params): void
    {
        $data   = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = AuthMiddleware::getUserId();
        $result = $this->service->update($params['id'], $data, $userId);
        if (!$result) Response::notFound('Antecedente escolar no encontrado');
        Response::success($result);
    }

    public function toggleVigencia(array $params): void
    {
        $userId  = AuthMiddleware::getUserId();
        $deleted = $this->service->softDelete($params['id'], $userId);
        if (!$deleted) Response::notFound('Antecedente escolar no encontrado');
        Response::success(['message' => 'Vigencia actualizada']);
    }
}
