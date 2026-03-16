<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use App\Models\Establecimiento;
use App\Models\Profesor;
use App\Helpers\Validator;
use App\Helpers\Response;
use PDO;

class UserService
{
    private User $model;
    private Establecimiento $establecimientoModel;

    public function __construct()
    {
        $this->model = new User();
        $this->establecimientoModel = new Establecimiento();
    }

    // Lista usuarios con paginacion y JOIN a establecimientos
    public function getAll(array $filters, int $page, int $limit): array
    {
        $db      = $this->model->getDb();
        $where   = ['u.vigencia = 1'];
        $params  = [];

        if (!empty($filters['rol'])) {
            $where[]          = 'u.rol = :rol';
            $params[':rol']   = $filters['rol'];
        }
        if (!empty($filters['establecimiento_id'])) {
            $where[]                         = 'u.establecimiento_id = :establecimiento_id';
            $params[':establecimiento_id']   = $filters['establecimiento_id'];
        }

        $whereStr = implode(' AND ', $where);
        $offset   = ($page - 1) * $limit;

        $countSql  = "SELECT COUNT(*) as total FROM users u WHERE {$whereStr}";
        $countStmt = $db->prepare($countSql);
        $countStmt->execute($params);
        $total = (int) $countStmt->fetch()['total'];

        $sql = "SELECT u.id, u.nombre, u.email, u.rol, u.establecimiento_id,
                       u.limite_estudiantes, u.limite_paci, u.vigencia,
                       u.created_at, u.updated_at,
                       e.nombre as establecimiento_nombre
                FROM users u
                LEFT JOIN establecimientos e ON e.id = u.establecimiento_id
                WHERE {$whereStr}
                ORDER BY u.created_at DESC
                LIMIT :limit OFFSET :offset";

        $stmt = $db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return [
            'items'       => $stmt->fetchAll(),
            'total'       => $total,
            'page'        => $page,
            'limit'       => $limit,
            'total_pages' => (int) ceil($total / $limit),
        ];
    }

    // Obtiene usuario por UUID con establecimiento
    public function getById(string $id): ?array
    {
        $db  = $this->model->getDb();
        $sql = "SELECT u.*, e.nombre as establecimiento_nombre
                FROM users u
                LEFT JOIN establecimientos e ON e.id = u.establecimiento_id
                WHERE u.id = :id AND u.vigencia = 1";
        $stmt = $db->prepare($sql);
        $stmt->execute([':id' => $id]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    // Crea un nuevo usuario validando reglas de negocio
    public function create(array $data, ?string $userId): array
    {
        $validator = Validator::make($data, [
            'nombre'             => 'required|string|min:2|max:100',
            'email'              => 'required|email|max:150',
            'password'           => 'required|string|min:6|max:255',
            'rol'                => 'required|in:Admin,Coordinador,Docente,Especialista',
            'establecimiento_id' => 'nullable|uuid',
            'limite_estudiantes' => 'nullable|integer|min:1',
            'limite_paci'        => 'nullable|integer|min:1',
        ]);

        if (!empty($validator->getErrors())) {
            Response::validationError($validator->getErrors());
        }

        // Validate establecimiento FK
        if (!empty($data['establecimiento_id']) && !$this->establecimientoModel->exists($data['establecimiento_id'])) {
            Response::error('El establecimiento referenciado no existe', 404);
        }

        if (!$this->model->isUnique('email', $data['email'])) {
            Response::error('El email ya esta registrado', 409);
        }

        // Extract profesor fields before creating user
        $profesorData = null;
        if (($data['rol'] ?? '') === 'Docente' || ($data['rol'] ?? '') === 'Especialista') {
            $profesorData = [
                'especialidad' => $data['profesor_especialidad'] ?? null,
                'cargo'        => $data['profesor_cargo'] ?? null,
            ];
        }
        unset($data['profesor_especialidad'], $data['profesor_cargo']);

        $inactive = $this->model->findInactiveBy('email', $data['email']);
        if ($inactive) {
            $data['password'] = password_hash($data['password'], PASSWORD_BCRYPT);
            $user = $this->model->restoreAndUpdate($inactive['id'], $data, $userId);
            // Auto-create profesor for Docente/Especialista
            if ($profesorData && !empty($data['establecimiento_id'])) {
                $this->ensureProfesor($user['id'], $data['establecimiento_id'], $profesorData, $userId);
            }
            return $user;
        }

        $data['password'] = password_hash($data['password'], PASSWORD_BCRYPT);

        if (!isset($data['limite_estudiantes'])) {
            $data['limite_estudiantes'] = 5;
        }
        if (!isset($data['limite_paci'])) {
            $data['limite_paci'] = 50;
        }

        $user = $this->model->create($data, $userId);

        // Auto-create profesor for Docente/Especialista
        if ($profesorData && !empty($data['establecimiento_id'])) {
            $this->ensureProfesor($user['id'], $data['establecimiento_id'], $profesorData, $userId);
        }

        return $user;
    }

    // Actualiza un usuario existente
    public function update(string $id, array $data, ?string $userId): ?array
    {
        $validator = Validator::make($data, [
            'nombre'             => 'nullable|string|min:2|max:100',
            'email'              => 'nullable|email|max:150',
            'rol'                => 'nullable|in:Admin,Coordinador,Docente,Especialista',
            'establecimiento_id' => 'nullable|uuid',
            'limite_estudiantes' => 'nullable|integer|min:1',
            'limite_paci'        => 'nullable|integer|min:1',
        ]);

        if (!empty($validator->getErrors())) {
            Response::validationError($validator->getErrors());
        }

        if (isset($data['email']) && !$this->model->isUnique('email', $data['email'], $id)) {
            Response::error('El email ya esta registrado', 409);
        }

        if (!empty($data['establecimiento_id']) && !$this->establecimientoModel->exists($data['establecimiento_id'])) {
            Response::error('El establecimiento referenciado no existe', 404);
        }

        if (isset($data['password'])) {
            $data['password'] = password_hash($data['password'], PASSWORD_BCRYPT);
        }

        // Extract profesor fields
        $profesorData = null;
        if (isset($data['profesor_especialidad']) || isset($data['profesor_cargo'])) {
            $profesorData = [
                'especialidad' => $data['profesor_especialidad'] ?? null,
                'cargo'        => $data['profesor_cargo'] ?? null,
            ];
        }
        unset($data['profesor_especialidad'], $data['profesor_cargo']);

        $user = $this->model->update($id, $data, $userId);

        // Update/create profesor if user is Docente/Especialista
        if ($user && $profesorData) {
            $estId = $data['establecimiento_id'] ?? $user['establecimiento_id'] ?? null;
            if ($estId) {
                $this->ensureProfesor($id, $estId, $profesorData, $userId);
            }
        }

        return $user;
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

    // Asegura que exista un registro en profesores para este usuario
    private function ensureProfesor(string $userIdRef, string $establecimientoId, array $extra, ?string $actorId): void
    {
        $db = $this->model->getDb();
        // Check if profesor already exists for this user
        $sql  = "SELECT id FROM profesores WHERE user_id = :uid AND vigencia = 1 LIMIT 1";
        $stmt = $db->prepare($sql);
        $stmt->execute([':uid' => $userIdRef]);
        $existing = $stmt->fetch();

        $profesorModel = new Profesor();

        if ($existing) {
            // Update existing profesor
            $profesorModel->update($existing['id'], array_merge($extra, [
                'establecimiento_id' => $establecimientoId,
            ]), $actorId);
        } else {
            // Create new profesor
            $profesorModel->create(array_merge($extra, [
                'user_id'            => $userIdRef,
                'establecimiento_id' => $establecimientoId,
            ]), $actorId);
        }
    }
}
