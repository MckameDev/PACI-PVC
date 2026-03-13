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

                $idOa = trim($row['id_oa'] ?? '');
                if (empty($idOa)) {
                    $errors[] = "Fila {$lineNum}: id_oa vacío, se omite.";
                    continue;
                }

                $textoOa = trim($row['texto_oa'] ?? '');
                if (empty($textoOa)) {
                    $errors[] = "Fila {$lineNum}: texto_oa vacío para {$idOa}, se omite.";
                    continue;
                }

                // Resolver asignatura_id
                $asignaturaId = $this->resolveAsignatura($row['asignatura_codigo'] ?? '', $row['asignatura_nombre'] ?? '');
                if (!$asignaturaId) {
                    $errors[] = "Fila {$lineNum}: No se encontró asignatura para '{$row['asignatura_codigo']}' / '{$row['asignatura_nombre']}' en {$idOa}.";
                    continue;
                }

                // Resolver nivel_trabajo_id
                $nivelId = $this->resolveNivel($row['nivel_nombre'] ?? '');
                if (!$nivelId) {
                    $errors[] = "Fila {$lineNum}: No se encontró nivel '{$row['nivel_nombre']}' en {$idOa}.";
                    continue;
                }

                // Check if OA exists
                $existStmt = $this->db->prepare("SELECT id FROM oa_db WHERE id_oa = :id_oa LIMIT 1");
                $existStmt->execute([':id_oa' => $idOa]);
                $existingId = $existStmt->fetchColumn();

                // Resolver eje_id si hay catálogo
                $ejeId = null;
                $ejeNombre = trim($row['eje'] ?? '');
                if ($ejeNombre) {
                    $ejeId = $this->resolveEje($asignaturaId, $ejeNombre, $userId);
                }

                if ($existingId) {
                    // Update
                    $sql = "UPDATE oa_db SET asignatura_id = :asig, nivel_trabajo_id = :nivel, eje = :eje, eje_id = :eje_id,
                            tipo_oa = :tipo, codigo_oa = :codigo, texto_oa = :texto, habilidad_core = :hab,
                            es_habilidad_estructural = :es_hab, updated_by = :user
                            WHERE id = :id";
                    $stmt = $this->db->prepare($sql);
                    $stmt->execute([
                        ':asig'   => $asignaturaId,
                        ':nivel'  => $nivelId,
                        ':eje'    => $ejeNombre ?: null,
                        ':eje_id' => $ejeId,
                        ':tipo'   => $row['tipo_oa'] ?? null,
                        ':codigo' => $row['codigo_oa'] ?? null,
                        ':texto'  => $textoOa,
                        ':hab'    => $row['habilidad_core'] ?? null,
                        ':es_hab' => ($row['es_habilidad_estructural'] ?? 0) ? 1 : 0,
                        ':user'   => $userId,
                        ':id'     => $existingId,
                    ]);
                    $updated++;
                } else {
                    // Insert
                    $sql = "INSERT INTO oa_db (id, id_oa, asignatura_id, nivel_trabajo_id, eje, eje_id, tipo_oa, codigo_oa,
                            texto_oa, habilidad_core, es_habilidad_estructural, vigencia, created_by, updated_by)
                            VALUES (:id, :id_oa, :asig, :nivel, :eje, :eje_id, :tipo, :codigo, :texto, :hab, :es_hab, 1, :user, :user2)";
                    $stmt = $this->db->prepare($sql);
                    $stmt->execute([
                        ':id'     => UUID::generate(),
                        ':id_oa'  => $idOa,
                        ':asig'   => $asignaturaId,
                        ':nivel'  => $nivelId,
                        ':eje'    => $ejeNombre ?: null,
                        ':eje_id' => $ejeId,
                        ':tipo'   => $row['tipo_oa'] ?? null,
                        ':codigo' => $row['codigo_oa'] ?? null,
                        ':texto'  => $textoOa,
                        ':hab'    => $row['habilidad_core'] ?? null,
                        ':es_hab' => ($row['es_habilidad_estructural'] ?? 0) ? 1 : 0,
                        ':user'   => $userId,
                        ':user2'  => $userId,
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
     * Each row: id_oa (to link), nivel_desempeno, texto_indicador
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
                $nivel = trim($row['nivel_desempeno'] ?? '');
                $texto = trim($row['texto_indicador'] ?? '');

                if (empty($idOa) || empty($nivel) || empty($texto)) {
                    $errors[] = "Fila {$lineNum}: Campos obligatorios vacíos (id_oa, nivel_desempeno, texto_indicador).";
                    continue;
                }

                if (!in_array($nivel, ['L', 'ED', 'NL'])) {
                    $errors[] = "Fila {$lineNum}: nivel_desempeno '{$nivel}' no válido. Usar L, ED o NL.";
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

                // Check duplicado exacto
                $dupStmt = $this->db->prepare(
                    "SELECT id FROM indicadores_db WHERE oa_id = :oa_id AND nivel_desempeno = :nivel AND texto_indicador = :texto AND vigencia = 1 LIMIT 1"
                );
                $dupStmt->execute([':oa_id' => $oaId, ':nivel' => $nivel, ':texto' => $texto]);
                $dupId = $dupStmt->fetchColumn();

                if ($dupId) {
                    $updated++; // Already exists, count as "no change"
                    continue;
                }

                $sql = "INSERT INTO indicadores_db (id, oa_id, nivel_desempeno, texto_indicador, vigencia, created_by, updated_by)
                        VALUES (:id, :oa_id, :nivel, :texto, 1, :user, :user2)";
                $stmt = $this->db->prepare($sql);
                $stmt->execute([
                    ':id'    => UUID::generate(),
                    ':oa_id' => $oaId,
                    ':nivel' => $nivel,
                    ':texto' => $texto,
                    ':user'  => $userId,
                    ':user2' => $userId,
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
}
