<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\ChatbotService;
use App\Middleware\AuthMiddleware;
use App\Helpers\Response;

class ChatbotController
{
    private ChatbotService $service;

    public function __construct()
    {
        $this->service = new ChatbotService();
    }

    // ── PÚBLICOS (autenticado, cualquier rol) ─────────────

    /** GET /api/chatbot/temas — lista de temas activos */
    public function temasPublic(array $params): void
    {
        Response::success($this->service->getTemasPublic());
    }

    /** GET /api/chatbot/temas/{id}/arbol — árbol completo de opciones */
    public function arbol(array $params): void
    {
        $tree = $this->service->getArbol($params['id']);
        Response::success($tree);
    }

    // ── ADMIN: TEMAS ──────────────────────────────────────

    /** GET /api/admin/chatbot/temas */
    public function indexTemas(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $page  = (int) ($_GET['page'] ?? 1);
        $limit = (int) ($_GET['limit'] ?? 100);
        Response::success($this->service->getAllTemas([], $page, $limit));
    }

    /** GET /api/admin/chatbot/temas/{id} */
    public function showTema(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $result = $this->service->getTemaById($params['id']);
        if (!$result) Response::notFound('Tema no encontrado');
        Response::success($result);
    }

    /** POST /api/admin/chatbot/temas */
    public function storeTema(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $data   = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = AuthMiddleware::getUserId();
        Response::created($this->service->createTema($data, $userId));
    }

    /** PUT /api/admin/chatbot/temas/{id} */
    public function updateTema(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $data   = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = AuthMiddleware::getUserId();
        $result = $this->service->updateTema($params['id'], $data, $userId);
        if (!$result) Response::notFound('Tema no encontrado');
        Response::success($result);
    }

    /** PATCH /api/admin/chatbot/temas/{id} */
    public function toggleTema(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $userId  = AuthMiddleware::getUserId();
        $deleted = $this->service->deleteTema($params['id'], $userId);
        if (!$deleted) Response::notFound('Tema no encontrado');
        Response::success(['message' => 'Vigencia del tema actualizada']);
    }

    // ── ADMIN: OPCIONES ───────────────────────────────────

    /** GET /api/admin/chatbot/opciones?tema_id=... */
    public function indexOpciones(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $temaId = $_GET['tema_id'] ?? '';
        if (empty($temaId)) {
            Response::error('Se requiere tema_id', 400);
            return;
        }
        Response::success($this->service->getOpcionesByTema($temaId));
    }

    /** GET /api/admin/chatbot/opciones/{id} */
    public function showOpcion(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $result = $this->service->getOpcionById($params['id']);
        if (!$result) Response::notFound('Opción no encontrada');
        Response::success($result);
    }

    /** POST /api/admin/chatbot/opciones */
    public function storeOpcion(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $data   = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = AuthMiddleware::getUserId();
        Response::created($this->service->createOpcion($data, $userId));
    }

    /** PUT /api/admin/chatbot/opciones/{id} */
    public function updateOpcion(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $data   = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = AuthMiddleware::getUserId();
        $result = $this->service->updateOpcion($params['id'], $data, $userId);
        if (!$result) Response::notFound('Opción no encontrada');
        Response::success($result);
    }

    /** PATCH /api/admin/chatbot/opciones/{id} */
    public function toggleOpcion(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $userId  = AuthMiddleware::getUserId();
        $deleted = $this->service->deleteOpcion($params['id'], $userId);
        if (!$deleted) Response::notFound('Opción no encontrada');
        Response::success(['message' => 'Vigencia de la opción actualizada']);
    }
}
