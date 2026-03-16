<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\MatrizProgresion;
use App\Helpers\Validator;
use App\Helpers\Response;

class MatrizProgresionService
{
    private MatrizProgresion $model;

    public function __construct()
    {
        $this->model = new MatrizProgresion();
    }

    public function getAll(array $filters, int $page, int $limit): array
    {
        return $this->model->getAll($filters, $page, $limit);
    }

    public function getById(string $id): ?array
    {
        return $this->model->getById($id);
    }

    public function create(array $data, ?string $userId): array
    {
        $validator = Validator::make($data, [
            'asignatura'       => 'nullable|string|max:100',
            'eje'              => 'nullable|string|max:100',
            'core_nivel'       => 'nullable|string|max:50',
            'nivel_curricular' => 'nullable|string|max:50',
            'id_oa'            => 'nullable|string|max:50',
            'habilidad_clave'  => 'nullable|string|max:255',
            'orden'            => 'nullable|integer',
        ]);

        if (!empty($validator->getErrors())) {
            Response::validationError($validator->getErrors());
        }

        return $this->model->create($data, $userId);
    }

    public function update(string $id, array $data, ?string $userId): ?array
    {
        $validator = Validator::make($data, [
            'asignatura'       => 'nullable|string|max:100',
            'eje'              => 'nullable|string|max:100',
            'core_nivel'       => 'nullable|string|max:50',
            'nivel_curricular' => 'nullable|string|max:50',
            'id_oa'            => 'nullable|string|max:50',
            'habilidad_clave'  => 'nullable|string|max:255',
            'orden'            => 'nullable|integer',
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
