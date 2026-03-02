<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Expediente;
use App\Models\Estudiante;
use App\Helpers\Validator;
use App\Helpers\Response;
use PDO;

class ExpedienteService
{
    private Expediente $model;
    private Estudiante $estudianteModel;

    public function __construct()
    {
        $this->model            = new Expediente();
        $this->estudianteModel  = new Estudiante();
    }

    // Lista expedientes con datos del estudiante
    public function getAll(array $filters, int $page, int $limit): array
    {
        $db     = $this->model->getDb();
        $where  = ['exp.vigencia = 1'];
        $params = [];

        if (!empty($filters['estudiante_id'])) {
            $where[]                   = 'exp.estudiante_id = :estudiante_id';
            $params[':estudiante_id']  = $filters['estudiante_id'];
        }
        if (!empty($filters['estado'])) {
            $where[]            = 'exp.estado = :estado';
            $params[':estado']  = $filters['estado'];
        }

        $whereStr = implode(' AND ', $where);
        $offset   = ($page - 1) * $limit;

        $countSql  = "SELECT COUNT(*) as total FROM expediente_pie exp WHERE {$whereStr}";
        $countStmt = $db->prepare($countSql);
        $countStmt->execute($params);
        $total = (int) $countStmt->fetch()['total'];

        $sql = "SELECT exp.*, e.nombre_completo as estudiante_nombre
                FROM expediente_pie exp
                LEFT JOIN estudiantes e ON e.id = exp.estudiante_id
                WHERE {$whereStr}
                ORDER BY exp.created_at DESC
                LIMIT :limit OFFSET :offset";

        $stmt = $db->prepare($sql);
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

    // Crea un expediente validando que el estudiante exista
    public function create(array $data, ?string $userId): array
    {
        $validator = Validator::make($data, [
            'estudiante_id'  => 'required|uuid',
            'tipo_documento' => 'required|string|max:100',
            'descripcion'    => 'nullable|string',
            'ruta_archivo'   => 'nullable|string|max:500',
            'estado'         => 'nullable|in:Pendiente,Completo,Revisado',
            'fecha_documento'=> 'nullable|date',
        ]);

        if (!empty($validator->getErrors())) {
            Response::validationError($validator->getErrors());
        }

        if (!$this->estudianteModel->exists($data['estudiante_id'])) {
            Response::error('El estudiante referenciado no existe', 404);
        }

        return $this->model->create($data, $userId);
    }

    public function update(string $id, array $data, ?string $userId): ?array
    {
        $validator = Validator::make($data, [
            'tipo_documento' => 'nullable|string|max:100',
            'descripcion'    => 'nullable|string',
            'ruta_archivo'   => 'nullable|string|max:500',
            'estado'         => 'nullable|in:Pendiente,Completo,Revisado',
            'fecha_documento'=> 'nullable|date',
        ]);

        if (!empty($validator->getErrors())) {
            Response::validationError($validator->getErrors());
        }

        return $this->model->update($id, $data, $userId);
    }

    public function softDelete(string $id, ?string $userId): bool
    {
        return $this->model->softDelete($id, $userId);
    }
}
