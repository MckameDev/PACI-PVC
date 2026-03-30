<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Oa;
use App\Models\Asignatura;
use App\Models\CursoNivel;
use App\Helpers\Validator;
use App\Helpers\Response;
use PDO;

class OaService
{
    private Oa $model;
    private Asignatura $asignaturaModel;
    private CursoNivel $cursoNivelModel;

    public function __construct()
    {
        $this->model            = new Oa();
        $this->asignaturaModel  = new Asignatura();
        $this->cursoNivelModel  = new CursoNivel();
    }

    // Lista OAs con datos de asignatura y nivel
    public function getAll(array $filters, int $page, int $limit): array
    {
        $db     = $this->model->getDb();
        $where  = ['o.vigencia = 1'];
        $params = [];

        if (!empty($filters['asignatura_id'])) {
            $where[]                  = 'o.asignatura_id = :asignatura_id';
            $params[':asignatura_id'] = $filters['asignatura_id'];
        }
        if (!empty($filters['nivel_trabajo_id'])) {
            $where[]                     = 'o.nivel_trabajo_id = :nivel_trabajo_id';
            $params[':nivel_trabajo_id'] = $filters['nivel_trabajo_id'];
        }
        if (!empty($filters['tipo_oa'])) {
            $where[]             = 'o.tipo_oa = :tipo_oa';
            $params[':tipo_oa']  = $filters['tipo_oa'];
        }
        if (!empty($filters['eje'])) {
            $where[]          = 'o.eje = :eje';
            $params[':eje']   = $filters['eje'];
        }

        $whereStr = implode(' AND ', $where);
        $offset   = ($page - 1) * $limit;

        $countSql  = "SELECT COUNT(*) as total FROM oa_db o WHERE {$whereStr}";
        $countStmt = $db->prepare($countSql);
        $countStmt->execute($params);
        $total = (int) $countStmt->fetch()['total'];

        $sql = "SELECT o.*, a.nombre as asignatura_nombre, cn.nombre as nivel_nombre
                FROM oa_db o
                LEFT JOIN asignaturas a ON a.id = o.asignatura_id
                LEFT JOIN cursos_niveles cn ON cn.id = o.nivel_trabajo_id
                WHERE {$whereStr}
                ORDER BY o.id_oa ASC
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

    public function getById(string $id): ?array
    {
        $db  = $this->model->getDb();
        $sql = "SELECT o.*, a.nombre as asignatura_nombre, cn.nombre as nivel_nombre
                FROM oa_db o
                LEFT JOIN asignaturas a ON a.id = o.asignatura_id
                LEFT JOIN cursos_niveles cn ON cn.id = o.nivel_trabajo_id
                WHERE o.id = :id AND o.vigencia = 1";
        $stmt = $db->prepare($sql);
        $stmt->execute([':id' => $id]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    // Crea un OA validando FKs y unicidad de id_oa
    public function create(array $data, ?string $userId): array
    {
        $validator = Validator::make($data, [
            'id_oa'                   => 'required|string|max:50',
            'asignatura_id'           => 'required|uuid',
            'nivel_trabajo_id'        => 'required|uuid',
            'eje'                     => 'nullable|string|max:100',
            'eje_id'                  => 'nullable|uuid',
            'tipo_oa'                 => 'nullable|string|max:50',
            'codigo_oa'               => 'nullable|string|max:50',
            'texto_oa'                => 'required|string',
            'habilidad_core'          => 'nullable|string|max:255',
            'es_habilidad_estructural'=> 'nullable|boolean',
        ]);

        if (!empty($validator->getErrors())) {
            Response::validationError($validator->getErrors());
        }

        if (!$this->model->isUnique('id_oa', $data['id_oa'])) {
            Response::error('El codigo id_oa ya existe', 409);
        }

        $inactive = $this->model->findInactiveBy('id_oa', $data['id_oa']);
        if ($inactive) {
            return $this->model->restoreAndUpdate($inactive['id'], $data, $userId);
        }

        if (!$this->asignaturaModel->exists($data['asignatura_id'])) {
            Response::error('La asignatura referenciada no existe', 404);
        }

        if (!$this->cursoNivelModel->exists($data['nivel_trabajo_id'])) {
            Response::error('El nivel referenciado no existe', 404);
        }

        return $this->model->create($data, $userId);
    }

    public function update(string $id, array $data, ?string $userId): ?array
    {
        $validator = Validator::make($data, [
            'id_oa'                   => 'nullable|string|max:50',
            'asignatura_id'           => 'nullable|uuid',
            'nivel_trabajo_id'        => 'nullable|uuid',
            'eje'                     => 'nullable|string|max:100',
            'eje_id'                  => 'nullable|uuid',
            'tipo_oa'                 => 'nullable|string|max:50',
            'codigo_oa'               => 'nullable|string|max:50',
            'texto_oa'                => 'nullable|string',
            'habilidad_core'          => 'nullable|string|max:255',
            'es_habilidad_estructural'=> 'nullable|boolean',
        ]);

        if (!empty($validator->getErrors())) {
            Response::validationError($validator->getErrors());
        }

        if (isset($data['id_oa']) && !$this->model->isUnique('id_oa', $data['id_oa'], $id)) {
            Response::error('El codigo id_oa ya existe', 409);
        }

        return $this->model->update($id, $data, $userId);
    }

    public function softDelete(string $id, ?string $userId): bool
    {
        return $this->model->softDelete($id, $userId);
    }

    // Retorna ejes para una asignatura — combina catálogo de ejes + texto libre en oa_db
    public function getEjes(string $asignaturaId): array
    {
        $db = $this->model->getDb();
        $ejesMap = [];

        // 1. Ejes desde catálogo formal
        $sqlCat = "SELECT id, nombre as eje FROM ejes
                   WHERE asignatura_id = :asignatura_id AND vigencia = 1
                   ORDER BY nombre ASC";
        $stmtCat = $db->prepare($sqlCat);
        $stmtCat->execute([':asignatura_id' => $asignaturaId]);
        $catalogEjes = $stmtCat->fetchAll(PDO::FETCH_ASSOC);

        foreach ($catalogEjes as $e) {
            $ejesMap[$e['eje']] = $e;
        }

        // 2. Ejes desde texto libre en oa_db (complementa el catálogo)
        $sql = "SELECT DISTINCT eje FROM oa_db
                WHERE asignatura_id = :asignatura_id AND eje IS NOT NULL AND eje != '' AND vigencia = 1
                ORDER BY eje ASC";
        $stmt = $db->prepare($sql);
        $stmt->execute([':asignatura_id' => $asignaturaId]);
        $oaEjes = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($oaEjes as $e) {
            if (!isset($ejesMap[$e['eje']])) {
                $ejesMap[$e['eje']] = ['eje' => $e['eje']];
            }
        }

        return array_values($ejesMap);
    }
}
