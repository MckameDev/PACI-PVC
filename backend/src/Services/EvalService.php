<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Evaluacion;
use App\Models\CursoNivel;
use App\Helpers\Validator;
use App\Helpers\Response;

class EvalService
{
    private Evaluacion $model;
    private CursoNivel $cursoNivelModel;

    public function __construct()
    {
        $this->model           = new Evaluacion();
        $this->cursoNivelModel = new CursoNivel();
    }

    public function getAll(array $filters, int $page, int $limit): array
    {
        return $this->model->getAll($filters, $page, $limit);
    }

    public function getById(string $id): ?array
    {
        return $this->model->getById($id);
    }

    // Crea registro de evaluacion validando nivel FK
    public function create(array $data, ?string $userId): array
    {
        $validator = Validator::make($data, [
            'habilidad'           => 'required|string|max:255',
            'nivel_id'            => 'required|uuid',
            'tipo_adecuacion'     => 'required|string|max:50',
            'modalidad_sugerida'  => 'required|string',
            'instrumento_sugerido'=> 'required|string',
            'criterio_logro'      => 'required|string',
        ]);

        if (!empty($validator->getErrors())) {
            Response::validationError($validator->getErrors());
        }

        if (!$this->cursoNivelModel->exists($data['nivel_id'])) {
            Response::error('El nivel referenciado no existe', 404);
        }

        return $this->model->create($data, $userId);
    }

    public function update(string $id, array $data, ?string $userId): ?array
    {
        $validator = Validator::make($data, [
            'habilidad'           => 'nullable|string|max:255',
            'nivel_id'            => 'nullable|uuid',
            'tipo_adecuacion'     => 'nullable|string|max:50',
            'modalidad_sugerida'  => 'nullable|string',
            'instrumento_sugerido'=> 'nullable|string',
            'criterio_logro'      => 'nullable|string',
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
