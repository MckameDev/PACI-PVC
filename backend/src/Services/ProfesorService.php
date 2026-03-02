<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Profesor;
use App\Models\User;
use App\Models\Establecimiento;
use App\Helpers\Validator;
use App\Helpers\Response;

class ProfesorService
{
    private Profesor $model;
    private User $userModel;
    private Establecimiento $establecimientoModel;

    public function __construct()
    {
        $this->model                 = new Profesor();
        $this->userModel             = new User();
        $this->establecimientoModel  = new Establecimiento();
    }

    // Lista profesores con datos de usuario y establecimiento
    public function getAll(array $filters, int $page, int $limit): array
    {
        $db      = $this->model->getDb();
        $where   = ['p.vigencia = 1'];
        $params  = [];

        if (!empty($filters['establecimiento_id'])) {
            $where[]                         = 'p.establecimiento_id = :establecimiento_id';
            $params[':establecimiento_id']   = $filters['establecimiento_id'];
        }

        $whereStr = implode(' AND ', $where);
        $offset   = ($page - 1) * $limit;

        $countSql  = "SELECT COUNT(*) as total FROM profesores p WHERE {$whereStr}";
        $countStmt = $db->prepare($countSql);
        $countStmt->execute($params);
        $total = (int) $countStmt->fetch()['total'];

        $sql = "SELECT p.*, u.nombre as usuario_nombre, u.email as usuario_email,
                       e.nombre as establecimiento_nombre
                FROM profesores p
                LEFT JOIN users u ON u.id = p.user_id
                LEFT JOIN establecimientos e ON e.id = p.establecimiento_id
                WHERE {$whereStr}
                ORDER BY p.created_at DESC
                LIMIT :limit OFFSET :offset";

        $stmt = $db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
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
        $db  = $this->model->getDb();
        $sql = "SELECT p.*, u.nombre as usuario_nombre, u.email as usuario_email,
                       e.nombre as establecimiento_nombre
                FROM profesores p
                LEFT JOIN users u ON u.id = p.user_id
                LEFT JOIN establecimientos e ON e.id = p.establecimiento_id
                WHERE p.id = :id AND p.vigencia = 1";
        $stmt = $db->prepare($sql);
        $stmt->execute([':id' => $id]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    // Crea un profesor validando FKs
    public function create(array $data, ?string $userId): array
    {
        $validator = Validator::make($data, [
            'user_id'            => 'required|uuid',
            'establecimiento_id' => 'required|uuid',
            'especialidad'       => 'nullable|string|max:150',
            'cargo'              => 'nullable|string|max:100',
        ]);

        if (!empty($validator->getErrors())) {
            Response::validationError($validator->getErrors());
        }

        if (!$this->userModel->exists($data['user_id'])) {
            Response::error('El usuario referenciado no existe', 404);
        }

        if (!$this->establecimientoModel->exists($data['establecimiento_id'])) {
            Response::error('El establecimiento referenciado no existe', 404);
        }

        return $this->model->create($data, $userId);
    }

    // Actualiza un profesor
    public function update(string $id, array $data, ?string $userId): ?array
    {
        $validator = Validator::make($data, [
            'user_id'            => 'nullable|uuid',
            'establecimiento_id' => 'nullable|uuid',
            'especialidad'       => 'nullable|string|max:150',
            'cargo'              => 'nullable|string|max:100',
        ]);

        if (!empty($validator->getErrors())) {
            Response::validationError($validator->getErrors());
        }

        if (isset($data['user_id']) && !$this->userModel->exists($data['user_id'])) {
            Response::error('El usuario referenciado no existe', 404);
        }

        if (isset($data['establecimiento_id']) && !$this->establecimientoModel->exists($data['establecimiento_id'])) {
            Response::error('El establecimiento referenciado no existe', 404);
        }

        return $this->model->update($id, $data, $userId);
    }

    public function softDelete(string $id, ?string $userId): bool
    {
        return $this->model->softDelete($id, $userId);
    }
}
