<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\Database;
use App\Models\ChatbotTema;
use App\Models\ChatbotOpcion;
use App\Helpers\Validator;
use App\Helpers\Response;
use App\Helpers\UUID;
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

    // ── IMPORT EXCEL ──────────────────────────────────────

    /**
     * Import chatbot temas + opciones from parsed Excel rows.
     *
     * Expected columns: tema, icono, opcion_nivel1, opcion_nivel2, respuesta
     *
     * Deduplication rules:
     * - Same tema title → reuse existing tema (or create once)
     * - Same opcion text under same parent → reuse (no duplicate)
     * - Multiple rows with same tema + opcion_nivel1 + opcion_nivel2 but different respuesta → append responses
     */
    public function importFromExcel(array $rows, ?string $userId): array
    {
        $temasCreated    = 0;
        $opcionesCreated = 0;
        $skipped         = 0;
        $errors          = [];

        $this->db->beginTransaction();

        try {
            // Cache: tema_title => id, (tema_id + parent_id + texto) => opcion_id
            $temaCache   = [];
            $opcionCache = [];

            // Pre-load existing active temas
            $stmt = $this->db->prepare("SELECT id, titulo FROM chatbot_temas WHERE vigencia = 1");
            $stmt->execute();
            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $t) {
                $temaCache[mb_strtolower(trim($t['titulo']))] = $t['id'];
            }

            // Determine max orden for temas
            $maxOrdenStmt = $this->db->prepare("SELECT COALESCE(MAX(orden), 0) FROM chatbot_temas WHERE vigencia = 1");
            $maxOrdenStmt->execute();
            $temaOrden = (int) $maxOrdenStmt->fetchColumn();

            foreach ($rows as $index => $row) {
                $lineNum = $index + 2;

                $temaTitulo   = trim((string) ($row['tema'] ?? ''));
                $icono        = trim((string) ($row['icono'] ?? 'MessageCircle'));
                $opN1Text     = trim((string) ($row['opcion_nivel1'] ?? ''));
                $opN2Text     = trim((string) ($row['opcion_nivel2'] ?? ''));
                $respuestaText = trim((string) ($row['respuesta'] ?? ''));

                if (empty($temaTitulo)) {
                    $errors[] = "Fila {$lineNum}: columna 'tema' vacía, se omite.";
                    continue;
                }
                if (empty($opN1Text)) {
                    $errors[] = "Fila {$lineNum}: columna 'opcion_nivel1' vacía, se omite.";
                    continue;
                }

                // ── Resolve or create Tema ──
                $temaKey = mb_strtolower($temaTitulo);
                if (!isset($temaCache[$temaKey])) {
                    $temaId = UUID::generate();
                    $temaOrden++;
                    $ins = $this->db->prepare(
                        "INSERT INTO chatbot_temas (id, titulo, descripcion, icono, orden, vigencia, created_by, updated_by)
                         VALUES (:id, :titulo, NULL, :icono, :orden, 1, :user, :user2)"
                    );
                    $ins->execute([
                        ':id'    => $temaId,
                        ':titulo' => $temaTitulo,
                        ':icono'  => $icono ?: 'MessageCircle',
                        ':orden'  => $temaOrden,
                        ':user'   => $userId,
                        ':user2'  => $userId,
                    ]);
                    $temaCache[$temaKey] = $temaId;
                    $temasCreated++;
                }
                $temaId = $temaCache[$temaKey];

                // ── Resolve or create Opcion Nivel 1 ──
                $n1CacheKey = $temaId . '|null|' . mb_strtolower($opN1Text);
                if (!isset($opcionCache[$n1CacheKey])) {
                    // Check DB
                    $chk = $this->db->prepare(
                        "SELECT id FROM chatbot_opciones
                         WHERE tema_id = :tid AND parent_id IS NULL AND nivel = 1
                         AND texto_opcion = :txt AND vigencia = 1 LIMIT 1"
                    );
                    $chk->execute([':tid' => $temaId, ':txt' => $opN1Text]);
                    $existId = $chk->fetchColumn();

                    if ($existId) {
                        $opcionCache[$n1CacheKey] = $existId;
                    } else {
                        $n1Id = UUID::generate();
                        $maxOrd = $this->db->prepare(
                            "SELECT COALESCE(MAX(orden), 0) FROM chatbot_opciones WHERE tema_id = :tid AND parent_id IS NULL AND vigencia = 1"
                        );
                        $maxOrd->execute([':tid' => $temaId]);
                        $ord = (int) $maxOrd->fetchColumn() + 1;

                        $ins = $this->db->prepare(
                            "INSERT INTO chatbot_opciones (id, tema_id, parent_id, nivel, texto_opcion, texto_respuesta, orden, vigencia, created_by, updated_by)
                             VALUES (:id, :tid, NULL, 1, :txt, NULL, :ord, 1, :user, :user2)"
                        );
                        $ins->execute([
                            ':id'   => $n1Id,
                            ':tid'  => $temaId,
                            ':txt'  => $opN1Text,
                            ':ord'  => $ord,
                            ':user' => $userId,
                            ':user2' => $userId,
                        ]);
                        $opcionCache[$n1CacheKey] = $n1Id;
                        $opcionesCreated++;
                    }
                }
                $n1Id = $opcionCache[$n1CacheKey];

                // ── If no nivel2, attach respuesta to nivel1 ──
                if (empty($opN2Text)) {
                    if (!empty($respuestaText)) {
                        // Update nivel1 response if not already set
                        $upd = $this->db->prepare(
                            "UPDATE chatbot_opciones SET texto_respuesta = :resp, updated_by = :user
                             WHERE id = :id AND (texto_respuesta IS NULL OR texto_respuesta = '')"
                        );
                        $upd->execute([':resp' => $respuestaText, ':user' => $userId, ':id' => $n1Id]);
                    }
                    continue;
                }

                // ── Resolve or create Opcion Nivel 2 ──
                $n2CacheKey = $temaId . '|' . $n1Id . '|' . mb_strtolower($opN2Text);
                if (!isset($opcionCache[$n2CacheKey])) {
                    $chk = $this->db->prepare(
                        "SELECT id FROM chatbot_opciones
                         WHERE tema_id = :tid AND parent_id = :pid AND nivel = 2
                         AND texto_opcion = :txt AND vigencia = 1 LIMIT 1"
                    );
                    $chk->execute([':tid' => $temaId, ':pid' => $n1Id, ':txt' => $opN2Text]);
                    $existId = $chk->fetchColumn();

                    if ($existId) {
                        $opcionCache[$n2CacheKey] = $existId;
                    } else {
                        $n2Id = UUID::generate();
                        $maxOrd = $this->db->prepare(
                            "SELECT COALESCE(MAX(orden), 0) FROM chatbot_opciones WHERE tema_id = :tid AND parent_id = :pid AND vigencia = 1"
                        );
                        $maxOrd->execute([':tid' => $temaId, ':pid' => $n1Id]);
                        $ord = (int) $maxOrd->fetchColumn() + 1;

                        $ins = $this->db->prepare(
                            "INSERT INTO chatbot_opciones (id, tema_id, parent_id, nivel, texto_opcion, texto_respuesta, orden, vigencia, created_by, updated_by)
                             VALUES (:id, :tid, :pid, 2, :txt, NULL, :ord, 1, :user, :user2)"
                        );
                        $ins->execute([
                            ':id'   => $n2Id,
                            ':tid'  => $temaId,
                            ':pid'  => $n1Id,
                            ':txt'  => $opN2Text,
                            ':ord'  => $ord,
                            ':user' => $userId,
                            ':user2' => $userId,
                        ]);
                        $opcionCache[$n2CacheKey] = $n2Id;
                        $opcionesCreated++;
                    }
                }
                $n2Id = $opcionCache[$n2CacheKey];

                // ── Attach respuesta as nivel 3 opcion (if provided) ──
                if (!empty($respuestaText)) {
                    // Check if exact same respuesta already exists under this n2
                    $dupChk = $this->db->prepare(
                        "SELECT COUNT(*) FROM chatbot_opciones
                         WHERE tema_id = :tid AND parent_id = :pid AND nivel = 3
                         AND texto_respuesta = :resp AND vigencia = 1"
                    );
                    $dupChk->execute([':tid' => $temaId, ':pid' => $n2Id, ':resp' => $respuestaText]);

                    if ((int) $dupChk->fetchColumn() > 0) {
                        $skipped++;
                        continue;
                    }

                    $n3Id = UUID::generate();
                    $maxOrd = $this->db->prepare(
                        "SELECT COALESCE(MAX(orden), 0) FROM chatbot_opciones WHERE tema_id = :tid AND parent_id = :pid AND vigencia = 1"
                    );
                    $maxOrd->execute([':tid' => $temaId, ':pid' => $n2Id]);
                    $ord = (int) $maxOrd->fetchColumn() + 1;

                    $ins = $this->db->prepare(
                        "INSERT INTO chatbot_opciones (id, tema_id, parent_id, nivel, texto_opcion, texto_respuesta, orden, vigencia, created_by, updated_by)
                         VALUES (:id, :tid, :pid, 3, :txt, :resp, :ord, 1, :user, :user2)"
                    );
                    $ins->execute([
                        ':id'   => $n3Id,
                        ':tid'  => $temaId,
                        ':pid'  => $n2Id,
                        ':txt'  => mb_substr($respuestaText, 0, 60) . (mb_strlen($respuestaText) > 60 ? '...' : ''),
                        ':resp' => $respuestaText,
                        ':ord'  => $ord,
                        ':user' => $userId,
                        ':user2' => $userId,
                    ]);
                    $opcionesCreated++;
                }
            }

            $this->db->commit();
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }

        return [
            'temas_created'    => $temasCreated,
            'opciones_created' => $opcionesCreated,
            'skipped'          => $skipped,
            'errors'           => $errors,
            'total_processed'  => count($rows),
        ];
    }
}
