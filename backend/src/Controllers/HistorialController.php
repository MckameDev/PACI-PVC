<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\HistorialService;
use App\Helpers\Response;

class HistorialController
{
    private HistorialService $service;

    public function __construct()
    {
        $this->service = new HistorialService();
    }

    // GET /api/historial/registro/{id} - Historial de un registro especifico
    public function byRegistro(array $params): void
    {
        $result = $this->service->getByRegistro($params['id']);
        Response::success($result);
    }

    // GET /api/historial/tabla/{tabla} - Historial por tabla
    public function byTabla(array $params): void
    {
        $desde  = $_GET['desde'] ?? null;
        $hasta  = $_GET['hasta'] ?? null;
        $result = $this->service->getByTabla($params['tabla'], $desde, $hasta);
        Response::success($result);
    }
}
