<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\Database;
use App\Helpers\UUID;
use App\Helpers\Validator;
use App\Helpers\Response;
use PDO;

class ImportService
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    /**
     * Import OA records from parsed Excel/CSV rows.
     * Each row: id_oa, asignatura_codigo, nivel_nombre, eje, tipo_oa, codigo_oa, texto_oa, habilidad_core, es_habilidad_estructural
     */
    public function importOa(array $rows, ?string $userId): array
    {
        $inserted = 0;
        $updated  = 0;
        $errors   = [];

        $this->db->beginTransaction();

        try {
            foreach ($rows as $index => $row) {
                $lineNum = $index + 2; // header = row 1

                // Acepta tanto oa_texto como texto_oa
                $textoOa = trim($row['oa_texto'] ?? $row['texto_oa'] ?? '');
                if (empty($textoOa)) {
                    $errors[] = "Fila {$lineNum}: oa_texto vacío, se omite.";
                    continue;
                }

                // Resolver asignatura_id — acepta 'asignatura' o 'asignatura_nombre'/'asignatura_codigo'
                $asigNombre = trim($row['asignatura'] ?? $row['asignatura_nombre'] ?? '');
                $asigCodigo = trim($row['asignatura_codigo'] ?? '');
                $asignaturaId = $this->resolveAsignatura($asigCodigo, $asigNombre);
                if (!$asignaturaId) {
                    $errors[] = "Fila {$lineNum}: No se encontró asignatura '{$asigNombre}', se omite.";
                    continue;
                }

                // Resolver nivel_trabajo_id — acepta 'nivel' o 'nivel_nombre'
                $nivelNombre = trim($row['nivel'] ?? $row['nivel_nombre'] ?? '');
                $nivelId = $this->resolveNivel($nivelNombre);
                if (!$nivelId) {
                    $errors[] = "Fila {$lineNum}: No se encontró nivel '{$nivelNombre}', se omite.";
                    continue;
                }

                // Resolver eje_id si hay catálogo
                $ejeId = null;
                $ejeNombre = trim($row['eje'] ?? '');
                if ($ejeNombre) {
                    $ejeId = $this->resolveEje($asignaturaId, $ejeNombre, $userId);
                }

                // Columnas opcionales
                $idOa       = trim($row['id_oa'] ?? '');
                $ambito     = trim($row['ambito'] ?? '');
                $nucleo     = trim($row['nucleo'] ?? '');
                $baseHab    = trim($row['base_de_habilidades'] ?? '');
                $nivelLogro = trim($row['nivel_logro'] ?? '');
                $indicLogro = trim($row['indicador_logro'] ?? '');
                $fuente     = trim($row['fuente'] ?? '');
                $tipoOa     = trim($row['tipo_oa'] ?? '');

                // Deduplicar por id_oa (código) si viene, sino por (asignatura_id, nivel_trabajo_id, texto_oa)
                if ($idOa) {
                    $existStmt = $this->db->prepare("SELECT id FROM oa_db WHERE id_oa = :id_oa LIMIT 1");
                    $existStmt->execute([':id_oa' => $idOa]);
                } else {
                    $existStmt = $this->db->prepare(
                        "SELECT id FROM oa_db WHERE asignatura_id = :asig AND nivel_trabajo_id = :nivel AND texto_oa = :texto AND vigencia = 1 LIMIT 1"
                    );
                    $existStmt->execute([':asig' => $asignaturaId, ':nivel' => $nivelId, ':texto' => $textoOa]);
                }
                $existingId = $existStmt->fetchColumn();

                if ($existingId) {
                    // Update
                    $sql = "UPDATE oa_db SET asignatura_id = :asig, nivel_trabajo_id = :nivel, eje = :eje, eje_id = :eje_id,
                            ambito = :ambito, nucleo = :nucleo, tipo_oa = :tipo, texto_oa = :texto,
                            base_de_habilidades = :base_hab, nivel_logro = :nivel_logro,
                            indicador_logro = :indic_logro, fuente = :fuente, updated_by = :user
                            WHERE id = :id";
                    $stmt = $this->db->prepare($sql);
                    $stmt->execute([
                        ':asig'        => $asignaturaId,
                        ':nivel'       => $nivelId,
                        ':eje'         => $ejeNombre ?: null,
                        ':eje_id'      => $ejeId,
                        ':ambito'      => $ambito ?: null,
                        ':nucleo'      => $nucleo ?: null,
                        ':tipo'        => $tipoOa ?: null,
                        ':texto'       => $textoOa,
                        ':base_hab'    => $baseHab ?: null,
                        ':nivel_logro' => $nivelLogro ?: null,
                        ':indic_logro' => $indicLogro ?: null,
                        ':fuente'      => $fuente ?: null,
                        ':user'        => $userId,
                        ':id'          => $existingId,
                    ]);
                    $updated++;
                } else {
                    // Insert — id generado como UUID, id_oa es el código del OA (ej: LVNT-OA01)
                    $sql = "INSERT INTO oa_db (id, id_oa, asignatura_id, nivel_trabajo_id, eje, eje_id,
                            ambito, nucleo, tipo_oa, codigo_oa, texto_oa, habilidad_core, es_habilidad_estructural,
                            base_de_habilidades, nivel_logro, indicador_logro, fuente,
                            vigencia, created_by, updated_by)
                            VALUES (:id, :id_oa, :asig, :nivel, :eje, :eje_id,
                            :ambito, :nucleo, :tipo, NULL, :texto, NULL, 0,
                            :base_hab, :nivel_logro, :indic_logro, :fuente,
                            1, :user, :user2)";
                    $stmt = $this->db->prepare($sql);
                    $stmt->execute([
                        ':id'          => UUID::generate(),
                        ':id_oa'       => $idOa ?: UUID::generate(),
                        ':asig'        => $asignaturaId,
                        ':nivel'       => $nivelId,
                        ':eje'         => $ejeNombre ?: null,
                        ':eje_id'      => $ejeId,
                        ':ambito'      => $ambito ?: null,
                        ':nucleo'      => $nucleo ?: null,
                        ':tipo'        => $tipoOa ?: null,
                        ':texto'       => $textoOa,
                        ':base_hab'    => $baseHab ?: null,
                        ':nivel_logro' => $nivelLogro ?: null,
                        ':indic_logro' => $indicLogro ?: null,
                        ':fuente'      => $fuente ?: null,
                        ':user'        => $userId,
                        ':user2'       => $userId,
                    ]);
                    $inserted++;
                }
            }

            $this->db->commit();
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }

        return [
            'inserted' => $inserted,
            'updated'  => $updated,
            'errors'   => $errors,
            'total_processed' => count($rows),
        ];
    }

    /**
     * Import Indicadores from parsed Excel/CSV rows.
     * Each row: id_oa, curso, eje, nivel_logro (Inicial/Intermedio/Avanzado), indicador (texto)
     * También soporta formato legacy: id_oa, nivel_desempeno (L/ED/NL), texto_indicador
     */
    public function importIndicadores(array $rows, ?string $userId): array
    {
        $inserted = 0;
        $updated  = 0;
        $errors   = [];

        $this->db->beginTransaction();

        try {
            foreach ($rows as $index => $row) {
                $lineNum = $index + 2;

                $idOa = trim($row['id_oa'] ?? '');

                // Soportar nuevo formato (indicador) y legacy (texto_indicador)
                $texto = trim($row['indicador'] ?? $row['texto_indicador'] ?? '');

                // Soportar nuevo formato (nivel_logro) y legacy (nivel_desempeno)
                $nivelLogro    = trim($row['nivel_logro'] ?? '');
                $nivelDesempen = trim($row['nivel_desempeno'] ?? '');

                $curso = trim($row['curso'] ?? '');
                $eje   = trim($row['eje'] ?? '');

                if (empty($idOa) || empty($texto)) {
                    $errors[] = "Fila {$lineNum}: Campos obligatorios vacíos (id_oa, indicador/texto_indicador).";
                    continue;
                }

                // Validar nivel_desempeno legacy si viene
                if ($nivelDesempen && !in_array($nivelDesempen, ['L', 'ED', 'NL'])) {
                    $errors[] = "Fila {$lineNum}: nivel_desempeno '{$nivelDesempen}' no válido. Usar L, ED o NL.";
                    continue;
                }

                // Validar nivel_logro nuevo si viene
                $validNivelesLogro = ['Inicial', 'Intermedio', 'Avanzado'];
                if ($nivelLogro && !in_array($nivelLogro, $validNivelesLogro)) {
                    $errors[] = "Fila {$lineNum}: nivel_logro '{$nivelLogro}' no válido. Usar Inicial, Intermedio o Avanzado.";
                    continue;
                }

                // Resolver oa_id
                $oaStmt = $this->db->prepare("SELECT id FROM oa_db WHERE id_oa = :id_oa AND vigencia = 1 LIMIT 1");
                $oaStmt->execute([':id_oa' => $idOa]);
                $oaId = $oaStmt->fetchColumn();

                if (!$oaId) {
                    $errors[] = "Fila {$lineNum}: OA '{$idOa}' no encontrado en la base de datos.";
                    continue;
                }

                // Check duplicado exacto (nivel_logro + texto o nivel_desempeno + texto)
                $dupStmt = $this->db->prepare(
                    "SELECT id FROM indicadores_db WHERE oa_id = :oa_id AND texto_indicador = :texto AND vigencia = 1 LIMIT 1"
                );
                $dupStmt->execute([':oa_id' => $oaId, ':texto' => $texto]);
                $dupId = $dupStmt->fetchColumn();

                if ($dupId) {
                    $updated++;
                    continue;
                }

                $sql = "INSERT INTO indicadores_db (id, oa_id, curso, eje, nivel_logro, nivel_desempeno, texto_indicador, vigencia, created_by, updated_by)
                        VALUES (:id, :oa_id, :curso, :eje, :nivel_logro, :nivel_desemp, :texto, 1, :user, :user2)";
                $stmt = $this->db->prepare($sql);
                $stmt->execute([
                    ':id'           => UUID::generate(),
                    ':oa_id'        => $oaId,
                    ':curso'        => $curso ?: null,
                    ':eje'          => $eje ?: null,
                    ':nivel_logro'  => $nivelLogro ?: null,
                    ':nivel_desemp' => $nivelDesempen ?: null,
                    ':texto'        => $texto,
                    ':user'         => $userId,
                    ':user2'        => $userId,
                ]);
                $inserted++;
            }

            $this->db->commit();
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }

        return [
            'inserted' => $inserted,
            'skipped'  => $updated,
            'errors'   => $errors,
            'total_processed' => count($rows),
        ];
    }

    private function resolveAsignatura(string $codigo, string $nombre): ?string
    {
        if ($codigo) {
            $stmt = $this->db->prepare("SELECT id FROM asignaturas WHERE codigo = :c AND vigencia = 1 LIMIT 1");
            $stmt->execute([':c' => $codigo]);
            $id = $stmt->fetchColumn();
            if ($id) return $id;
        }

        if ($nombre) {
            $stmt = $this->db->prepare("SELECT id FROM asignaturas WHERE nombre = :n AND vigencia = 1 LIMIT 1");
            $stmt->execute([':n' => $nombre]);
            $id = $stmt->fetchColumn();
            if ($id) return $id;
        }

        return null;
    }

    private function resolveNivel(string $nombre): ?string
    {
        if (!$nombre) return null;
        $stmt = $this->db->prepare("SELECT id FROM cursos_niveles WHERE nombre = :n AND vigencia = 1 LIMIT 1");
        $stmt->execute([':n' => $nombre]);
        return $stmt->fetchColumn() ?: null;
    }

    private function resolveEje(string $asignaturaId, string $nombre, ?string $userId): ?string
    {
        // Try to find existing
        $stmt = $this->db->prepare("SELECT id FROM ejes WHERE asignatura_id = :asig AND nombre = :nombre AND vigencia = 1 LIMIT 1");
        $stmt->execute([':asig' => $asignaturaId, ':nombre' => $nombre]);
        $id = $stmt->fetchColumn();
        if ($id) return $id;

        // Auto-create
        $newId = UUID::generate();
        $ins = $this->db->prepare("INSERT INTO ejes (id, asignatura_id, nombre, vigencia, created_by, updated_by) VALUES (:id, :asig, :nombre, 1, :user, :user2)");
        $ins->execute([':id' => $newId, ':asig' => $asignaturaId, ':nombre' => $nombre, ':user' => $userId, ':user2' => $userId]);
        return $newId;
    }

    // ================================================================
    // IMPORTACIÓN DE MATRICES PEDAGÓGICAS (6 tipos)
    // Patrón: upsert por código único (B01, F01, L01, etc.)
    // ================================================================

    /**
     * Import Barreras de Aprendizaje.
     * Columns: codigo, categoria, nombre, definicion, dimension
     */
    public function importBarreras(array $rows, ?string $userId): array
    {
        return $this->importMatriz($rows, $userId, 'matriz_barreras', [
            'required' => ['codigo', 'nombre'],
            'fields'   => ['codigo', 'nombre', 'categoria', 'definicion', 'dimension'],
            'label'    => 'barrera',
        ]);
    }

    /**
     * Import Fortalezas del Estudiante.
     * Columns: codigo, categoria, nombre, descripcion_ia, valor_dua
     */
    public function importFortalezas(array $rows, ?string $userId): array
    {
        return $this->importMatriz($rows, $userId, 'matriz_fortalezas', [
            'required' => ['codigo', 'nombre'],
            'fields'   => ['codigo', 'nombre', 'categoria', 'descripcion_ia', 'valor_dua'],
            'label'    => 'fortaleza',
        ]);
    }

    /**
     * Import Estrategias de Lectura.
     * Columns: codigo, nombre, momento_lectura, descripcion_pedagogica, objetivo_metacognitivo
     */
    public function importEstrategiasLectura(array $rows, ?string $userId): array
    {
        return $this->importMatriz($rows, $userId, 'matriz_estrategias_lectura', [
            'required' => ['codigo', 'nombre'],
            'fields'   => ['codigo', 'nombre', 'momento_lectura', 'descripcion_pedagogica', 'objetivo_metacognitivo'],
            'label'    => 'estrategia de lectura',
        ]);
    }

    /**
     * Import Estrategias de Escritura.
     * Columns: codigo, nombre, problema_ataca, descripcion, tipo_apoyo
     */
    public function importEstrategiasEscritura(array $rows, ?string $userId): array
    {
        return $this->importMatriz($rows, $userId, 'matriz_estrategias_escritura', [
            'required' => ['codigo', 'nombre'],
            'fields'   => ['codigo', 'nombre', 'problema_ataca', 'descripcion', 'tipo_apoyo'],
            'label'    => 'estrategia de escritura',
        ]);
    }

    /**
     * Import Estrategias de Comunicación.
     * Columns: codigo, nombre, nivel_sugerido, descripcion_pedagogica, foco_intervencion
     */
    public function importEstrategiasComunicacion(array $rows, ?string $userId): array
    {
        return $this->importMatriz($rows, $userId, 'matriz_estrategias_comunicacion', [
            'required' => ['codigo', 'nombre'],
            'fields'   => ['codigo', 'nombre', 'nivel_sugerido', 'descripcion_pedagogica', 'foco_intervencion'],
            'label'    => 'estrategia de comunicación',
        ]);
    }

    /**
     * Import Herramientas de Apoyo.
     * Columns: codigo, nombre, proposito_acceso, descripcion, barrera_mitiga
     */
    public function importHerramientasApoyo(array $rows, ?string $userId): array
    {
        return $this->importMatriz($rows, $userId, 'matriz_herramientas_apoyo', [
            'required' => ['codigo', 'nombre'],
            'fields'   => ['codigo', 'nombre', 'proposito_acceso', 'descripcion', 'barrera_mitiga'],
            'label'    => 'herramienta de apoyo',
        ]);
    }

    // ================================================================
    // IMPORTACIÓN TABLAS CURRICULARES v7 (10 tipos)
    // Patrón: insert genérico sin upsert por código (no tienen campo "codigo")
    // ================================================================

    public function importHabilidadesLenguaje(array $rows, ?string $userId): array
    {
        return $this->importGeneric($rows, $userId, 'habilidades_lenguaje', [
            'fields' => ['nivel', 'eje', 'habilidad', 'descripcion'],
            'label'  => 'habilidad del lenguaje',
        ]);
    }

    public function importActivacionPaci(array $rows, ?string $userId): array
    {
        return $this->importGeneric($rows, $userId, 'activacion_paci', [
            'fields' => ['habilidad_detectada', 'eje', 'core_nivel', 'id_oa', 'estrategia', 'adecuacion', 'actividad'],
            'label'  => 'activación PACI',
        ]);
    }

    public function importCoreLectura(array $rows, ?string $userId): array
    {
        return $this->importGeneric($rows, $userId, 'core_lectura', [
            'fields' => ['core_nivel', 'core_habilidad', 'proceso_lector', 'descripcion'],
            'label'  => 'core lectura',
        ]);
    }

    public function importCoreEscritura(array $rows, ?string $userId): array
    {
        return $this->importGeneric($rows, $userId, 'core_escritura', [
            'fields' => ['core_nivel', 'core_habilidad', 'proceso_escritor', 'descripcion'],
            'label'  => 'core escritura',
        ]);
    }

    public function importCoreComunicacionOral(array $rows, ?string $userId): array
    {
        return $this->importGeneric($rows, $userId, 'core_comunicacion_oral', [
            'fields' => ['core_nivel', 'core_habilidad', 'proceso_oral', 'descripcion'],
            'label'  => 'core comunicación oral',
        ]);
    }

    public function importMatrizProgresion(array $rows, ?string $userId): array
    {
        return $this->importGeneric($rows, $userId, 'matriz_progresion', [
            'fields' => ['asignatura', 'eje', 'core_nivel', 'nivel_curricular', 'id_oa', 'habilidad_clave'],
            'label'  => 'matriz progresión',
        ]);
    }

    public function importEstrategiasCore(array $rows, ?string $userId): array
    {
        return $this->importGeneric($rows, $userId, 'estrategias_core', [
            'fields' => ['asignatura', 'eje', 'core_nivel', 'estrategia', 'actividad'],
            'label'  => 'estrategia core',
        ]);
    }

    public function importProgresionLectora(array $rows, ?string $userId): array
    {
        return $this->importGeneric($rows, $userId, 'progresion_lectora', [
            'fields' => ['nivel', 'core_nivel', 'habilidad_lectora', 'descripcion'],
            'label'  => 'progresión lectora',
        ]);
    }

    public function importMatrizAdecuaciones(array $rows, ?string $userId): array
    {
        return $this->importGeneric($rows, $userId, 'matriz_adecuaciones', [
            'fields' => ['asignatura', 'eje', 'core_nivel', 'dificultad_detectada', 'adecuacion_sugerida'],
            'label'  => 'matriz adecuación',
        ]);
    }

    public function importProgresionCurricular(array $rows, ?string $userId): array
    {
        return $this->importGeneric($rows, $userId, 'progresion_curricular', [
            'fields' => ['habilidad', 'nivel_core', 'nivel_sugerido', 'eje', 'descripcion'],
            'label'  => 'progresión curricular',
        ]);
    }

    /**
     * Generic matrix importer: upsert by codigo, transaction-wrapped.
     */
    private function importMatriz(array $rows, ?string $userId, string $table, array $config): array
    {
        $inserted = 0;
        $updated  = 0;
        $errors   = [];

        $requiredFields = $config['required'];
        $allFields      = $config['fields'];
        $label          = $config['label'];

        $this->db->beginTransaction();

        try {
            foreach ($rows as $index => $row) {
                $lineNum = $index + 2;

                // Validate required fields
                foreach ($requiredFields as $field) {
                    $value = trim((string) ($row[$field] ?? ''));
                    if (empty($value)) {
                        $errors[] = "Fila {$lineNum}: campo '{$field}' vacío, se omite.";
                        continue 2;
                    }
                }

                $codigo = trim((string) $row['codigo']);

                // Check if record exists by codigo
                $existStmt = $this->db->prepare(
                    "SELECT id FROM {$table} WHERE codigo = :codigo LIMIT 1"
                );
                $existStmt->execute([':codigo' => $codigo]);
                $existingId = $existStmt->fetchColumn();

                // Build field values
                $fieldValues = [];
                foreach ($allFields as $f) {
                    $fieldValues[$f] = isset($row[$f]) ? trim((string) $row[$f]) : null;
                }

                if ($existingId) {
                    // Update
                    $setClauses = [];
                    $params = [];
                    foreach ($allFields as $f) {
                        if ($f === 'codigo') continue; // Don't update the key
                        $setClauses[] = "{$f} = :{$f}";
                        $params[":{$f}"] = $fieldValues[$f];
                    }
                    $setClauses[] = "updated_by = :user";
                    $params[':user'] = $userId;
                    $params[':id']   = $existingId;

                    $sql = "UPDATE {$table} SET " . implode(', ', $setClauses) . " WHERE id = :id";
                    $stmt = $this->db->prepare($sql);
                    $stmt->execute($params);
                    $updated++;
                } else {
                    // Insert
                    $fieldNames = array_merge(['id'], $allFields, ['orden', 'vigencia', 'created_by', 'updated_by']);
                    $placeholders = array_map(fn($f) => ":{$f}", $fieldNames);

                    $params = [':id' => UUID::generate()];
                    foreach ($allFields as $f) {
                        $params[":{$f}"] = $fieldValues[$f];
                    }
                    $params[':orden']      = $index + 1;
                    $params[':vigencia']   = 1;
                    $params[':created_by'] = $userId;
                    $params[':updated_by'] = $userId;

                    $sql = "INSERT INTO {$table} (" . implode(', ', $fieldNames) . ") VALUES (" . implode(', ', $placeholders) . ")";
                    $stmt = $this->db->prepare($sql);
                    $stmt->execute($params);
                    $inserted++;
                }
            }

            $this->db->commit();
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }

        return [
            'inserted'        => $inserted,
            'updated'         => $updated,
            'errors'          => $errors,
            'total_processed' => count($rows),
        ];
    }

    /**
     * Generic importer for v7 curriculum tables (no codigo upsert — insert only, skip duplicates).
     */
    private function importGeneric(array $rows, ?string $userId, string $table, array $config): array
    {
        $inserted = 0;
        $skipped  = 0;
        $errors   = [];

        $allFields = $config['fields'];
        $label     = $config['label'];

        $this->db->beginTransaction();

        try {
            foreach ($rows as $index => $row) {
                $lineNum = $index + 2;

                // Build field values
                $fieldValues = [];
                $hasData = false;
                foreach ($allFields as $f) {
                    $val = isset($row[$f]) ? trim((string) $row[$f]) : null;
                    $fieldValues[$f] = ($val !== '' && $val !== null) ? $val : null;
                    if ($fieldValues[$f] !== null) {
                        $hasData = true;
                    }
                }

                if (!$hasData) {
                    $errors[] = "Fila {$lineNum}: todos los campos vacíos, se omite.";
                    continue;
                }

                // Insert
                $fieldNames   = array_merge(['id'], $allFields, ['orden', 'vigencia', 'created_by', 'updated_by']);
                $placeholders = array_map(fn($f) => ":{$f}", $fieldNames);

                $params = [':id' => UUID::generate()];
                foreach ($allFields as $f) {
                    $params[":{$f}"] = $fieldValues[$f];
                }
                $params[':orden']      = $index + 1;
                $params[':vigencia']   = 1;
                $params[':created_by'] = $userId;
                $params[':updated_by'] = $userId;

                $sql = "INSERT INTO {$table} (" . implode(', ', $fieldNames) . ") VALUES (" . implode(', ', $placeholders) . ")";
                $stmt = $this->db->prepare($sql);
                $stmt->execute($params);
                $inserted++;
            }

            $this->db->commit();
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }

        return [
            'inserted'        => $inserted,
            'skipped'         => $skipped,
            'errors'          => $errors,
            'total_processed' => count($rows),
        ];
    }
}
