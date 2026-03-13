<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\Database;
use App\Models\ChatbotTema;
use App\Models\ChatbotOpcion;
use App\Helpers\Validator;
use App\Helpers\Response;
use PDO;

class ChatbotService
{
    private ChatbotTema   $temaModel;
    private ChatbotOpcion $opcionModel;
    private PDO           $db;

    public function __construct()
    {
        $this->temaModel   = new ChatbotTema();
        $this->opcionModel = new ChatbotOpcion();
        $this->db          = Database::getInstance();
    }

    // ── TEMAS ─────────────────────────────────────────────

    public function getAllTemas(array $filters, int $page, int $limit): array
    {
        return $this->temaModel->getAll($filters, $page, $limit);
    }

    public function getTemasPublic(): array
    {
        $stmt = $this->db->prepare(
            "SELECT id, titulo, descripcion, icono, orden FROM chatbot_temas WHERE vigencia = 1 ORDER BY orden ASC"
        );
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getTemaById(string $id): ?array
    {
        return $this->temaModel->getById($id);
    }

    public function createTema(array $data, ?string $userId): array
    {
        $validator = Validator::make($data, [
            'titulo'      => 'required|string|min:2|max:200',
            'descripcion' => 'nullable|string',
            'icono'       => 'nullable|string|max:50',
            'orden'       => 'nullable|integer',
        ]);

        if (!empty($validator->getErrors())) {
            Response::validationError($validator->getErrors());
        }

        if (!$this->temaModel->isUnique('titulo', $data['titulo'])) {
            Response::error('El tema ya existe', 409);
        }

        $inactive = $this->temaModel->findInactiveBy('titulo', $data['titulo']);
        if ($inactive) {
            return $this->temaModel->restoreAndUpdate($inactive['id'], $data, $userId);
        }

        return $this->temaModel->create($data, $userId);
    }

    public function updateTema(string $id, array $data, ?string $userId): ?array
    {
        $validator = Validator::make($data, [
            'titulo'      => 'nullable|string|min:2|max:200',
            'descripcion' => 'nullable|string',
            'icono'       => 'nullable|string|max:50',
            'orden'       => 'nullable|integer',
        ]);

        if (!empty($validator->getErrors())) {
            Response::validationError($validator->getErrors());
        }

        if (isset($data['titulo']) && !$this->temaModel->isUnique('titulo', $data['titulo'], $id)) {
            Response::error('El tema ya existe', 409);
        }

        return $this->temaModel->update($id, $data, $userId);
    }

    public function deleteTema(string $id, ?string $userId): bool
    {
        return $this->temaModel->softDelete($id, $userId);
    }

    // ── OPCIONES ──────────────────────────────────────────

    public function getOpcionesByTema(string $temaId): array
    {
        $stmt = $this->db->prepare(
            "SELECT * FROM chatbot_opciones WHERE tema_id = :tema_id AND vigencia = 1 ORDER BY nivel ASC, orden ASC"
        );
        $stmt->execute([':tema_id' => $temaId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getOpcionById(string $id): ?array
    {
        return $this->opcionModel->getById($id);
    }

    public function createOpcion(array $data, ?string $userId): array
    {
        $validator = Validator::make($data, [
            'tema_id'         => 'required|string|max:36',
            'parent_id'       => 'nullable|string|max:36',
            'nivel'           => 'required|integer',
            'texto_opcion'    => 'required|string|min:2|max:500',
            'texto_respuesta' => 'nullable|string',
            'orden'           => 'nullable|integer',
        ]);

        if (!empty($validator->getErrors())) {
            Response::validationError($validator->getErrors());
        }

        $nivel = (int) $data['nivel'];
        if ($nivel < 1 || $nivel > 3) {
            Response::error('El nivel debe estar entre 1 y 3', 400);
        }

        // Validate parent consistency
        if ($nivel === 1 && !empty($data['parent_id'])) {
            Response::error('Las opciones de nivel 1 no pueden tener parent_id', 400);
        }
        if ($nivel > 1 && empty($data['parent_id'])) {
            Response::error('Las opciones de nivel > 1 requieren un parent_id', 400);
        }

        return $this->opcionModel->create($data, $userId);
    }

    public function updateOpcion(string $id, array $data, ?string $userId): ?array
    {
        $validator = Validator::make($data, [
            'texto_opcion'    => 'nullable|string|min:2|max:500',
            'texto_respuesta' => 'nullable|string',
            'orden'           => 'nullable|integer',
        ]);

        if (!empty($validator->getErrors())) {
            Response::validationError($validator->getErrors());
        }

        return $this->opcionModel->update($id, $data, $userId);
    }

    public function deleteOpcion(string $id, ?string $userId): bool
    {
        return $this->opcionModel->softDelete($id, $userId);
    }

    // ── ÁRBOL PÚBLICO ─────────────────────────────────────

    /**
     * Returns full option tree for a tema, nested up to 3 levels.
     */
    public function getArbol(string $temaId): array
    {
        $stmt = $this->db->prepare(
            "SELECT id, parent_id, nivel, texto_opcion, texto_respuesta, orden
             FROM chatbot_opciones
             WHERE tema_id = :tema_id AND vigencia = 1
             ORDER BY nivel ASC, orden ASC"
        );
        $stmt->execute([':tema_id' => $temaId]);
        $flat = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return $this->buildTree($flat);
    }

    private function buildTree(array $items, ?string $parentId = null): array
    {
        $branch = [];
        foreach ($items as $item) {
            if ($item['parent_id'] === $parentId) {
                $children = $this->buildTree($items, $item['id']);
                if ($children) {
                    $item['children'] = $children;
                }
                $branch[] = $item;
            }
        }
        return $branch;
    }
}
