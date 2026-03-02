<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\CursoNivel;
use App\Helpers\Validator;
use App\Helpers\Response;

class CursoNivelService
{
    private CursoNivel $model;

    public function __construct()
    {
        $this->model = new CursoNivel();
    }

    public function getAll(array $filters, int $page, int $limit): array
    {
        return $this->model->getAll($filters, $page, $limit);
    }

    public function getById(string $id): ?array
    {
        return $this->model->getById($id);
    }

    // Crea un curso/nivel validando unicidad de nombre
    public function create(array $data, ?string $userId): array
    {
        $validator = Validator::make($data, [
            'nombre'         => 'required|string|min:2|max:50',
            'valor_numerico' => 'required|integer',
        ]);

        if (!empty($validator->getErrors())) {
            Response::validationError($validator->getErrors());
        }

        if (!$this->model->isUnique('nombre', $data['nombre'])) {
            Response::error('El nombre de curso/nivel ya existe', 409);
        }

        return $this->model->create($data, $userId);
    }

    // Actualiza un curso/nivel
    public function update(string $id, array $data, ?string $userId): ?array
    {
        $validator = Validator::make($data, [
            'nombre'         => 'nullable|string|min:2|max:50',
            'valor_numerico' => 'nullable|integer',
        ]);

        if (!empty($validator->getErrors())) {
            Response::validationError($validator->getErrors());
        }

        if (isset($data['nombre']) && !$this->model->isUnique('nombre', $data['nombre'], $id)) {
            Response::error('El nombre de curso/nivel ya existe', 409);
        }

        return $this->model->update($id, $data, $userId);
    }

    public function softDelete(string $id, ?string $userId): bool
    {
        return $this->model->softDelete($id, $userId);
    }
}
