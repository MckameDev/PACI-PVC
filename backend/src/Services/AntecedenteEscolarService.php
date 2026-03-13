<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AntecedenteEscolar;
use App\Models\Estudiante;
use App\Helpers\Validator;
use App\Helpers\Response;

class AntecedenteEscolarService
{
    private AntecedenteEscolar $model;
    private Estudiante $estudianteModel;

    public function __construct()
    {
        $this->model = new AntecedenteEscolar();
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
            'estudiante_id'          => 'required|uuid',
            'anio'                   => 'required|string|max:10',
            'establecimiento_origen' => 'nullable|string|max:200',
            'curso'                  => 'nullable|string|max:100',
            'observaciones'          => 'nullable|string',
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
            'anio'                   => 'nullable|string|max:10',
            'establecimiento_origen' => 'nullable|string|max:200',
            'curso'                  => 'nullable|string|max:100',
            'observaciones'          => 'nullable|string',
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
