<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\ImportService;
use App\Middleware\AuthMiddleware;
use App\Helpers\Response;

class ImportController
{
    private ImportService $service;

    public function __construct()
    {
        $this->service = new ImportService();
    }

    /**
     * POST /api/import/oa
     * Accepts JSON body: { "rows": [ { "id_oa": "...", ... }, ... ] }
     */
    public function importOa(): void
    {
        AuthMiddleware::requireRole('Admin');
        $userId = AuthMiddleware::getUserId();
        $data   = json_decode(file_get_contents('php://input'), true) ?? [];

        if (empty($data['rows']) || !is_array($data['rows'])) {
            Response::error('Se requiere un array "rows" con los datos a importar', 400);
            return;
        }

        try {
            $result = $this->service->importOa($data['rows'], $userId);
            Response::success($result);
        } catch (\Exception $e) {
            Response::error('Error en la importación: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/import/indicadores
     * Accepts JSON body: { "rows": [ { "id_oa": "...", "nivel_desempeno": "L", "texto_indicador": "..." }, ... ] }
     */
    public function importIndicadores(): void
    {
        AuthMiddleware::requireRole('Admin');
        $userId = AuthMiddleware::getUserId();
        $data   = json_decode(file_get_contents('php://input'), true) ?? [];

        if (empty($data['rows']) || !is_array($data['rows'])) {
            Response::error('Se requiere un array "rows" con los datos a importar', 400);
            return;
        }

        try {
            $result = $this->service->importIndicadores($data['rows'], $userId);
            Response::success($result);
        } catch (\Exception $e) {
            Response::error('Error en la importación: ' . $e->getMessage(), 500);
        }
    }

    // ================================================================
    // IMPORT MATRICES PEDAGÓGICAS (6 endpoints)
    // ================================================================

    /** POST /api/import/barreras */
    public function importBarreras(): void
    {
        $this->handleMatrizImport('importBarreras');
    }

    /** POST /api/import/fortalezas */
    public function importFortalezas(): void
    {
        $this->handleMatrizImport('importFortalezas');
    }

    /** POST /api/import/estrategias-lectura */
    public function importEstrategiasLectura(): void
    {
        $this->handleMatrizImport('importEstrategiasLectura');
    }

    /** POST /api/import/estrategias-escritura */
    public function importEstrategiasEscritura(): void
    {
        $this->handleMatrizImport('importEstrategiasEscritura');
    }

    /** POST /api/import/estrategias-comunicacion */
    public function importEstrategiasComunicacion(): void
    {
        $this->handleMatrizImport('importEstrategiasComunicacion');
    }

    /** POST /api/import/herramientas-apoyo */
    public function importHerramientasApoyo(): void
    {
        $this->handleMatrizImport('importHerramientasApoyo');
    }

    private function handleMatrizImport(string $method): void
    {
        AuthMiddleware::requireRole('Admin');
        $userId = AuthMiddleware::getUserId();
        $data   = json_decode(file_get_contents('php://input'), true) ?? [];

        if (empty($data['rows']) || !is_array($data['rows'])) {
            Response::error('Se requiere un array "rows" con los datos a importar', 400);
            return;
        }

        try {
            $result = $this->service->{$method}($data['rows'], $userId);
            Response::success($result);
        } catch (\Exception $e) {
            Response::error('Error en la importación: ' . $e->getMessage(), 500);
        }
    }
}
