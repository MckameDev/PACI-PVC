<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Apoderado;
use App\Models\Estudiante;
use App\Helpers\Validator;
use App\Helpers\Response;

class ApoderadoService
{
    private Apoderado $model;
    private Estudiante $estudianteModel;

    public function __construct()
    {
        $this->model = new Apoderado();
        $this->estudianteModel = new Estudiante();
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
            'estudiante_id' => 'required|uuid',
            'nombre'        => 'required|string|min:2|max:200',
            'rut'           => 'nullable|string|max:20',
            'parentesco'    => 'nullable|string|max:100',
            'telefono'      => 'nullable|string|max:50',
            'email'         => 'nullable|string|max:150',
            'direccion'     => 'nullable|string|max:255',
            'es_principal'  => 'nullable|boolean',
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
            'nombre'       => 'nullable|string|min:2|max:200',
            'rut'          => 'nullable|string|max:20',
            'parentesco'   => 'nullable|string|max:100',
            'telefono'     => 'nullable|string|max:50',
            'email'        => 'nullable|string|max:150',
            'direccion'    => 'nullable|string|max:255',
            'es_principal' => 'nullable|boolean',
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
