<?php

declare(strict_types=1);

namespace App\Models;

class AdecuacionOa extends BaseModel
{
    protected string $table = 'adecuaciones_oa';
    protected bool $trackHistory = true;
    protected array $fillable = [
        'paci_id',
        'trayectoria_id',
        'meta_integradora',
        'estrategias',
        'adecuaciones',
        'instrumento_evaluacion',
        'justificacion',
        'criterios_evaluacion',
        'observaciones',
    ];
}
