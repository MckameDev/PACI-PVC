<?php

declare(strict_types=1);

namespace App\Models;

class PaciTrayectoria extends BaseModel
{
    protected string $table        = 'paci_trayectoria';
    protected bool   $trackHistory = true;
    protected array  $fillable     = [
        'paci_id', 'oa_id', 'nivel_trabajo_id', 'diferencia_calculada',
        'tipo_adecuacion', 'justificacion_tecnica', 'eval_modalidad',
        'eval_instrumento', 'eval_criterio'
    ];
}
