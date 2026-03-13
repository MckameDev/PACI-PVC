<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\SaludEstudiante;
use App\Models\Estudiante;
use App\Helpers\Validator;
use App\Helpers\Response;

class SaludEstudianteService
{
    private SaludEstudiante $model;
    private Estudiante $estudianteModel;

    public function __construct()
    {
        $this->model = new SaludEstudiante();
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
            'estudiante_id'     => 'required|uuid',
            'tipo_registro'     => 'required|in:Diagnostico,Tratamiento,Medicacion,Terapia,Control,Otro',
            'descripcion'       => 'required|string',
            'profesional'       => 'nullable|string|max:200',
            'fecha'             => 'nullable|date',
            'documento_adjunto' => 'nullable|string|max:500',
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
            'tipo_registro'     => 'nullable|in:Diagnostico,Tratamiento,Medicacion,Terapia,Control,Otro',
            'descripcion'       => 'nullable|string',
            'profesional'       => 'nullable|string|max:200',
            'fecha'             => 'nullable|date',
            'documento_adjunto' => 'nullable|string|max:500',
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
