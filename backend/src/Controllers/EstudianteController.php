<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\EstudianteService;
use App\Middleware\AuthMiddleware;
use App\Helpers\Response;

class EstudianteController
{
    private EstudianteService $service;

    public function __construct()
    {
        $this->service = new EstudianteService();
    }

    // GET /api/estudiantes - Lista con filtros y JOINs
    public function index(array $params): void
    {
        $page    = (int) ($_GET['page'] ?? 1);
        $limit   = (int) ($_GET['limit'] ?? 20);
        $filters = array_intersect_key($_GET, array_flip([
            'establecimiento_id', 'curso_nivel_id', 'tipo_nee', 'rut', 'nombre_completo', 'q'
        ]));

        // Non-Admin users only see students from their establecimiento
        $rol = AuthMiddleware::getUserRole();
        if ($rol !== 'Admin') {
            $userEstId = AuthMiddleware::getUserEstablecimientoId();
            if ($userEstId) {
                $filters['establecimiento_id'] = $userEstId;
            }
        }

        Response::success($this->service->getAll($filters, $page, $limit));
    }

    // GET /api/estudiantes/{id} - Detalle completo con relaciones
    public function show(array $params): void
    {
        $result = $this->service->getById($params['id']);
        if (!$result) Response::notFound('Estudiante no encontrado');
        Response::success($result);
    }

    // POST /api/estudiantes - Crear con validacion de FKs y limite
    public function store(array $params): void
    {
        $data   = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = AuthMiddleware::getUserId();
        Response::created($this->service->create($data, $userId));
    }

    // PUT /api/estudiantes/{id} - Actualizar (dispara historial automatico)
    public function update(array $params): void
    {
        $data   = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = AuthMiddleware::getUserId();
        $result = $this->service->update($params['id'], $data, $userId);
        if (!$result) Response::notFound('Estudiante no encontrado');
        Response::success($result);
    }

    // PATCH /api/estudiantes/{id} - Soft delete
    public function toggleVigencia(array $params): void
    {
        $userId  = AuthMiddleware::getUserId();
        $deleted = $this->service->softDelete($params['id'], $userId);
        if (!$deleted) Response::notFound('Estudiante no encontrado');
        Response::success(['message' => 'Vigencia actualizada']);
    }
}
