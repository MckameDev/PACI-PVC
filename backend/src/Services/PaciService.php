<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\Database;
use App\Models\Paci;
use App\Models\Estudiante;
use App\Models\Oa;
use App\Models\CursoNivel;
use App\Helpers\UUID;
use App\Helpers\Validator;
use App\Helpers\Response;
use PDO;

class PaciService
{
    private Paci $model;
    private Estudiante $estudianteModel;
    private Oa $oaModel;
    private CursoNivel $cursoNivelModel;
    private PDO $db;

    public function __construct()
    {
        $this->model            = new Paci();
        $this->estudianteModel  = new Estudiante();
        $this->oaModel          = new Oa();
        $this->cursoNivelModel  = new CursoNivel();
        $this->db               = Database::getInstance();
    }

    // Lista PACIs con datos del estudiante
    public function getAll(array $filters, int $page, int $limit): array
    {
        $where  = ['p.vigencia = 1'];
        $params = [];

        if (!empty($filters['estudiante_id'])) {
            $where[]                   = 'p.estudiante_id = :estudiante_id';
            $params[':estudiante_id']  = $filters['estudiante_id'];
        }

        $whereStr = implode(' AND ', $where);
        $offset   = ($page - 1) * $limit;

        $countSql  = "SELECT COUNT(*) as total FROM paci p WHERE {$whereStr}";
        $countStmt = $this->db->prepare($countSql);
        $countStmt->execute($params);
        $total = (int) $countStmt->fetch()['total'];

        $sql = "SELECT p.*, e.nombre_completo as estudiante_nombre, e.rut as estudiante_rut,
                       u.nombre as usuario_nombre
                FROM paci p
                LEFT JOIN estudiantes e ON e.id = p.estudiante_id
                LEFT JOIN users u ON u.id = p.usuario_id
                WHERE {$whereStr}
                ORDER BY p.created_at DESC
                LIMIT :limit OFFSET :offset";

        $stmt = $this->db->prepare($sql);
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

    // Obtiene detalle completo de un PACI con trayectoria y perfil DUA
    public function getById(string $id): ?array
    {
        $sql = "SELECT p.*, e.nombre_completo as estudiante_nombre, e.rut as estudiante_rut,
                       e.diagnostico as estudiante_diagnostico, e.tipo_nee as estudiante_tipo_nee,
                       e.comorbilidad as estudiante_comorbilidad, e.nivel_subtipo as estudiante_nivel_subtipo,
                       cn.nombre as estudiante_curso, cn.valor_numerico as estudiante_curso_valor,
                       est.nombre as establecimiento_nombre, est.region as establecimiento_region,
                       est.comuna as establecimiento_comuna,
                       u.nombre as usuario_nombre, u.rol as usuario_rol
                FROM paci p
                LEFT JOIN estudiantes e ON e.id = p.estudiante_id
                LEFT JOIN cursos_niveles cn ON cn.id = e.curso_nivel_id
                LEFT JOIN establecimientos est ON est.id = e.establecimiento_id
                LEFT JOIN users u ON u.id = p.usuario_id
                WHERE p.id = :id AND p.vigencia = 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $id]);
        $paci = $stmt->fetch();

        if (!$paci) return null;

        $sqlTray = "SELECT pt.*, o.id_oa as oa_codigo, o.texto_oa, cn.nombre as nivel_nombre
                    FROM paci_trayectoria pt
                    LEFT JOIN oa_db o ON o.id = pt.oa_id
                    LEFT JOIN cursos_niveles cn ON cn.id = pt.nivel_trabajo_id
                    WHERE pt.paci_id = :paci_id AND pt.vigencia = 1";
        $stmtTray = $this->db->prepare($sqlTray);
        $stmtTray->execute([':paci_id' => $id]);
        $paci['trayectoria'] = $stmtTray->fetchAll();

        $sqlDua = "SELECT * FROM perfil_dua WHERE paci_id = :paci_id AND vigencia = 1 LIMIT 1";
        $stmtDua = $this->db->prepare($sqlDua);
        $stmtDua->execute([':paci_id' => $id]);
        $paci['perfil_dua'] = $stmtDua->fetch() ?: null;

        return $paci;
    }

    // Crea un PACI completo de forma transaccional (cabecera + trayectoria + DUA + expediente)
    public function crearPaciCompleto(array $data, ?string $userId): array
    {
        $validator = Validator::make($data, [
            'estudiante_id'   => 'required|uuid',
            'fecha_emision'   => 'required|date',
            'formato_generado'=> 'required|in:Compacto,Completo,Modular',
            'aplica_paec'     => 'nullable|boolean',
        ]);

        if (!empty($validator->getErrors())) {
            Response::validationError($validator->getErrors());
        }

        if (!$this->estudianteModel->exists($data['estudiante_id'])) {
            Response::error('El estudiante referenciado no existe', 404);
        }

        if (!empty($data['trayectoria']) && !is_array($data['trayectoria'])) {
            Response::error('El campo trayectoria debe ser un array', 400);
        }

        $this->db->beginTransaction();

        try {
            $paciId = UUID::generate();
            $sqlPaci = "INSERT INTO paci (id, estudiante_id, usuario_id, fecha_emision, formato_generado,
                        aplica_paec, paec_activadores, paec_estrategias, paec_desregulacion,
                        vigencia, created_by, updated_by)
                        VALUES (:id, :estudiante_id, :usuario_id, :fecha_emision, :formato_generado,
                        :aplica_paec, :paec_activadores, :paec_estrategias, :paec_desregulacion,
                        1, :created_by, :updated_by)";

            $stmtPaci = $this->db->prepare($sqlPaci);
            $stmtPaci->execute([
                ':id'                  => $paciId,
                ':estudiante_id'       => $data['estudiante_id'],
                ':usuario_id'          => $userId,
                ':fecha_emision'       => $data['fecha_emision'],
                ':formato_generado'    => $data['formato_generado'],
                ':aplica_paec'         => $data['aplica_paec'] ?? 0,
                ':paec_activadores'    => $data['paec_activadores'] ?? null,
                ':paec_estrategias'    => $data['paec_estrategias'] ?? null,
                ':paec_desregulacion'  => $data['paec_desregulacion'] ?? null,
                ':created_by'          => $userId,
                ':updated_by'          => $userId,
            ]);

            if (!empty($data['trayectoria'])) {
                $this->insertTrayectoria($paciId, $data['trayectoria'], $userId);
            }

            if (!empty($data['perfil_dua'])) {
                $this->insertPerfilDua($paciId, $data['perfil_dua'], $userId);
            }

            if (!empty($data['expediente_ids'])) {
                $this->marcarExpedientes($data['expediente_ids'], $userId);
            }

            $this->db->commit();

            return $this->getById($paciId);

        } catch (\Exception $e) {
            $this->db->rollBack();
            Response::error('Error al crear PACI: ' . $e->getMessage(), 500);
            return [];
        }
    }

    // Actualiza la cabecera del PACI
    public function update(string $id, array $data, ?string $userId): ?array
    {
        $validator = Validator::make($data, [
            'fecha_emision'      => 'nullable|date',
            'formato_generado'   => 'nullable|in:Compacto,Completo,Modular',
            'aplica_paec'        => 'nullable|boolean',
            'paec_activadores'   => 'nullable|string',
            'paec_estrategias'   => 'nullable|string',
            'paec_desregulacion' => 'nullable|string',
        ]);

        if (!empty($validator->getErrors())) {
            Response::validationError($validator->getErrors());
        }

        return $this->model->update($id, $data, $userId);
    }

    // Soft delete del PACI
    public function softDelete(string $id, ?string $userId): bool
    {
        return $this->model->softDelete($id, $userId);
    }

    // Inserta registros de trayectoria (detalle OA) del PACI
    private function insertTrayectoria(string $paciId, array $items, ?string $userId): void
    {
        $sql = "INSERT INTO paci_trayectoria (id, paci_id, oa_id, nivel_trabajo_id,
                diferencia_calculada, tipo_adecuacion, justificacion_tecnica,
                eval_modalidad, eval_instrumento, eval_criterio,
                vigencia, created_by, updated_by)
                VALUES (:id, :paci_id, :oa_id, :nivel_trabajo_id,
                :diferencia_calculada, :tipo_adecuacion, :justificacion_tecnica,
                :eval_modalidad, :eval_instrumento, :eval_criterio,
                1, :created_by, :updated_by)";

        $stmt = $this->db->prepare($sql);

        foreach ($items as $index => $item) {
            $validator = Validator::make($item, [
                'oa_id'                 => 'required|uuid',
                'nivel_trabajo_id'      => 'required|uuid',
                'diferencia_calculada'  => 'required|integer',
                'tipo_adecuacion'       => 'required|in:Acceso,Significativa',
            ]);

            if (!empty($validator->getErrors())) {
                throw new \RuntimeException(
                    "Error en trayectoria [{$index}]: " . json_encode($validator->getErrors())
                );
            }

            if (!$this->oaModel->exists($item['oa_id'])) {
                throw new \RuntimeException("OA no encontrado en trayectoria [{$index}]: {$item['oa_id']}");
            }

            if (!$this->cursoNivelModel->exists($item['nivel_trabajo_id'])) {
                throw new \RuntimeException("Nivel no encontrado en trayectoria [{$index}]: {$item['nivel_trabajo_id']}");
            }

            if ($item['tipo_adecuacion'] === 'Significativa' && empty($item['justificacion_tecnica'])) {
                throw new \RuntimeException("Justificacion tecnica obligatoria para adecuacion Significativa en trayectoria [{$index}]");
            }

            $stmt->execute([
                ':id'                     => UUID::generate(),
                ':paci_id'                => $paciId,
                ':oa_id'                  => $item['oa_id'],
                ':nivel_trabajo_id'       => $item['nivel_trabajo_id'],
                ':diferencia_calculada'   => $item['diferencia_calculada'],
                ':tipo_adecuacion'        => $item['tipo_adecuacion'],
                ':justificacion_tecnica'  => $item['justificacion_tecnica'] ?? null,
                ':eval_modalidad'         => $item['eval_modalidad'] ?? null,
                ':eval_instrumento'       => $item['eval_instrumento'] ?? null,
                ':eval_criterio'          => $item['eval_criterio'] ?? null,
                ':created_by'             => $userId,
                ':updated_by'             => $userId,
            ]);
        }
    }

    // Inserta el perfil DUA asociado al PACI
    private function insertPerfilDua(string $paciId, array $dua, ?string $userId): void
    {
        $sql = "INSERT INTO perfil_dua (id, paci_id, fortalezas, barreras,
                preferencias_representacion, preferencias_expresion, preferencias_motivacion,
                vigencia, created_by, updated_by)
                VALUES (:id, :paci_id, :fortalezas, :barreras,
                :preferencias_representacion, :preferencias_expresion, :preferencias_motivacion,
                1, :created_by, :updated_by)";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':id'                            => UUID::generate(),
            ':paci_id'                       => $paciId,
            ':fortalezas'                    => $dua['fortalezas'] ?? null,
            ':barreras'                      => $dua['barreras'] ?? null,
            ':preferencias_representacion'   => $dua['preferencias_representacion'] ?? null,
            ':preferencias_expresion'        => $dua['preferencias_expresion'] ?? null,
            ':preferencias_motivacion'       => $dua['preferencias_motivacion'] ?? null,
            ':created_by'                    => $userId,
            ':updated_by'                    => $userId,
        ]);
    }

    // Marca expedientes como 'Completo'
    private function marcarExpedientes(array $expedienteIds, ?string $userId): void
    {
        $sql = "UPDATE expediente_pie SET estado = 'Completo', updated_by = :userId
                WHERE id = :id AND vigencia = 1";
        $stmt = $this->db->prepare($sql);

        foreach ($expedienteIds as $expId) {
            if (!UUID::isValid($expId)) {
                throw new \RuntimeException("UUID invalido en expediente_ids: {$expId}");
            }

            $stmt->execute([
                ':userId' => $userId,
                ':id'     => $expId,
            ]);

            if ($stmt->rowCount() === 0) {
                throw new \RuntimeException("Expediente no encontrado o ya inactivo: {$expId}");
            }
        }
    }
}
