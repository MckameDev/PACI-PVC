<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\Database;
use App\Helpers\UUID;
use PDO;

class HistorialService
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    // Registra cambios comparando datos anteriores vs nuevos
    public function registrarCambios(
        string $tabla,
        string $registroId,
        array $before,
        array $after,
        string $accion,
        ?string $userId
    ): void {
        $excluded = ['created_at', 'updated_at', 'created_by', 'updated_by'];

        $sql = "INSERT INTO historial_modificaciones (id, tabla_afectada, registro_id, campo_modificado, valor_anterior, valor_nuevo, accion, usuario_id)
                VALUES (:id, :tabla, :registro_id, :campo, :valor_anterior, :valor_nuevo, :accion, :usuario_id)";

        $stmt = $this->db->prepare($sql);

        foreach ($before as $field => $oldValue) {
            if (in_array($field, $excluded, true)) continue;
            if (!array_key_exists($field, $after)) continue;

            $newValue = $after[$field];

            if ((string)($oldValue ?? '') !== (string)($newValue ?? '')) {
                $stmt->execute([
                    ':id'             => UUID::generate(),
                    ':tabla'          => $tabla,
                    ':registro_id'    => $registroId,
                    ':campo'          => $field,
                    ':valor_anterior' => $oldValue !== null ? (string)$oldValue : null,
                    ':valor_nuevo'    => $newValue !== null ? (string)$newValue : null,
                    ':accion'         => $accion,
                    ':usuario_id'     => $userId,
                ]);
            }
        }
    }

    // Obtiene el historial de un registro especifico
    public function getByRegistro(string $registroId): array
    {
        $sql  = "SELECT h.*, u.nombre as usuario_nombre
                 FROM historial_modificaciones h
                 LEFT JOIN users u ON u.id = h.usuario_id
                 WHERE h.registro_id = :registro_id
                 ORDER BY h.created_at DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':registro_id' => $registroId]);
        return $stmt->fetchAll();
    }

    // Obtiene historial por tabla y rango de fechas
    public function getByTabla(string $tabla, ?string $desde = null, ?string $hasta = null): array
    {
        $sql    = "SELECT h.*, u.nombre as usuario_nombre
                   FROM historial_modificaciones h
                   LEFT JOIN users u ON u.id = h.usuario_id
                   WHERE h.tabla_afectada = :tabla";
        $params = [':tabla' => $tabla];

        if ($desde) {
            $sql .= " AND h.created_at >= :desde";
            $params[':desde'] = $desde;
        }
        if ($hasta) {
            $sql .= " AND h.created_at <= :hasta";
            $params[':hasta'] = $hasta;
        }

        $sql .= " ORDER BY h.created_at DESC LIMIT 100";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }
}
