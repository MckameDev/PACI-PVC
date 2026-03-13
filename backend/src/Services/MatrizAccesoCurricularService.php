<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\MatrizAccesoCurricular;
use App\Helpers\Validator;
use App\Helpers\Response;

class MatrizAccesoCurricularService
{
    private MatrizAccesoCurricular $model;

    public function __construct()
    {
        $this->model = new MatrizAccesoCurricular();
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
            'nombre'      => 'required|string|min:2|max:200',
            'descripcion' => 'nullable|string',
            'orden'       => 'nullable|integer',
        ]);

        if (!empty($validator->getErrors())) {
            Response::validationError($validator->getErrors());
        }

        if (!$this->model->isUnique('nombre', $data['nombre'])) {
            Response::error('El acceso curricular ya existe', 409);
        }

        $inactive = $this->model->findInactiveBy('nombre', $data['nombre']);
        if ($inactive) {
            return $this->model->restoreAndUpdate($inactive['id'], $data, $userId);
        }

        return $this->model->create($data, $userId);
    }

    public function update(string $id, array $data, ?string $userId): ?array
    {
        $validator = Validator::make($data, [
            'nombre'      => 'nullable|string|min:2|max:200',
            'descripcion' => 'nullable|string',
            'orden'       => 'nullable|integer',
        ]);

        if (!empty($validator->getErrors())) {
            Response::validationError($validator->getErrors());
        }

        if (isset($data['nombre']) && !$this->model->isUnique('nombre', $data['nombre'], $id)) {
            Response::error('El acceso curricular ya existe', 409);
        }

        return $this->model->update($id, $data, $userId);
    }

    public function softDelete(string $id, ?string $userId): bool
    {
        return $this->model->softDelete($id, $userId);
    }
}
