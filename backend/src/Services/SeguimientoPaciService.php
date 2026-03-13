<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\SeguimientoPaci;
use App\Models\Paci;
use App\Config\Database;
use App\Helpers\Validator;
use App\Helpers\Response;
use App\Helpers\UUID;
use PDO;

class SeguimientoPaciService
{
    private SeguimientoPaci $model;
    private Paci $paciModel;
    private PDO $db;

    public function __construct()
    {
        $this->model     = new SeguimientoPaci();
        $this->paciModel = new Paci();
        $this->db        = Database::getInstance();
    }

    public function getAll(array $filters, int $page, int $limit): array
    {
        return $this->model->getAll($filters, $page, $limit);
    }

    // Obtiene la grilla de seguimiento completa de un PACI (todos los OA × meses)
    public function getByPaci(string $paciId): array
    {
        $sql = "SELECT s.*, pt.oa_id, o.id_oa as oa_codigo, o.texto_oa,
                       cn.nombre as nivel_nombre, u.nombre as usuario_nombre
                FROM seguimiento_paci s
                LEFT JOIN paci_trayectoria pt ON pt.id = s.trayectoria_id
                LEFT JOIN oa_db o ON o.id = pt.oa_id
                LEFT JOIN cursos_niveles cn ON cn.id = pt.nivel_trabajo_id
                LEFT JOIN users u ON u.id = s.usuario_id
                WHERE s.paci_id = :paci_id AND s.vigencia = 1
                ORDER BY pt.created_at ASC, s.mes ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':paci_id' => $paciId]);
        return $stmt->fetchAll();
    }

    public function getById(string $id): ?array
    {
        return $this->model->getById($id);
    }

    // Crea o actualiza un registro de seguimiento (upsert por trayectoria+mes+anio)
    public function upsert(array $data, ?string $userId): array
    {
        $validator = Validator::make($data, [
            'paci_id'        => 'required|uuid',
            'trayectoria_id' => 'required|uuid',
            'mes'            => 'required|integer',
            'anio'           => 'required|string|max:10',
            'estado'         => 'required|in:No Iniciado,En Proceso,Logrado,Logrado con Apoyo',
            'observaciones'  => 'nullable|string',
            'evidencia'      => 'nullable|string|max:500',
        ]);

        if (!empty($validator->getErrors())) {
            Response::validationError($validator->getErrors());
        }

        $mes = (int) $data['mes'];
        if ($mes < 1 || $mes > 10) {
            Response::error('El mes debe estar entre 1 (Marzo) y 10 (Diciembre)', 400);
        }

        if (!$this->paciModel->exists($data['paci_id'])) {
            Response::error('El PACI referenciado no existe', 404);
        }

        // Check if record already exists for this trayectoria+mes+anio
        $sql = "SELECT id FROM seguimiento_paci
                WHERE trayectoria_id = :tray_id AND mes = :mes AND anio = :anio AND vigencia = 1
                LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':tray_id' => $data['trayectoria_id'],
            ':mes'     => $mes,
            ':anio'    => $data['anio'],
        ]);
        $existing = $stmt->fetch();

        if ($existing) {
            // Update existing record
            return $this->model->update($existing['id'], [
                'estado'         => $data['estado'],
                'observaciones'  => $data['observaciones'] ?? null,
                'evidencia'      => $data['evidencia'] ?? null,
                'fecha_registro' => date('Y-m-d'),
                'usuario_id'     => $userId,
            ], $userId);
        }

        // Create new record
        $data['fecha_registro'] = date('Y-m-d');
        $data['usuario_id']     = $userId;
        return $this->model->create($data, $userId);
    }

    public function softDelete(string $id, ?string $userId): bool
    {
        return $this->model->softDelete($id, $userId);
    }
}
