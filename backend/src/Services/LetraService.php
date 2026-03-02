<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Letra;
use App\Helpers\Validator;
use App\Helpers\Response;

class LetraService
{
    private Letra $model;

    public function __construct()
    {
        $this->model = new Letra();
    }

    public function getAll(array $filters, int $page, int $limit): array
    {
        return $this->model->getAll($filters, $page, $limit);
    }

    public function getById(string $id): ?array
    {
        return $this->model->getById($id);
    }

    // Crea una letra validando unicidad
    public function create(array $data, ?string $userId): array
    {
        $validator = Validator::make($data, [
            'letra' => 'required|string|max:1',
        ]);

        if (!empty($validator->getErrors())) {
            Response::validationError($validator->getErrors());
        }

        $data['letra'] = strtoupper($data['letra']);

        if (!$this->model->isUnique('letra', $data['letra'])) {
            Response::error('La letra ya existe', 409);
        }

        return $this->model->create($data, $userId);
    }

    // Actualiza una letra
    public function update(string $id, array $data, ?string $userId): ?array
    {
        $validator = Validator::make($data, [
            'letra' => 'nullable|string|max:1',
        ]);

        if (!empty($validator->getErrors())) {
            Response::validationError($validator->getErrors());
        }

        if (isset($data['letra'])) {
            $data['letra'] = strtoupper($data['letra']);
            if (!$this->model->isUnique('letra', $data['letra'], $id)) {
                Response::error('La letra ya existe', 409);
            }
        }

        return $this->model->update($id, $data, $userId);
    }

    public function softDelete(string $id, ?string $userId): bool
    {
        return $this->model->softDelete($id, $userId);
    }
}
