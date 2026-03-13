<?php

declare(strict_types=1);

namespace App\Models;

class SeguimientoPaci extends BaseModel
{
    protected string $table    = 'seguimiento_paci';
    protected array  $fillable = [
        'paci_id', 'trayectoria_id', 'mes', 'anio',
        'estado', 'observaciones', 'evidencia',
        'fecha_registro', 'usuario_id'
    ];
}
