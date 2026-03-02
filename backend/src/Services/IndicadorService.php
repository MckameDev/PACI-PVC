<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Indicador;
use App\Models\Oa;
use App\Helpers\Validator;
use App\Helpers\Response;
use PDO;

class IndicadorService
{
    private Indicador $model;
    private Oa $oaModel;

    public function __construct()
    {
        $this->model   = new Indicador();
        $this->oaModel = new Oa();
    }

    // Lista indicadores con datos del OA
    public function getAll(array $filters, int $page, int $limit): array
    {
        $db     = $this->model->getDb();
        $where  = ['i.vigencia = 1'];
        $params = [];

        if (!empty($filters['oa_id'])) {
            $where[]           = 'i.oa_id = :oa_id';
            $params[':oa_id']  = $filters['oa_id'];
        }

        $whereStr = implode(' AND ', $where);
        $offset   = ($page - 1) * $limit;

        $countSql  = "SELECT COUNT(*) as total FROM indicadores_db i WHERE {$whereStr}";
        $countStmt = $db->prepare($countSql);
        $countStmt->execute($params);
        $total = (int) $countStmt->fetch()['total'];

        $sql = "SELECT i.*, o.id_oa as oa_codigo, o.texto_oa
                FROM indicadores_db i
                LEFT JOIN oa_db o ON o.id = i.oa_id
                WHERE {$whereStr}
                ORDER BY i.created_at DESC
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

    // Crea un indicador validando que el OA exista
    public function create(array $data, ?string $userId): array
    {
        $validator = Validator::make($data, [
            'oa_id'            => 'required|uuid',
            'nivel_desempeno'  => 'required|string|max:50',
            'texto_indicador'  => 'required|string',
        ]);

        if (!empty($validator->getErrors())) {
            Response::validationError($validator->getErrors());
        }

        if (!$this->oaModel->exists($data['oa_id'])) {
            Response::error('El OA referenciado no existe', 404);
        }

        return $this->model->create($data, $userId);
    }

    public function update(string $id, array $data, ?string $userId): ?array
    {
        $validator = Validator::make($data, [
            'oa_id'            => 'nullable|uuid',
            'nivel_desempeno'  => 'nullable|string|max:50',
            'texto_indicador'  => 'nullable|string',
        ]);

        if (!empty($validator->getErrors())) {
            Response::validationError($validator->getErrors());
        }

        if (isset($data['oa_id']) && !$this->oaModel->exists($data['oa_id'])) {
            Response::error('El OA referenciado no existe', 404);
        }

        return $this->model->update($id, $data, $userId);
    }

    public function softDelete(string $id, ?string $userId): bool
    {
        return $this->model->softDelete($id, $userId);
    }
}
