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
        $trayectoria = $stmtTray->fetchAll();

        // Load indicadores seleccionados and adecuaciones_oa for each trayectoria item
        foreach ($trayectoria as &$tray) {
            // Indicadores seleccionados
            $sqlInd = "SELECT ai.id, ai.indicador_id, ind.nivel_desempeno, ind.texto_indicador
                       FROM adecuacion_indicadores ai
                       LEFT JOIN indicadores_db ind ON ind.id = ai.indicador_id
                       WHERE ai.trayectoria_id = :tray_id AND ai.vigencia = 1";
            $stmtInd = $this->db->prepare($sqlInd);
            $stmtInd->execute([':tray_id' => $tray['id']]);
            $tray['indicadores_seleccionados'] = $stmtInd->fetchAll();

            // Adecuación OA (meta integradora)
            $sqlAdec = "SELECT * FROM adecuaciones_oa WHERE trayectoria_id = :tray_id AND vigencia = 1 LIMIT 1";
            $stmtAdec = $this->db->prepare($sqlAdec);
            $stmtAdec->execute([':tray_id' => $tray['id']]);
            $tray['adecuacion_oa'] = $stmtAdec->fetch() ?: null;
        }
        unset($tray);

        $paci['trayectoria'] = $trayectoria;

        $sqlDua = "SELECT * FROM perfil_dua WHERE paci_id = :paci_id AND vigencia = 1 LIMIT 1";
        $stmtDua = $this->db->prepare($sqlDua);
        $stmtDua->execute([':paci_id' => $id]);
        $paci['perfil_dua'] = $stmtDua->fetch() ?: null;

        // Matrices pedagógicas (junction tables v2)
        $matrixTables = [
            'fortalezas'       => ['junction' => 'paci_fortalezas',       'catalog' => 'matriz_fortalezas',       'fk' => 'fortaleza_id'],
            'barreras'         => ['junction' => 'paci_barreras',         'catalog' => 'matriz_barreras',         'fk' => 'barrera_id'],
            'estrategias_dua'  => ['junction' => 'paci_estrategias_dua',  'catalog' => 'matriz_estrategias_dua',  'fk' => 'estrategia_id'],
            'acceso_curricular'=> ['junction' => 'paci_acceso_curricular','catalog' => 'matriz_acceso_curricular','fk' => 'acceso_id'],
            'habilidades_base' => ['junction' => 'paci_habilidades_base', 'catalog' => 'matriz_habilidades_base', 'fk' => 'habilidad_id'],
        ];
        foreach ($matrixTables as $key => $cfg) {
            $sqlMatrix = "SELECT j.id, j.{$cfg['fk']} as matriz_id, c.nombre
                          FROM {$cfg['junction']} j
                          INNER JOIN {$cfg['catalog']} c ON c.id = j.{$cfg['fk']}
                          WHERE j.paci_id = :paci_id
                          ORDER BY c.orden";
            $stmtMatrix = $this->db->prepare($sqlMatrix);
            $stmtMatrix->execute([':paci_id' => $id]);
            $paci['matrices_' . $key] = $stmtMatrix->fetchAll();
        }

        // PAEC variables
        $sqlPaec = "SELECT * FROM paec_variables WHERE paci_id = :paci_id AND vigencia = 1 ORDER BY tipo, orden";
        $stmtPaec = $this->db->prepare($sqlPaec);
        $stmtPaec->execute([':paci_id' => $id]);
        $paci['paec_variables'] = $stmtPaec->fetchAll();

        return $paci;
    }

    // Crea un PACI completo de forma transaccional (cabecera + trayectoria + DUA + expediente)
    public function crearPaciCompleto(array $data, ?string $userId): array
    {
        $validator = Validator::make($data, [
            'estudiante_id'   => 'required|uuid',
            'fecha_emision'   => 'required|date',
            'formato_generado'=> 'required|in:Compacto,Completo,Modular',
            'anio_escolar'    => 'nullable|string|max:20',
            'profesor_jefe'   => 'nullable|string|max:200',
            'profesor_asignatura' => 'nullable|string|max:200',
            'educador_diferencial' => 'nullable|string|max:200',
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
                        anio_escolar, profesor_jefe, profesor_asignatura, educador_diferencial,
                        aplica_paec, paec_activadores, paec_estrategias, paec_desregulacion,
                        vigencia, created_by, updated_by)
                        VALUES (:id, :estudiante_id, :usuario_id, :fecha_emision, :formato_generado,
                        :anio_escolar, :profesor_jefe, :profesor_asignatura, :educador_diferencial,
                        :aplica_paec, :paec_activadores, :paec_estrategias, :paec_desregulacion,
                        1, :created_by, :updated_by)";

            $stmtPaci = $this->db->prepare($sqlPaci);
            $stmtPaci->execute([
                ':id'                  => $paciId,
                ':estudiante_id'       => $data['estudiante_id'],
                ':usuario_id'          => $userId,
                ':fecha_emision'       => $data['fecha_emision'],
                ':formato_generado'    => $data['formato_generado'],
                ':anio_escolar'        => $data['anio_escolar'] ?? null,
                ':profesor_jefe'       => $data['profesor_jefe'] ?? null,
                ':profesor_asignatura' => $data['profesor_asignatura'] ?? null,
                ':educador_diferencial'=> $data['educador_diferencial'] ?? null,
                ':aplica_paec'         => $data['aplica_paec'] ?? 0,
                ':paec_activadores'    => $data['paec_activadores'] ?? null,
                ':paec_estrategias'    => $data['paec_estrategias'] ?? null,
                ':paec_desregulacion'  => $data['paec_desregulacion'] ?? null,
                ':created_by'          => $userId,
                ':updated_by'          => $userId,
            ]);

            if (!empty($data['trayectoria'])) {
                $trayectoriaIds = $this->insertTrayectoria($paciId, $data['trayectoria'], $userId);

                // Insert adecuacion_indicadores and adecuaciones_oa for each trayectoria
                foreach ($data['trayectoria'] as $index => $item) {
                    $trayId = $trayectoriaIds[$index] ?? null;
                    if (!$trayId) continue;

                    // Indicadores seleccionados
                    if (!empty($item['indicadores_seleccionados']) && is_array($item['indicadores_seleccionados'])) {
                        $this->insertAdecuacionIndicadores($trayId, $item['indicadores_seleccionados'], $userId);
                    }

                    // Adecuación OA (meta integradora)
                    if (!empty($item['adecuacion_oa']) && is_array($item['adecuacion_oa'])) {
                        $this->insertAdecuacionOa($paciId, $trayId, $item['adecuacion_oa'], $userId);
                    }
                }
            }

            if (!empty($data['perfil_dua'])) {
                $this->insertPerfilDua($paciId, $data['perfil_dua'], $userId);
            }

            // Junction tables v2 – matrices pedagógicas
            $this->insertPaciMatrices($paciId, $data, $userId);

            // PAEC variables
            if (!empty($data['paec_variables']) && is_array($data['paec_variables'])) {
                $this->insertPaecVariables($paciId, $data['paec_variables'], $userId);
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
            'anio_escolar'       => 'nullable|string|max:20',
            'profesor_jefe'      => 'nullable|string|max:200',
            'profesor_asignatura'=> 'nullable|string|max:200',
            'educador_diferencial' => 'nullable|string|max:200',
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

    // Inserta registros de trayectoria (detalle OA) del PACI — devuelve array de IDs creados
    private function insertTrayectoria(string $paciId, array $items, ?string $userId): array
    {
        $sql = "INSERT INTO paci_trayectoria (id, paci_id, oa_id, nivel_trabajo_id,
                diferencia_calculada, tipo_adecuacion, justificacion_tecnica,
                eval_modalidad, eval_instrumento, eval_criterio,
                meta_especifica, estrategias_dua, habilidades, seguimiento_registro,
                vigencia, created_by, updated_by)
                VALUES (:id, :paci_id, :oa_id, :nivel_trabajo_id,
                :diferencia_calculada, :tipo_adecuacion, :justificacion_tecnica,
                :eval_modalidad, :eval_instrumento, :eval_criterio,
                :meta_especifica, :estrategias_dua, :habilidades, :seguimiento_registro,
                1, :created_by, :updated_by)";

        $stmt = $this->db->prepare($sql);

        $generatedIds = [];
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

            $trayId = UUID::generate();
            $stmt->execute([
                ':id'                     => $trayId,
                ':paci_id'                => $paciId,
                ':oa_id'                  => $item['oa_id'],
                ':nivel_trabajo_id'       => $item['nivel_trabajo_id'],
                ':diferencia_calculada'   => $item['diferencia_calculada'],
                ':tipo_adecuacion'        => $item['tipo_adecuacion'],
                ':justificacion_tecnica'  => $item['justificacion_tecnica'] ?? null,
                ':eval_modalidad'         => $item['eval_modalidad'] ?? null,
                ':eval_instrumento'       => $item['eval_instrumento'] ?? null,
                ':eval_criterio'          => $item['eval_criterio'] ?? null,
                ':meta_especifica'        => $item['meta_especifica'] ?? null,
                ':estrategias_dua'        => $item['estrategias_dua'] ?? null,
                ':habilidades'            => $item['habilidades'] ?? null,
                ':seguimiento_registro'   => $item['seguimiento_registro'] ?? null,
                ':created_by'             => $userId,
                ':updated_by'             => $userId,
            ]);
            $generatedIds[] = $trayId;
        }

        return $generatedIds;
    }

    // Inserta el perfil DUA asociado al PACI
    private function insertPerfilDua(string $paciId, array $dua, ?string $userId): void
    {
        $sql = "INSERT INTO perfil_dua (id, paci_id, fortalezas, barreras, barreras_personalizadas,
                acceso_curricular, preferencias_representacion, preferencias_expresion, preferencias_motivacion,
                habilidades_base, vigencia, created_by, updated_by)
                VALUES (:id, :paci_id, :fortalezas, :barreras, :barreras_personalizadas,
                :acceso_curricular, :preferencias_representacion, :preferencias_expresion, :preferencias_motivacion,
                :habilidades_base, 1, :created_by, :updated_by)";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':id'                            => UUID::generate(),
            ':paci_id'                       => $paciId,
            ':fortalezas'                    => $dua['fortalezas'] ?? null,
            ':barreras'                      => $dua['barreras'] ?? null,
            ':barreras_personalizadas'       => $dua['barreras_personalizadas'] ?? null,
            ':acceso_curricular'             => $dua['acceso_curricular'] ?? null,
            ':preferencias_representacion'   => $dua['preferencias_representacion'] ?? null,
            ':preferencias_expresion'        => $dua['preferencias_expresion'] ?? null,
            ':preferencias_motivacion'       => $dua['preferencias_motivacion'] ?? null,
            ':habilidades_base'              => $dua['habilidades_base'] ?? null,
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

    // Inserta indicadores seleccionados para una trayectoria
    private function insertAdecuacionIndicadores(string $trayectoriaId, array $indicadorIds, ?string $userId): void
    {
        $sql = "INSERT INTO adecuacion_indicadores (id, trayectoria_id, indicador_id, vigencia, created_by, updated_by)
                VALUES (:id, :tray_id, :ind_id, 1, :created_by, :updated_by)";
        $stmt = $this->db->prepare($sql);

        foreach ($indicadorIds as $indId) {
            if (!UUID::isValid($indId)) continue;
            $stmt->execute([
                ':id'         => UUID::generate(),
                ':tray_id'    => $trayectoriaId,
                ':ind_id'     => $indId,
                ':created_by' => $userId,
                ':updated_by' => $userId,
            ]);
        }
    }

    // Inserta adecuación OA (meta integradora) para una trayectoria
    private function insertAdecuacionOa(string $paciId, string $trayectoriaId, array $adec, ?string $userId): void
    {
        $sql = "INSERT INTO adecuaciones_oa (id, paci_id, trayectoria_id, meta_integradora, estrategias,
                adecuaciones, instrumento_evaluacion, justificacion, criterios_evaluacion, observaciones,
                vigencia, created_by, updated_by)
                VALUES (:id, :paci_id, :tray_id, :meta, :estrategias, :adec, :instrumento, :justificacion,
                :criterios, :observaciones, 1, :created_by, :updated_by)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':id'            => UUID::generate(),
            ':paci_id'       => $paciId,
            ':tray_id'       => $trayectoriaId,
            ':meta'          => $adec['meta_integradora'] ?? null,
            ':estrategias'   => $adec['estrategias'] ?? null,
            ':adec'          => $adec['adecuaciones'] ?? null,
            ':instrumento'   => $adec['instrumento_evaluacion'] ?? null,
            ':justificacion' => $adec['justificacion'] ?? null,
            ':criterios'     => $adec['criterios_evaluacion'] ?? null,
            ':observaciones' => $adec['observaciones'] ?? null,
            ':created_by'    => $userId,
            ':updated_by'    => $userId,
        ]);
    }

    // Inserta variables PAEC estructuradas
    private function insertPaecVariables(string $paciId, array $variables, ?string $userId): void
    {
        $sql = "INSERT INTO paec_variables (id, paci_id, tipo, descripcion, estrategia, orden, vigencia, created_by, updated_by)
                VALUES (:id, :paci_id, :tipo, :descripcion, :estrategia, :orden, 1, :created_by, :updated_by)";
        $stmt = $this->db->prepare($sql);

        foreach ($variables as $index => $var) {
            $tipo = $var['tipo'] ?? '';
            if (!in_array($tipo, ['Activador', 'Estrategia', 'Desregulacion', 'Protocolo'])) continue;

            $stmt->execute([
                ':id'          => UUID::generate(),
                ':paci_id'     => $paciId,
                ':tipo'        => $tipo,
                ':descripcion' => $var['descripcion'] ?? '',
                ':estrategia'  => $var['estrategia'] ?? null,
                ':orden'       => $var['orden'] ?? $index,
                ':created_by'  => $userId,
                ':updated_by'  => $userId,
            ]);
        }
    }

    // Inserta relaciones N:M entre PACI y matrices pedagógicas (v2)
    private function insertPaciMatrices(string $paciId, array $data, ?string $userId): void
    {
        $mapping = [
            'fortaleza_ids'        => ['table' => 'paci_fortalezas',       'fk' => 'fortaleza_id'],
            'barrera_ids'          => ['table' => 'paci_barreras',         'fk' => 'barrera_id'],
            'estrategia_dua_ids'   => ['table' => 'paci_estrategias_dua',  'fk' => 'estrategia_id'],
            'acceso_curricular_ids'=> ['table' => 'paci_acceso_curricular','fk' => 'acceso_id'],
            'habilidad_base_ids'   => ['table' => 'paci_habilidades_base', 'fk' => 'habilidad_id'],
        ];

        foreach ($mapping as $field => $cfg) {
            if (empty($data[$field]) || !is_array($data[$field])) continue;

            $sql = "INSERT INTO {$cfg['table']} (id, paci_id, {$cfg['fk']}, created_by)
                    VALUES (:id, :paci_id, :fk_id, :created_by)";
            $stmt = $this->db->prepare($sql);

            foreach ($data[$field] as $matrizId) {
                if (!UUID::isValid($matrizId)) continue;
                $stmt->execute([
                    ':id'         => UUID::generate(),
                    ':paci_id'    => $paciId,
                    ':fk_id'      => $matrizId,
                    ':created_by' => $userId,
                ]);
            }
        }
    }
}
