<?php

declare(strict_types=1);

namespace App\Models;

class ActivacionPaci extends BaseModel
{
    protected string $table    = 'activacion_paci';
    protected array  $fillable = [
        'habilidad_detectada', 'eje', 'core_nivel', 'id_oa', 'estrategia', 'adecuacion', 'actividad', 'orden'
    ];
}
