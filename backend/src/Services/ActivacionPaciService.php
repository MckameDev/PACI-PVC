<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\ActivacionPaci;
use App\Helpers\Validator;
use App\Helpers\Response;

class ActivacionPaciService
{
    private ActivacionPaci $model;

    public function __construct()
    {
        $this->model = new ActivacionPaci();
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
            'habilidad_detectada' => 'nullable|string|max:150',
            'eje'                 => 'nullable|string|max:100',
            'core_nivel'          => 'nullable|string|max:50',
            'id_oa'               => 'nullable|string|max:50',
            'estrategia'          => 'nullable|string|max:255',
            'adecuacion'          => 'nullable|string|max:255',
            'actividad'           => 'nullable|string',
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
            'habilidad_detectada' => 'nullable|string|max:150',
            'eje'                 => 'nullable|string|max:100',
            'core_nivel'          => 'nullable|string|max:50',
            'id_oa'               => 'nullable|string|max:50',
            'estrategia'          => 'nullable|string|max:255',
            'adecuacion'          => 'nullable|string|max:255',
            'actividad'           => 'nullable|string',
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
