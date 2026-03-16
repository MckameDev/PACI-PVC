<?php

declare(strict_types=1);

namespace App\Models;

class ProgresionLectora extends BaseModel
{
    protected string $table    = 'progresion_lectora';
    protected array  $fillable = [
        'nivel', 'core_nivel', 'habilidad_lectora', 'descripcion', 'orden'
    ];
}
