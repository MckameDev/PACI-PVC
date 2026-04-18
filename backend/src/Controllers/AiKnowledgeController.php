<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Helpers\Response;
use App\Middleware\AuthMiddleware;
use App\Services\AiKnowledgeService;

class AiKnowledgeController
{
    private AiKnowledgeService $service;

    public function __construct()
    {
        $this->service = new AiKnowledgeService();
    }

    /**
     * GET /api/admin/ia/conocimiento/libros
     */
    public function listBooks(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);

        $filters = [
            'materia' => $_GET['materia'] ?? null,
            'nivel' => $_GET['nivel'] ?? null,
            'include_inactive' => isset($_GET['include_inactive']) ? (bool) ((int) $_GET['include_inactive']) : false,
        ];

        Response::success($this->service->listBooks($filters));
    }

    /**
     * POST /api/admin/ia/conocimiento/libros/texto
     */
    public function ingestBookFromText(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $userId = AuthMiddleware::getUserId();

        $payload = json_decode(file_get_contents('php://input'), true) ?? [];
        $result = $this->service->ingestBookFromText($payload, $userId);
        Response::created($result);
    }

    /**
     * POST /api/admin/ia/conocimiento/libros/archivo
     */
    public function ingestBookFromFile(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $userId = AuthMiddleware::getUserId();

        if (!isset($_FILES['file'])) {
            Response::validationError(['file' => ['Debes enviar el archivo en el campo file']]);
        }

        $payload = [
            'titulo' => $_POST['titulo'] ?? null,
            'autor' => $_POST['autor'] ?? null,
            'fuente' => $_POST['fuente'] ?? null,
            'materia' => $_POST['materia'] ?? null,
            'nivel' => $_POST['nivel'] ?? null,
            'tags' => $_POST['tags'] ?? null,
            'chunk_size' => $_POST['chunk_size'] ?? null,
            'chunk_overlap' => $_POST['chunk_overlap'] ?? null,
        ];

        $result = $this->service->ingestBookFromUpload($_FILES['file'], $payload, $userId);
        Response::created($result);
    }

    /**
     * POST /api/admin/ia/conocimiento/buscar
     */
    public function searchChunks(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $payload = json_decode(file_get_contents('php://input'), true) ?? [];

        $query = trim((string) ($payload['query'] ?? ''));
        if ($query === '') {
            Response::validationError(['query' => ['El campo query es obligatorio']]);
        }

        $filters = [
            'materia' => $payload['materia'] ?? null,
            'nivel' => $payload['nivel'] ?? null,
        ];

        $limit = isset($payload['limit']) ? (int) $payload['limit'] : 8;

        Response::success($this->service->searchRelevantChunks($query, $filters, $limit));
    }

    /**
     * PATCH /api/admin/ia/conocimiento/libros/{id}
     */
    public function toggleBook(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $userId = AuthMiddleware::getUserId();

        $ok = $this->service->toggleBook((string) $params['id'], $userId);
        if (!$ok) {
            Response::notFound('Libro de conocimiento no encontrado');
        }

        Response::success(['message' => 'Vigencia del libro actualizada']);
    }
}
