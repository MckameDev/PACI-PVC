<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Establecimiento;
use App\Helpers\Validator;
use App\Helpers\Response;

class EstablecimientoService
{
    private Establecimiento $model;

    public function __construct()
    {
        $this->model = new Establecimiento();
    }

    public function getAll(array $filters, int $page, int $limit): array
    {
        return $this->model->getAll($filters, $page, $limit);
    }

    public function getById(string $id): ?array
    {
        return $this->model->getById($id);
    }

    // Crea un establecimiento validando unicidad de codigo
    public function create(array $data, ?string $userId): array
    {
        $validator = Validator::make($data, [
            'nombre'   => 'required|string|min:2|max:200',
            'codigo'   => 'nullable|string|max:50',
            'direccion'=> 'nullable|string|max:255',
            'comuna'   => 'nullable|string|max:100',
            'region'   => 'nullable|string|max:100',
        ]);

        if (!empty($validator->getErrors())) {
            Response::validationError($validator->getErrors());
        }

        if (!empty($data['codigo']) && !$this->model->isUnique('codigo', $data['codigo'])) {
            Response::error('El codigo de establecimiento ya existe', 409);
        }

        return $this->model->create($data, $userId);
    }

    // Actualiza un establecimiento
    public function update(string $id, array $data, ?string $userId): ?array
    {
        $validator = Validator::make($data, [
            'nombre'   => 'nullable|string|min:2|max:200',
            'codigo'   => 'nullable|string|max:50',
            'direccion'=> 'nullable|string|max:255',
            'comuna'   => 'nullable|string|max:100',
            'region'   => 'nullable|string|max:100',
        ]);

        if (!empty($validator->getErrors())) {
            Response::validationError($validator->getErrors());
        }

        if (isset($data['codigo']) && !$this->model->isUnique('codigo', $data['codigo'], $id)) {
            Response::error('El codigo de establecimiento ya existe', 409);
        }

        return $this->model->update($id, $data, $userId);
    }

    public function softDelete(string $id, ?string $userId): bool
    {
        return $this->model->softDelete($id, $userId);
    }
}
