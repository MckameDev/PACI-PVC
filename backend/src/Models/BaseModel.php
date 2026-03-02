<?php

declare(strict_types=1);

namespace App\Models;

use App\Config\Database;
use App\Helpers\UUID;
use PDO;

abstract class BaseModel
{
    protected string $table;
    protected array  $fillable    = [];
    protected string $primaryKey  = 'id';
    protected bool   $trackHistory = false;

    protected PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    // Obtiene todos los registros vigentes con paginacion
    public function getAll(array $filters = [], int $page = 1, int $limit = 20): array
    {
        $where  = ['vigencia = 1'];
        $params = [];

        foreach ($filters as $key => $value) {
            if (in_array($key, $this->fillable, true) && $value !== null && $value !== '') {
                $where[]           = "{$key} = :{$key}";
                $params[":{$key}"] = $value;
            }
        }

        $whereStr = implode(' AND ', $where);
        $offset   = ($page - 1) * $limit;

        $countSql = "SELECT COUNT(*) as total FROM {$this->table} WHERE {$whereStr}";
        $countStmt = $this->db->prepare($countSql);
        $countStmt->execute($params);
        $total = (int) $countStmt->fetch()['total'];

        $sql  = "SELECT * FROM {$this->table} WHERE {$whereStr} ORDER BY created_at DESC LIMIT :limit OFFSET :offset";
        $stmt = $this->db->prepare($sql);

        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return [
            'items'       => $stmt->fetchAll(),
            'total'       => $total,
            'page'        => $page,
            'limit'       => $limit,
            'total_pages' => (int) ceil($total / $limit),
        ];
    }

    // Obtiene un registro vigente por su UUID
    public function getById(string $id): ?array
    {
        $sql  = "SELECT * FROM {$this->table} WHERE {$this->primaryKey} = :id AND vigencia = 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $id]);
        $result = $stmt->fetch();

        return $result ?: null;
    }

    // Crea un nuevo registro generando UUID y seteando auditoria
    public function create(array $data, ?string $userId = null): array
    {
        $id = UUID::generate();
        $data[$this->primaryKey] = $id;
        $data['vigencia']        = 1;
        $data['created_by']      = $userId;
        $data['updated_by']      = $userId;

        $allowed = array_merge($this->fillable, [$this->primaryKey, 'vigencia', 'created_by', 'updated_by']);
        $data    = array_intersect_key($data, array_flip($allowed));

        $columns = implode(', ', array_keys($data));
        $placeholders = implode(', ', array_map(fn($k) => ":{$k}", array_keys($data)));

        $sql  = "INSERT INTO {$this->table} ({$columns}) VALUES ({$placeholders})";
        $stmt = $this->db->prepare($sql);

        foreach ($data as $key => $value) {
            $stmt->bindValue(":{$key}", $value);
        }

        $stmt->execute();

        return $this->getById($id);
    }

    // Actualiza un registro existente. Retorna datos previos para historial
    public function update(string $id, array $data, ?string $userId = null): ?array
    {
        $current = $this->getById($id);
        if (!$current) {
            return null;
        }

        $data['updated_by'] = $userId;

        $allowed = array_merge($this->fillable, ['updated_by']);
        $data    = array_intersect_key($data, array_flip($allowed));

        $setClause = implode(', ', array_map(fn($k) => "{$k} = :{$k}", array_keys($data)));

        $sql  = "UPDATE {$this->table} SET {$setClause} WHERE {$this->primaryKey} = :_id AND vigencia = 1";
        $stmt = $this->db->prepare($sql);

        foreach ($data as $key => $value) {
            $stmt->bindValue(":{$key}", $value);
        }
        $stmt->bindValue(':_id', $id);
        $stmt->execute();

        $updated = $this->getById($id);

        if ($this->trackHistory && $updated) {
            $this->registerHistory($id, $current, $updated, 'UPDATE', $userId);
        }

        return $updated;
    }

    // Soft delete: cambia vigencia a 0
    public function softDelete(string $id, ?string $userId = null): bool
    {
        $current = $this->getById($id);
        if (!$current) {
            return false;
        }

        $sql  = "UPDATE {$this->table} SET vigencia = 0, updated_by = :userId WHERE {$this->primaryKey} = :id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':userId' => $userId, ':id' => $id]);

        if ($this->trackHistory) {
            $this->registerHistory($id, $current, array_merge($current, ['vigencia' => 0]), 'SOFT_DELETE', $userId);
        }

        return $stmt->rowCount() > 0;
    }

    // Restaura un registro: cambia vigencia a 1
    public function restore(string $id, ?string $userId = null): bool
    {
        $sql  = "UPDATE {$this->table} SET vigencia = 1, updated_by = :userId WHERE {$this->primaryKey} = :id AND vigencia = 0";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':userId' => $userId, ':id' => $id]);
        return $stmt->rowCount() > 0;
    }

    // Verifica si un registro existe y esta vigente
    public function exists(string $id): bool
    {
        $sql  = "SELECT 1 FROM {$this->table} WHERE {$this->primaryKey} = :id AND vigencia = 1 LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $id]);
        return (bool) $stmt->fetch();
    }

    // Verifica unicidad de un campo entre registros vigentes
    public function isUnique(string $field, mixed $value, ?string $excludeId = null): bool
    {
        $sql    = "SELECT 1 FROM {$this->table} WHERE {$field} = :value AND vigencia = 1";
        $params = [':value' => $value];

        if ($excludeId) {
            $sql .= " AND {$this->primaryKey} != :excludeId";
            $params[':excludeId'] = $excludeId;
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return !$stmt->fetch();
    }

    // Registra cambios en historial_modificaciones
    protected function registerHistory(string $registroId, array $before, array $after, string $action, ?string $userId): void
    {
        $excluded = ['created_at', 'updated_at', 'created_by', 'updated_by'];

        foreach ($before as $field => $oldValue) {
            if (in_array($field, $excluded, true)) continue;
            if (!array_key_exists($field, $after)) continue;

            $newValue = $after[$field];

            if ((string)$oldValue !== (string)$newValue) {
                $histId = UUID::generate();
                $sql = "INSERT INTO historial_modificaciones (id, tabla_afectada, registro_id, campo_modificado, valor_anterior, valor_nuevo, accion, usuario_id)
                        VALUES (:id, :tabla, :registro_id, :campo, :valor_anterior, :valor_nuevo, :accion, :usuario_id)";
                $stmt = $this->db->prepare($sql);
                $stmt->execute([
                    ':id'             => $histId,
                    ':tabla'          => $this->table,
                    ':registro_id'    => $registroId,
                    ':campo'          => $field,
                    ':valor_anterior' => (string)$oldValue,
                    ':valor_nuevo'    => (string)$newValue,
                    ':accion'         => $action,
                    ':usuario_id'     => $userId,
                ]);
            }
        }
    }

    // Acceso directo al PDO para consultas custom
    public function getDb(): PDO
    {
        return $this->db;
    }
}
