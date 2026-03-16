<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\ProgresionCurricular;
use App\Helpers\Validator;
use App\Helpers\Response;

class ProgresionCurricularService
{
    private ProgresionCurricular $model;

    public function __construct()
    {
        $this->model = new ProgresionCurricular();
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
            'habilidad'      => 'nullable|string|max:150',
            'nivel_core'     => 'nullable|string|max:50',
            'nivel_sugerido' => 'nullable|string|max:50',
            'eje'            => 'nullable|string|max:100',
            'descripcion'    => 'nullable|string',
            'orden'          => 'nullable|integer',
        ]);

        if (!empty($validator->getErrors())) {
            Response::validationError($validator->getErrors());
        }

        return $this->model->create($data, $userId);
    }

    public function update(string $id, array $data, ?string $userId): ?array
    {
        $validator = Validator::make($data, [
            'habilidad'      => 'nullable|string|max:150',
            'nivel_core'     => 'nullable|string|max:50',
            'nivel_sugerido' => 'nullable|string|max:50',
            'eje'            => 'nullable|string|max:100',
            'descripcion'    => 'nullable|string',
            'orden'          => 'nullable|integer',
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
