<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\DiagnosticoCore;
use App\Helpers\Validator;
use App\Helpers\Response;

class DiagnosticoCoreService
{
    private DiagnosticoCore $model;

    public function __construct()
    {
        $this->model = new DiagnosticoCore();
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
            'estudiante_id'       => 'required|uuid',
            'curso'               => 'nullable|string|max:50',
            'eje'                 => 'nullable|string|max:100',
            'habilidad_observada' => 'nullable|string',
            'core_sugerido'       => 'nullable|string|max:50',
            'orden'               => 'nullable|integer',
        ]);

        if (!empty($validator->getErrors())) {
            Response::validationError($validator->getErrors());
        }

        return $this->model->create($data, $userId);
    }

    public function update(string $id, array $data, ?string $userId): ?array
    {
        $validator = Validator::make($data, [
            'estudiante_id'       => 'nullable|uuid',
            'curso'               => 'nullable|string|max:50',
            'eje'                 => 'nullable|string|max:100',
            'habilidad_observada' => 'nullable|string',
            'core_sugerido'       => 'nullable|string|max:50',
            'orden'               => 'nullable|integer',
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
