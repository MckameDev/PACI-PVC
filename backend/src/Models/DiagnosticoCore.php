<?php

declare(strict_types=1);

namespace App\Models;

class DiagnosticoCore extends BaseModel
{
    protected string $table    = 'diagnostico_core';
    protected array  $fillable = [
        'estudiante_id', 'curso', 'eje', 'habilidad_observada', 'core_sugerido', 'orden'
    ];
}
