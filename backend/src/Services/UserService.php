<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use App\Helpers\Validator;
use App\Helpers\Response;

class UserService
{
    private User $model;

    public function __construct()
    {
        $this->model = new User();
    }

    // Lista usuarios con paginacion
    public function getAll(array $filters, int $page, int $limit): array
    {
        return $this->model->getAll($filters, $page, $limit);
    }

    // Obtiene usuario por UUID
    public function getById(string $id): ?array
    {
        return $this->model->getById($id);
    }

    // Crea un nuevo usuario validando reglas de negocio
    public function create(array $data, ?string $userId): array
    {
        $validator = Validator::make($data, [
            'nombre'             => 'required|string|min:2|max:100',
            'email'              => 'required|email|max:150',
            'password'           => 'required|string|min:6|max:255',
            'rol'                => 'required|in:Admin,Coordinador,Docente,Especialista',
            'limite_estudiantes' => 'nullable|integer|min:1',
            'limite_paci'        => 'nullable|integer|min:1',
        ]);

        if (!empty($validator->getErrors())) {
            Response::validationError($validator->getErrors());
        }

        if (!$this->model->isUnique('email', $data['email'])) {
            Response::error('El email ya esta registrado', 409);
        }

        $inactive = $this->model->findInactiveBy('email', $data['email']);
        if ($inactive) {
            $data['password'] = password_hash($data['password'], PASSWORD_BCRYPT);
            return $this->model->restoreAndUpdate($inactive['id'], $data, $userId);
        }

        $data['password'] = password_hash($data['password'], PASSWORD_BCRYPT);

        if (!isset($data['limite_estudiantes'])) {
            $data['limite_estudiantes'] = 5;
        }

        if (!isset($data['limite_paci'])) {
            $data['limite_paci'] = 50;
        }

        return $this->model->create($data, $userId);
    }

    // Actualiza un usuario existente
    public function update(string $id, array $data, ?string $userId): ?array
    {
        $validator = Validator::make($data, [
            'nombre'             => 'nullable|string|min:2|max:100',
            'email'              => 'nullable|email|max:150',
            'rol'                => 'nullable|in:Admin,Coordinador,Docente,Especialista',
            'limite_estudiantes' => 'nullable|integer|min:1',
            'limite_paci'        => 'nullable|integer|min:1',
        ]);

        if (!empty($validator->getErrors())) {
            Response::validationError($validator->getErrors());
        }

        if (isset($data['email']) && !$this->model->isUnique('email', $data['email'], $id)) {
            Response::error('El email ya esta registrado', 409);
        }

        if (isset($data['password'])) {
            $data['password'] = password_hash($data['password'], PASSWORD_BCRYPT);
        }

        return $this->model->update($id, $data, $userId);
    }

    // Desactiva un usuario (soft delete)
    public function softDelete(string $id, ?string $userId): bool
    {
        return $this->model->softDelete($id, $userId);
    }

    // Busca usuario por email (para autenticacion)
    public function findByEmail(string $email): ?array
    {
        $db   = $this->model->getDb();
        $sql  = "SELECT * FROM users WHERE email = :email AND vigencia = 1";
        $stmt = $db->prepare($sql);
        $stmt->execute([':email' => $email]);
        $result = $stmt->fetch();
        return $result ?: null;
    }
}
