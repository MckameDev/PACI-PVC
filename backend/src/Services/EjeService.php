<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\Database;
use App\Models\Eje;
use App\Models\Asignatura;
use App\Helpers\UUID;
use App\Helpers\Validator;
use App\Helpers\Response;
use PDO;

class EjeService
{
    private Eje $model;
    private Asignatura $asignaturaModel;
    private PDO $db;

    public function __construct()
    {
        $this->model           = new Eje();
        $this->asignaturaModel = new Asignatura();
        $this->db              = Database::getInstance();
    }

    public function getAll(array $filters, int $page, int $limit): array
    {
        $where  = ['e.vigencia = 1'];
        $params = [];

        if (!empty($filters['asignatura_id'])) {
            $where[]                   = 'e.asignatura_id = :asignatura_id';
            $params[':asignatura_id']  = $filters['asignatura_id'];
        }

        $whereStr = implode(' AND ', $where);
        $offset   = ($page - 1) * $limit;

        $countSql  = "SELECT COUNT(*) as total FROM ejes e WHERE {$whereStr}";
        $countStmt = $this->db->prepare($countSql);
        $countStmt->execute($params);
        $total = (int) $countStmt->fetch()['total'];

        $sql = "SELECT e.*, a.nombre as asignatura_nombre
                FROM ejes e
                LEFT JOIN asignaturas a ON a.id = e.asignatura_id
                WHERE {$whereStr}
                ORDER BY a.nombre ASC, e.nombre ASC
                LIMIT :limit OFFSET :offset";

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

    public function getById(string $id): ?array
    {
        return $this->model->getById($id);
    }

    public function create(array $data, ?string $userId): array
    {
        $validator = Validator::make($data, [
            'asignatura_id' => 'required|uuid',
            'nombre'        => 'required|string|max:150',
        ]);

        if (!empty($validator->getErrors())) {
            Response::validationError($validator->getErrors());
        }

        if (!$this->asignaturaModel->exists($data['asignatura_id'])) {
            Response::error('La asignatura referenciada no existe', 404);
        }

        // Verificar unicidad compuesta
        $checkSql = "SELECT COUNT(*) as cnt FROM ejes WHERE asignatura_id = :asig AND nombre = :nombre AND vigencia = 1";
        $checkStmt = $this->db->prepare($checkSql);
        $checkStmt->execute([':asig' => $data['asignatura_id'], ':nombre' => $data['nombre']]);
        if ((int) $checkStmt->fetch()['cnt'] > 0) {
            Response::error('Ya existe un eje con ese nombre para esta asignatura', 409);
        }

        // Restaurar registro inactivo si existe con la misma combinación
        $inactiveSql = "SELECT * FROM ejes WHERE asignatura_id = :asig AND nombre = :nombre AND vigencia = 0 LIMIT 1";
        $inactiveStmt = $this->db->prepare($inactiveSql);
        $inactiveStmt->execute([':asig' => $data['asignatura_id'], ':nombre' => $data['nombre']]);
        $inactive = $inactiveStmt->fetch();
        if ($inactive) {
            return $this->model->restoreAndUpdate($inactive['id'], $data, $userId);
        }

        return $this->model->create($data, $userId);
    }

    public function update(string $id, array $data, ?string $userId): ?array
    {
        $validator = Validator::make($data, [
            'asignatura_id' => 'nullable|uuid',
            'nombre'        => 'nullable|string|max:150',
        ]);

        if (!empty($validator->getErrors())) {
            Response::validationError($validator->getErrors());
        }

        if (!empty($data['asignatura_id']) && !$this->asignaturaModel->exists($data['asignatura_id'])) {
            Response::error('La asignatura referenciada no existe', 404);
        }

        return $this->model->update($id, $data, $userId);
    }

    public function softDelete(string $id, ?string $userId): bool
    {
        return $this->model->softDelete($id, $userId);
    }
}
