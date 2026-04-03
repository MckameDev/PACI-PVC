<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Estudiante;
use App\Models\User;
use App\Models\Establecimiento;
use App\Models\CursoNivel;
use App\Models\Letra;
use App\Helpers\Validator;
use App\Helpers\Response;
use PDO;

class EstudianteService
{
    private Estudiante $model;
    private User $userModel;
    private Establecimiento $establecimientoModel;
    private CursoNivel $cursoNivelModel;
    private Letra $letraModel;

    public function __construct()
    {
        $this->model                 = new Estudiante();
        $this->userModel             = new User();
        $this->establecimientoModel  = new Establecimiento();
        $this->cursoNivelModel       = new CursoNivel();
        $this->letraModel            = new Letra();
    }

    // Lista estudiantes con JOINs para mostrar nombres de relaciones
    public function getAll(array $filters, int $page, int $limit): array
    {
        $db      = $this->model->getDb();
        $where   = ['e.vigencia = 1'];
        $params  = [];

        if (!empty($filters['establecimiento_id'])) {
            $where[]                       = 'e.establecimiento_id = :establecimiento_id';
            $params[':establecimiento_id'] = $filters['establecimiento_id'];
        }
        if (!empty($filters['curso_nivel_id'])) {
            $where[]                    = 'e.curso_nivel_id = :curso_nivel_id';
            $params[':curso_nivel_id']  = $filters['curso_nivel_id'];
        }
        if (!empty($filters['tipo_nee'])) {
            $where[]              = 'e.tipo_nee = :tipo_nee';
            $params[':tipo_nee']  = $filters['tipo_nee'];
        }
        if (!empty($filters['rut'])) {
            $where[] = "REPLACE(REPLACE(LOWER(e.rut), '.', ''), '-', '') = :rut_normalized";
            $params[':rut_normalized'] = preg_replace('/[^0-9k]/', '', strtolower((string) $filters['rut']));
        }
        if (!empty($filters['nombre_completo'])) {
            $where[] = 'LOWER(e.nombre_completo) LIKE :nombre_completo';
            $params[':nombre_completo'] = '%' . strtolower((string) $filters['nombre_completo']) . '%';
        }
        if (!empty($filters['q'])) {
            $where[] = '(LOWER(e.nombre_completo) LIKE :q OR LOWER(e.rut) LIKE :q)';
            $params[':q'] = '%' . strtolower((string) $filters['q']) . '%';
        }

        $whereStr = implode(' AND ', $where);
        $offset   = ($page - 1) * $limit;

        $countSql  = "SELECT COUNT(*) as total FROM estudiantes e WHERE {$whereStr}";
        $countStmt = $db->prepare($countSql);
        $countStmt->execute($params);
        $total = (int) $countStmt->fetch()['total'];

        $sql = "SELECT e.*,
                       u.nombre as usuario_nombre,
                       est.nombre as establecimiento_nombre,
                       cn.nombre as curso_nivel_nombre,
                       cn.valor_numerico as curso_valor_numerico,
                       l.letra as letra_nombre
                FROM estudiantes e
                LEFT JOIN users u ON u.id = e.usuario_id
                LEFT JOIN establecimientos est ON est.id = e.establecimiento_id
                LEFT JOIN cursos_niveles cn ON cn.id = e.curso_nivel_id
                LEFT JOIN letras l ON l.id = e.letra_id
                WHERE {$whereStr}
                ORDER BY e.created_at DESC
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

    // Obtiene detalle completo de un estudiante con relaciones
    public function getById(string $id): ?array
    {
        $db  = $this->model->getDb();
        $sql = "SELECT e.*,
                       u.nombre as usuario_nombre,
                       est.nombre as establecimiento_nombre,
                       cn.nombre as curso_nivel_nombre,
                       cn.valor_numerico as curso_valor_numerico,
                       l.letra as letra_nombre
                FROM estudiantes e
                LEFT JOIN users u ON u.id = e.usuario_id
                LEFT JOIN establecimientos est ON est.id = e.establecimiento_id
                LEFT JOIN cursos_niveles cn ON cn.id = e.curso_nivel_id
                LEFT JOIN letras l ON l.id = e.letra_id
                WHERE e.id = :id AND e.vigencia = 1";
        $stmt = $db->prepare($sql);
        $stmt->execute([':id' => $id]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    // Crea un estudiante validando FKs, RUT unico y limite de estudiantes
    public function create(array $data, ?string $userId): array
    {
        $validator = Validator::make($data, [
            'rut'                => 'required|string|max:20',
            'nombre_completo'    => 'required|string|min:2|max:150',
            'usuario_id'         => 'required|uuid',
            'establecimiento_id' => 'required|uuid',
            'curso_nivel_id'     => 'required|uuid',
            'letra_id'           => 'nullable|uuid',
            'diagnostico'        => 'nullable|string',
            'comorbilidad'       => 'nullable|string|max:255',
            'nivel_subtipo'      => 'nullable|string|max:100',
            'tipo_nee'           => 'required|in:NEET,NEEP',
        ]);

        if (!empty($validator->getErrors())) {
            Response::validationError($validator->getErrors());
        }

        if (!$this->model->isUnique('rut', $data['rut'])) {
            Response::error('El RUT ya esta registrado para un estudiante activo', 409);
        }

        $this->validateForeignKeys($data);
        $this->validateStudentLimit($data['usuario_id']);

        return $this->model->create($data, $userId);
    }

    // Actualiza un estudiante con validacion de FKs
    public function update(string $id, array $data, ?string $userId): ?array
    {
        $validator = Validator::make($data, [
            'rut'                => 'nullable|string|max:20',
            'nombre_completo'    => 'nullable|string|min:2|max:150',
            'usuario_id'         => 'nullable|uuid',
            'establecimiento_id' => 'nullable|uuid',
            'curso_nivel_id'     => 'nullable|uuid',
            'letra_id'           => 'nullable|uuid',
            'diagnostico'        => 'nullable|string',
            'comorbilidad'       => 'nullable|string|max:255',
            'nivel_subtipo'      => 'nullable|string|max:100',
            'tipo_nee'           => 'nullable|in:NEET,NEEP',
        ]);

        if (!empty($validator->getErrors())) {
            Response::validationError($validator->getErrors());
        }

        if (isset($data['rut']) && !$this->model->isUnique('rut', $data['rut'], $id)) {
            Response::error('El RUT ya esta registrado para un estudiante activo', 409);
        }

        $this->validateForeignKeys($data, true);

        return $this->model->update($id, $data, $userId);
    }

    // Soft delete de un estudiante + cascada a PACIs asociados
    public function softDelete(string $id, ?string $userId): bool
    {
        $db = $this->model->getDb();

        try {
            $db->beginTransaction();

            // Soft-delete all active PACIs linked to this student
            $sql = "UPDATE paci SET vigencia = 0, updated_at = NOW() WHERE estudiante_id = :eid AND vigencia = 1";
            $stmt = $db->prepare($sql);
            $stmt->execute([':eid' => $id]);

            // Soft-delete associated trayectoria & perfil_dua records
            $sql2 = "UPDATE paci_trayectoria pt
                      INNER JOIN paci p ON p.id = pt.paci_id
                      SET pt.vigencia = 0, pt.updated_at = NOW()
                      WHERE p.estudiante_id = :eid AND pt.vigencia = 1";
            $stmt2 = $db->prepare($sql2);
            $stmt2->execute([':eid' => $id]);

            $sql3 = "UPDATE perfil_dua pd
                      INNER JOIN paci p ON p.id = pd.paci_id
                      SET pd.vigencia = 0, pd.updated_at = NOW()
                      WHERE p.estudiante_id = :eid AND pd.vigencia = 1";
            $stmt3 = $db->prepare($sql3);
            $stmt3->execute([':eid' => $id]);

            // Soft-delete the student
            $result = $this->model->softDelete($id, $userId);

            $db->commit();
            return $result;
        } catch (\Throwable $e) {
            $db->rollBack();
            throw $e;
        }
    }

    // Verifica que las FKs existan y esten vigentes
    private function validateForeignKeys(array $data, bool $partial = false): void
    {
        $check = $partial ? 'isset' : 'array_key_exists';

        if (isset($data['usuario_id']) && !$this->userModel->exists($data['usuario_id'])) {
            Response::error('El usuario referenciado no existe', 404);
        }

        if (isset($data['establecimiento_id']) && !$this->establecimientoModel->exists($data['establecimiento_id'])) {
            Response::error('El establecimiento referenciado no existe', 404);
        }

        if (isset($data['curso_nivel_id']) && !$this->cursoNivelModel->exists($data['curso_nivel_id'])) {
            Response::error('El curso/nivel referenciado no existe', 404);
        }

        if (!empty($data['letra_id']) && !$this->letraModel->exists($data['letra_id'])) {
            Response::error('La letra referenciada no existe', 404);
        }
    }

    // Verifica que el usuario no exceda su limite de estudiantes
    private function validateStudentLimit(string $usuarioId): void
    {
        $user = $this->userModel->getById($usuarioId);
        if (!$user) return;

        $db   = $this->model->getDb();
        $sql  = "SELECT COUNT(*) as total FROM estudiantes WHERE usuario_id = :uid AND vigencia = 1";
        $stmt = $db->prepare($sql);
        $stmt->execute([':uid' => $usuarioId]);
        $count = (int) $stmt->fetch()['total'];

        if ($count >= (int) $user['limite_estudiantes']) {
            Response::error(
                "El usuario ha alcanzado su limite de {$user['limite_estudiantes']} estudiantes",
                409
            );
        }
    }
}
