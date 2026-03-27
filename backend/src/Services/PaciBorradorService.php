<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\Database;
use App\Helpers\UUID;
use App\Helpers\Response;
use PDO;

class PaciBorradorService
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    /**
     * Obtiene el borrador del usuario con datos denormalizados para el modal.
     */
    public function getByUsuario(string $userId): ?array
    {
        $sql = "
            SELECT
                b.id,
                b.usuario_id,
                b.paso_actual,
                b.form_data,
                b.estudiante_id,
                b.asignatura_id,
                b.created_at,
                b.updated_at,
                e.nombre_completo AS estudiante_nombre,
                e.rut             AS estudiante_rut,
                a.nombre          AS asignatura_nombre
            FROM paci_borradores b
            LEFT JOIN estudiantes e ON e.id = b.estudiante_id
            LEFT JOIN asignaturas a ON a.id = b.asignatura_id
            WHERE b.usuario_id = :uid
            LIMIT 1
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([':uid' => $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        // Decodificar JSON de form_data
        $row['form_data'] = json_decode($row['form_data'], true);

        return $row;
    }

    /**
     * Crea o actualiza el borrador del usuario (INSERT … ON DUPLICATE KEY UPDATE).
     */
    public function upsert(array $data, string $userId): array
    {
        $formDataJson = is_string($data['form_data'] ?? null)
            ? $data['form_data']
            : json_encode($data['form_data'] ?? '{}', JSON_UNESCAPED_UNICODE);

        $pasoActual   = (int) ($data['paso_actual'] ?? 1);
        $estudianteId = !empty($data['estudiante_id']) ? $data['estudiante_id'] : null;
        $asignaturaId = !empty($data['asignatura_id']) ? $data['asignatura_id'] : null;

        $id = UUID::generate();

        $sql = "
            INSERT INTO paci_borradores (id, usuario_id, paso_actual, form_data, estudiante_id, asignatura_id)
            VALUES (:id, :uid, :paso, :fdata, :est, :asig)
            ON DUPLICATE KEY UPDATE
                paso_actual   = VALUES(paso_actual),
                form_data     = VALUES(form_data),
                estudiante_id = VALUES(estudiante_id),
                asignatura_id = VALUES(asignatura_id),
                updated_at    = CURRENT_TIMESTAMP
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':id'   => $id,
            ':uid'  => $userId,
            ':paso' => $pasoActual,
            ':fdata' => $formDataJson,
            ':est'  => $estudianteId,
            ':asig' => $asignaturaId,
        ]);

        return $this->getByUsuario($userId) ?? ['id' => $id];
    }

    /**
     * Elimina el borrador del usuario.
     */
    public function delete(string $userId): bool
    {
        $sql  = "DELETE FROM paci_borradores WHERE usuario_id = :uid";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':uid' => $userId]);

        return $stmt->rowCount() > 0;
    }
}
