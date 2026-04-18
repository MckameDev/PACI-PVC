<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\Database;
use App\Helpers\Response;
use App\Helpers\UUID;
use App\Helpers\Validator;
use PDO;

class AiAdminService
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function getConfig(): array
    {
        $config = $this->getActiveConfigRow();
        if (!$config) {
            return [
                'config' => null,
                'parametros' => [],
            ];
        }

        return [
            'config' => $config,
            'parametros' => $this->getParametrosByConfig($config['id']),
        ];
    }

    public function saveConfig(array $data, ?string $userId): array
    {
        $validator = Validator::make($data, [
            'nombre' => 'nullable|string|max:120',
            'prompt_inicial' => 'required|string|min:20',
            'modelo' => 'nullable|string|max:120',
            'temperature' => 'nullable|numeric|min:0|max:2',
            'max_tokens' => 'nullable|integer|min:100|max:4000',
        ]);

        if (!empty($validator->getErrors())) {
            Response::validationError($validator->getErrors());
        }

        $active = $this->getActiveConfigRow();

        if ($active) {
            $stmt = $this->db->prepare(
                'UPDATE ai_admin_configs
                 SET nombre = :nombre,
                     prompt_inicial = :prompt_inicial,
                     modelo = :modelo,
                     temperature = :temperature,
                     max_tokens = :max_tokens,
                     updated_by = :updated_by
                 WHERE id = :id'
            );

            $stmt->execute([
                ':id' => $active['id'],
                ':nombre' => $data['nombre'] ?? $active['nombre'],
                ':prompt_inicial' => $data['prompt_inicial'],
                ':modelo' => $data['modelo'] ?? null,
                ':temperature' => isset($data['temperature']) && $data['temperature'] !== '' ? (float) $data['temperature'] : null,
                ':max_tokens' => isset($data['max_tokens']) && $data['max_tokens'] !== '' ? (int) $data['max_tokens'] : null,
                ':updated_by' => $userId,
            ]);
        } else {
            $stmt = $this->db->prepare(
                'INSERT INTO ai_admin_configs (id, nombre, prompt_inicial, modelo, temperature, max_tokens, vigencia, created_by, updated_by)
                 VALUES (:id, :nombre, :prompt_inicial, :modelo, :temperature, :max_tokens, 1, :created_by, :updated_by)'
            );

            $stmt->execute([
                ':id' => UUID::generate(),
                ':nombre' => $data['nombre'] ?? 'Motor PACI v4.0',
                ':prompt_inicial' => $data['prompt_inicial'],
                ':modelo' => $data['modelo'] ?? null,
                ':temperature' => isset($data['temperature']) && $data['temperature'] !== '' ? (float) $data['temperature'] : null,
                ':max_tokens' => isset($data['max_tokens']) && $data['max_tokens'] !== '' ? (int) $data['max_tokens'] : null,
                ':created_by' => $userId,
                ':updated_by' => $userId,
            ]);
        }

        return $this->getConfig();
    }

    public function createParametro(array $data, ?string $userId): array
    {
        $validator = Validator::make($data, [
            'config_id' => 'nullable|uuid',
            'clave' => 'required|string|min:2|max:100',
            'valor' => 'required|string|min:1|max:5000',
            'tipo' => 'nullable|string|in:text,number,boolean,json',
            'descripcion' => 'nullable|string|max:255',
            'orden' => 'nullable|integer|min:0|max:9999',
        ]);

        if (!empty($validator->getErrors())) {
            Response::validationError($validator->getErrors());
        }

        $configId = $data['config_id'] ?? null;
        if (!$configId) {
            $active = $this->getActiveConfigRow();
            if (!$active) {
                Response::error('Primero debes guardar una configuración base de IA.', 409);
            }
            $configId = $active['id'];
        }

        if (!$this->existsConfig($configId)) {
            Response::error('La configuración base indicada no existe.', 404);
        }

        $duplicate = $this->findParametroByClave($configId, $data['clave']);
        if ($duplicate) {
            Response::error('Ya existe un parámetro con esa clave en la configuración activa.', 409);
        }

        $stmt = $this->db->prepare(
            'INSERT INTO ai_admin_parametros
            (id, config_id, clave, valor, tipo, descripcion, orden, vigencia, created_by, updated_by)
            VALUES (:id, :config_id, :clave, :valor, :tipo, :descripcion, :orden, 1, :created_by, :updated_by)'
        );

        $id = UUID::generate();

        $stmt->execute([
            ':id' => $id,
            ':config_id' => $configId,
            ':clave' => trim((string) $data['clave']),
            ':valor' => (string) $data['valor'],
            ':tipo' => $data['tipo'] ?? 'text',
            ':descripcion' => $data['descripcion'] ?? null,
            ':orden' => isset($data['orden']) ? (int) $data['orden'] : 0,
            ':created_by' => $userId,
            ':updated_by' => $userId,
        ]);

        return $this->getParametroById($id) ?? [];
    }

    public function updateParametro(string $id, array $data, ?string $userId): ?array
    {
        $current = $this->getParametroById($id);
        if (!$current) {
            return null;
        }

        $validator = Validator::make($data, [
            'clave' => 'nullable|string|min:2|max:100',
            'valor' => 'nullable|string|min:1|max:5000',
            'tipo' => 'nullable|string|in:text,number,boolean,json',
            'descripcion' => 'nullable|string|max:255',
            'orden' => 'nullable|integer|min:0|max:9999',
        ]);

        if (!empty($validator->getErrors())) {
            Response::validationError($validator->getErrors());
        }

        if (isset($data['clave']) && $data['clave'] !== $current['clave']) {
            $duplicate = $this->findParametroByClave($current['config_id'], (string) $data['clave']);
            if ($duplicate) {
                Response::error('Ya existe un parámetro con esa clave en la configuración activa.', 409);
            }
        }

        $stmt = $this->db->prepare(
            'UPDATE ai_admin_parametros
             SET clave = :clave,
                 valor = :valor,
                 tipo = :tipo,
                 descripcion = :descripcion,
                 orden = :orden,
                 updated_by = :updated_by
             WHERE id = :id'
        );

        $stmt->execute([
            ':id' => $id,
            ':clave' => $data['clave'] ?? $current['clave'],
            ':valor' => $data['valor'] ?? $current['valor'],
            ':tipo' => $data['tipo'] ?? $current['tipo'],
            ':descripcion' => array_key_exists('descripcion', $data) ? $data['descripcion'] : $current['descripcion'],
            ':orden' => isset($data['orden']) ? (int) $data['orden'] : (int) $current['orden'],
            ':updated_by' => $userId,
        ]);

        return $this->getParametroById($id);
    }

    public function toggleParametro(string $id, ?string $userId): bool
    {
        $stmt = $this->db->prepare(
            'UPDATE ai_admin_parametros
             SET vigencia = CASE WHEN vigencia = 1 THEN 0 ELSE 1 END,
                 updated_by = :updated_by
             WHERE id = :id'
        );

        $stmt->execute([
            ':id' => $id,
            ':updated_by' => $userId,
        ]);

        return $stmt->rowCount() > 0;
    }

    private function getActiveConfigRow(): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT id, nombre, prompt_inicial, modelo, temperature, max_tokens, created_at, updated_at
             FROM ai_admin_configs
             WHERE vigencia = 1
             ORDER BY updated_at DESC
             LIMIT 1'
        );
        $stmt->execute();

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    private function getParametrosByConfig(string $configId): array
    {
        $stmt = $this->db->prepare(
            'SELECT id, config_id, clave, valor, tipo, descripcion, orden, vigencia, created_at, updated_at
             FROM ai_admin_parametros
             WHERE config_id = :config_id
             ORDER BY vigencia DESC, orden ASC, created_at ASC'
        );
        $stmt->execute([':config_id' => $configId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function getParametroById(string $id): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT id, config_id, clave, valor, tipo, descripcion, orden, vigencia, created_at, updated_at
             FROM ai_admin_parametros
             WHERE id = :id
             LIMIT 1'
        );
        $stmt->execute([':id' => $id]);

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    private function findParametroByClave(string $configId, string $clave): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT id, config_id, clave, vigencia
             FROM ai_admin_parametros
             WHERE config_id = :config_id AND clave = :clave
             LIMIT 1'
        );
        $stmt->execute([
            ':config_id' => $configId,
            ':clave' => trim($clave),
        ]);

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    private function existsConfig(string $configId): bool
    {
        $stmt = $this->db->prepare(
            'SELECT 1 FROM ai_admin_configs WHERE id = :id AND vigencia = 1 LIMIT 1'
        );
        $stmt->execute([':id' => $configId]);

        return (bool) $stmt->fetchColumn();
    }
}
